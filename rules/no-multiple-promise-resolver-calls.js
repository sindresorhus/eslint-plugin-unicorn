import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {isFunction, isLoop, isNewExpression} from './ast/index.js';
import {
	isBranchExit,
	hasOptionalChainInCurrentChain,
	isDefinitelyNotThrowingExpression,
	isDefinitelyNotThrowingReference,
	isGlobalIdentifier,
	isProcessExitBranch,
	isProcessExitBlockAtStart,
	isProcessExitCallAlwaysEvaluated,
	isProcessExitExpressionAtStart,
	isTypeScriptExpressionWrapper,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-multiple-promise-resolver-calls';
const messages = {
	[MESSAGE_ID]: 'Promise executor resolver functions may be called multiple times on the same execution path.',
};

const isSupportedExecutor = node => (
	(node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
	&& !node.generator
);

const isTransparentTypeScriptExpressionWrapper = node => isTypeScriptExpressionWrapper(node) || node?.type === 'TSInstantiationExpression';
const isReturnOrThrowStatement = node => node.type === 'ReturnStatement' || node.type === 'ThrowStatement';

function isNonThrowingReturnBranch(node) {
	if (node.type === 'ReturnStatement') {
		return !node.argument;
	}

	return node.type === 'BlockStatement'
		&& node.body.length === 1
		&& isNonThrowingReturnBranch(node.body[0]);
}

function getOutermostTypeScriptExpression(node) {
	while (
		isTransparentTypeScriptExpressionWrapper(node.parent)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
}

function unwrapTypeScriptExpression(node) {
	while (isTransparentTypeScriptExpressionWrapper(node)) {
		node = node.expression;
	}

	return node;
}

const isPromiseExecutor = (node, context) => {
	if (!isSupportedExecutor(node)) {
		return false;
	}

	const executor = getOutermostTypeScriptExpression(node);
	return isNewExpression(executor.parent, {
		name: 'Promise',
		argumentsLength: 1,
	})
	&& executor.parent.arguments[0] === executor
	&& isGlobalIdentifier(executor.parent.callee, context);
};

const isReassigned = variable => variable.references.some(reference => reference.isWrite());

function registerResolverReferences(executor, resolverReferenceExecutors, sourceCode) {
	let registered = false;
	for (const parameter of executor.params.slice(0, 2)) {
		if (parameter.type !== 'Identifier') {
			continue;
		}

		const variable = findVariable(sourceCode.getScope(parameter), parameter);
		if (!variable || isReassigned(variable)) {
			continue;
		}

		for (const reference of variable.references) {
			resolverReferenceExecutors.set(reference.identifier, executor);
			registered = true;
		}
	}

	return registered;
}

const getResolverExecutor = (node, resolverReferenceExecutors) => {
	if (node.type !== 'CallExpression') {
		return;
	}

	const callee = unwrapTypeScriptExpression(node.callee);
	return callee.type === 'Identifier' ? resolverReferenceExecutors.get(callee) : undefined;
};

const isDefinitelyNotThrowingResolverStatement = (node, resolverReferenceExecutors) => {
	if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') {
		return false;
	}

	return node.expression.arguments.length === 0
		&& Boolean(getResolverExecutor(node.expression, resolverReferenceExecutors));
};

function addEvent(state, event) {
	for (const segment of state.currentSegments) {
		if (!segment.reachable || state.terminatedSegments.has(segment)) {
			continue;
		}

		let events = state.eventsBySegment.get(segment);
		if (!events) {
			events = [];
			state.eventsBySegment.set(segment, events);
		}

		events.push(event);
	}
}

function addCatchClause(state, segment, node) {
	if (node.type !== 'CatchClause') {
		return;
	}

	state.catchClausesBySegment.set(segment, node);
}

const isIgnoredLoopEdge = (state, previousSegment, segment) => state.ignoredLoopEdges.some(edge => (
	edge.previousSegment === previousSegment
	&& edge.segment === segment
));

function getReachableSegments(codePath) {
	const segments = [];
	codePath.traverseSegments(segment => {
		if (segment.reachable) {
			segments.push(segment);
		}
	});

	return segments;
}

function cloneFinallyBlocksByCatchClause(finallyBlocksByCatchClause) {
	const clone = new Map();
	for (const [catchClause, finallyBlocks] of finallyBlocksByCatchClause) {
		clone.set(catchClause, new Set(finallyBlocks));
	}

	return clone;
}

// These are may-states, so both booleans can be true after paths merge.
const createResolverState = ({
	isTerminated = false,
	resolverUncalled = false,
	resolverCalled = false,
	catchClausesAfterResolverCall = new Set(),
	pendingFinallyBlocksByCatchClause = new Map(),
} = {}) => ({
	isTerminated,
	resolverUncalled,
	resolverCalled,
	catchClausesAfterResolverCall,
	pendingFinallyBlocksByCatchClause,
});

const cloneResolverState = state => createResolverState({
	isTerminated: state.isTerminated,
	resolverUncalled: state.resolverUncalled,
	resolverCalled: state.resolverCalled,
	catchClausesAfterResolverCall: new Set(state.catchClausesAfterResolverCall),
	pendingFinallyBlocksByCatchClause: cloneFinallyBlocksByCatchClause(state.pendingFinallyBlocksByCatchClause),
});

const getStateAfterEvent = (state, event, executor) => {
	if (state.isTerminated) {
		return state;
	}

	if (event.executor === executor) {
		const nextState = cloneResolverState(state);
		for (const [catchClause, finallyBlocks] of nextState.pendingFinallyBlocksByCatchClause) {
			if (event.finallyBlocks.some(finallyBlock => finallyBlocks.has(finallyBlock))) {
				nextState.catchClausesAfterResolverCall.add(catchClause);
			}
		}

		nextState.resolverCalled = state.resolverUncalled || state.resolverCalled;
		nextState.resolverUncalled = false;
		return nextState;
	}

	if (event.executor) {
		return state;
	}

	const nextState = cloneResolverState(state);
	if (event.catchClause) {
		if (state.resolverUncalled) {
			let finallyBlocks = nextState.pendingFinallyBlocksByCatchClause.get(event.catchClause);
			if (!finallyBlocks) {
				finallyBlocks = new Set();
				nextState.pendingFinallyBlocksByCatchClause.set(event.catchClause, finallyBlocks);
			}

			for (const finallyBlock of event.finallyBlocks) {
				finallyBlocks.add(finallyBlock);
			}
		}

		if (state.resolverCalled) {
			nextState.catchClausesAfterResolverCall.add(event.catchClause);
		}
	}

	return nextState;
};

function getStateAfterEvents(state, events, executor) {
	for (const event of events) {
		state = getStateAfterEvent(state, event, executor);
	}

	return state;
}

function getStateAfterEdge(state, previousSegment, segment, codePathState) {
	if (
		!previousSegment.reachable
		|| codePathState.terminatedSegments.has(previousSegment)
		|| state.isTerminated
		|| isIgnoredLoopEdge(codePathState, previousSegment, segment)
	) {
		return createResolverState({isTerminated: true});
	}

	const catchClause = codePathState.catchClausesBySegment.get(segment);
	if (!catchClause) {
		return state;
	}

	return createResolverState({
		resolverUncalled: state.pendingFinallyBlocksByCatchClause.has(catchClause),
		resolverCalled: state.catchClausesAfterResolverCall.has(catchClause),
	});
}

function areSetsEqual(set, otherSet) {
	if (set.size !== otherSet.size) {
		return false;
	}

	for (const value of set) {
		if (!otherSet.has(value)) {
			return false;
		}
	}

	return true;
}

function areFinallyBlocksByCatchClauseEqual(finallyBlocksByCatchClause, otherFinallyBlocksByCatchClause) {
	if (finallyBlocksByCatchClause.size !== otherFinallyBlocksByCatchClause.size) {
		return false;
	}

	for (const [catchClause, finallyBlocks] of finallyBlocksByCatchClause) {
		const otherFinallyBlocks = otherFinallyBlocksByCatchClause.get(catchClause);
		if (
			!otherFinallyBlocks
			|| !areSetsEqual(finallyBlocks, otherFinallyBlocks)
		) {
			return false;
		}
	}

	return true;
}

const areStatesEqual = (state, otherState) => (
	otherState !== undefined
	&& state.isTerminated === otherState.isTerminated
	&& state.resolverUncalled === otherState.resolverUncalled
	&& state.resolverCalled === otherState.resolverCalled
	&& areSetsEqual(state.catchClausesAfterResolverCall, otherState.catchClausesAfterResolverCall)
	&& areFinallyBlocksByCatchClauseEqual(state.pendingFinallyBlocksByCatchClause, otherState.pendingFinallyBlocksByCatchClause)
);

function mergeResolverState(target, source) {
	if (source.isTerminated) {
		return;
	}

	target.isTerminated = false;
	target.resolverUncalled ||= source.resolverUncalled;
	target.resolverCalled ||= source.resolverCalled;
	for (const catchClause of source.catchClausesAfterResolverCall) {
		target.catchClausesAfterResolverCall.add(catchClause);
	}

	for (const [catchClause, finallyBlocks] of source.pendingFinallyBlocksByCatchClause) {
		let targetFinallyBlocks = target.pendingFinallyBlocksByCatchClause.get(catchClause);
		if (!targetFinallyBlocks) {
			targetFinallyBlocks = new Set();
			target.pendingFinallyBlocksByCatchClause.set(catchClause, targetFinallyBlocks);
		}

		for (const finallyBlock of finallyBlocks) {
			targetFinallyBlocks.add(finallyBlock);
		}
	}
}

function getExceptionPath(node) {
	const finallyBlocks = [];
	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			break;
		}

		if (parent.type === 'TryStatement') {
			if (parent.block === child && parent.handler) {
				return {catchClause: parent.handler, finallyBlocks};
			}

			if (
				parent.finalizer
				&& (parent.block === child || parent.handler === child)
			) {
				finallyBlocks.push(parent.finalizer);
			}
		}

		child = parent;
		({parent} = parent);
	}

	return {catchClause: undefined, finallyBlocks};
}

function getContainingFinallyBlocks(node) {
	const finallyBlocks = [];
	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			break;
		}

		if (parent.type === 'TryStatement' && parent.finalizer === child) {
			finallyBlocks.push(parent.finalizer);
		}

		child = parent;
		({parent} = parent);
	}

	return finallyBlocks;
}

function getStateAtSegmentStart(segment, statesAtSegmentEnd, codePathState) {
	const state = createResolverState({
		isTerminated: segment !== codePathState.codePath.initialSegment,
		resolverUncalled: segment === codePathState.codePath.initialSegment,
	});
	for (const previousSegment of segment.prevSegments) {
		const stateAfterEdge = getStateAfterEdge(statesAtSegmentEnd.get(previousSegment) ?? createResolverState(), previousSegment, segment, codePathState);
		mergeResolverState(state, stateAfterEdge);
	}

	return state;
}

function getStatesAtSegmentEnd(codePathState, executor, segments) {
	const statesAtSegmentEnd = new Map();
	let changed;

	do {
		changed = false;

		for (const segment of segments) {
			const stateAtStart = getStateAtSegmentStart(segment, statesAtSegmentEnd, codePathState);
			const stateAtEnd = getStateAfterEvents(stateAtStart, codePathState.eventsBySegment.get(segment) ?? [], executor);
			if (!areStatesEqual(stateAtEnd, statesAtSegmentEnd.get(segment))) {
				statesAtSegmentEnd.set(segment, stateAtEnd);
				changed = true;
			}
		}
	} while (changed);

	return statesAtSegmentEnd;
}

function reportMultipleResolverCalls(codePathState, context) {
	if (codePathState.executors.size === 0) {
		return;
	}

	const segments = getReachableSegments(codePathState.codePath);
	const reported = new WeakSet();

	for (const executor of codePathState.executors) {
		const statesAtSegmentEnd = getStatesAtSegmentEnd(codePathState, executor, segments);

		for (const segment of segments) {
			let state = getStateAtSegmentStart(segment, statesAtSegmentEnd, codePathState);
			for (const event of codePathState.eventsBySegment.get(segment) ?? []) {
				if (
					event.executor === executor
					&& state.resolverCalled
					&& !reported.has(event.node)
				) {
					reported.add(event.node);
					context.report({
						node: event.node,
						messageId: MESSAGE_ID,
					});
				}

				state = getStateAfterEvent(state, event, executor);
			}
		}
	}
}

const hasFalsyLiteralTest = node => {
	const test = unwrapTypeScriptExpression(node.test);
	return test?.type === 'Literal' && !test.value;
};

const isDirectlyAwaited = node => {
	const expression = getOutermostTypeScriptExpression(node);
	return expression.parent?.type === 'AwaitExpression' && expression.parent.argument === expression;
};

function isInNeverExecutedLoopPart(node) {
	let child = node;
	let {parent} = node;
	while (parent) {
		if (
			hasFalsyLiteralTest(parent)
			&& (
				(parent.type === 'WhileStatement' && parent.body === child)
				|| (parent.type === 'ForStatement' && (parent.body === child || parent.update === child))
			)
		) {
			return true;
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

function isInAlwaysProvidedParameterDefault(node, context) {
	let child = node;
	let {parent} = node;
	while (parent) {
		if (
			parent.type === 'AssignmentPattern'
			&& parent.right === child
			&& isPromiseExecutor(parent.parent, context)
			&& parent.parent.params.slice(0, 2).includes(parent)
		) {
			return true;
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

const isAlwaysEvaluatedCall = (node, child) =>
	node.type === 'CallExpression'
	&& (
		node.callee === child
		|| (
			node.arguments.includes(child)
			&& !node.optional
			&& !hasOptionalChainInCurrentChain(node.callee)
		)
	);

const isAlwaysEvaluatedNewExpression = (node, child) =>
	node.type === 'NewExpression'
	&& (node.callee === child || node.arguments.includes(child));

const isAlwaysEvaluatedMember = (node, child) =>
	node.type === 'MemberExpression'
	&& (
		node.object === child
		|| (
			node.computed
			&& node.property === child
			&& !node.optional
			&& !hasOptionalChainInCurrentChain(node.object)
		)
	);

const isAlwaysEvaluatedExpression = (node, child, context) => (
	(node.type === 'SequenceExpression' && node.expressions.includes(child))
	|| (node.type === 'LogicalExpression' && node.left === child)
	|| (node.type === 'BinaryExpression' && (node.left === child || node.right === child))
	|| (node.type === 'UnaryExpression' && node.argument === child)
	|| (node.type === 'AwaitExpression' && node.argument === child)
	|| (node.type === 'ConditionalExpression' && isBranchExit(node, context, isReturnOrThrowStatement))
	|| (isTransparentTypeScriptExpressionWrapper(node) && node.expression === child)
	|| isAlwaysEvaluatedCall(node, child)
	|| isAlwaysEvaluatedNewExpression(node, child)
	|| isAlwaysEvaluatedMember(node, child)
);

function isInAlwaysExecutedParameterDefault(node, context) {
	let child = node;
	let {parent} = node;
	while (parent) {
		if (parent.type === 'AssignmentPattern') {
			return parent.right === child
				&& isPromiseExecutor(parent.parent, context)
				&& !parent.parent.params.slice(0, 2).includes(parent);
		}

		if (!isAlwaysEvaluatedExpression(parent, child, context)) {
			return false;
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

const isTerminalTryStatement = (node, context) => isProcessExitBranch(node, context);

function getTerminalTryStatement(node, context) {
	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return;
		}

		if (
			parent.type === 'TryStatement'
			&& parent.finalizer
			&& (parent.block === child || parent.handler === child)
			&& isTerminalTryStatement(parent, context)
		) {
			return parent;
		}

		child = parent;
		({parent} = parent);
	}
}

function isInCatchableTryAfterPotentiallyThrowingCode(node, context, resolverReferenceExecutors) {
	let child = node;
	let {parent} = node;
	let hasPotentiallyThrowingCode = false;
	while (parent) {
		if (isFunction(parent)) {
			return false;
		}

		if (
			parent.type === 'IfStatement'
			&& (parent.consequent === child || parent.alternate === child)
		) {
			hasPotentiallyThrowingCode ||= !isDefinitelyNotThrowingReference(parent.test, context);
		} else if (
			(parent.type === 'SequenceExpression' && parent.expressions[0] !== child)
			|| (parent.type === 'LogicalExpression' && parent.right === child)
			|| (parent.type === 'ConditionalExpression' && parent.test !== child)
		) {
			hasPotentiallyThrowingCode ||= !isProcessExitExpressionAtStart(parent, context);
		}

		if (parent.type === 'TryStatement' && parent.handler && parent.block === child) {
			return hasPotentiallyThrowingCode
				|| !isProcessExitBlockAtStart(
					parent.block,
					context,
					true,
					{
						isAdditionalStatementDefinitelyNotThrowing: statement => isDefinitelyNotThrowingResolverStatement(statement, resolverReferenceExecutors),
					},
				);
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

const isSynchronousCodePath = (codePath, node) => (
	codePath.origin === 'class-static-block'
	|| (
		codePath.origin === 'class-field-initializer'
		&& node.parent?.type === 'PropertyDefinition'
		&& node.parent.value === node
		&& node.parent.static
	)
);

function isContinueAcrossFinally(node) {
	if (node.type !== 'ContinueStatement') {
		return false;
	}

	const labelName = node.label?.name;
	let crossesFinally = false;
	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return false;
		}

		if (
			parent.type === 'TryStatement'
			&& parent.finalizer
			&& (parent.block === child || parent.handler === child)
		) {
			crossesFinally = true;
		}

		if (
			(labelName && parent.type === 'LabeledStatement' && parent.label.name === labelName)
			|| (!labelName && isLoop(parent))
		) {
			return crossesFinally;
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const resolverReferenceExecutors = new WeakMap();
	let currentCodePathState;

	const startSegment = (segment, node) => {
		currentCodePathState.currentSegments.add(segment);
		if (
			currentCodePathState.terminatedFinallyBlocks.has(node)
			|| (
				segment.prevSegments.length > 0
				&& segment.prevSegments.every(previousSegment =>
					!previousSegment.reachable || currentCodePathState.terminatedSegments.has(previousSegment),
				)
			)
		) {
			currentCodePathState.terminatedSegments.add(segment);
		}

		addCatchClause(currentCodePathState, segment, node);
	};

	const endSegment = segment => {
		currentCodePathState.currentSegments.delete(segment);
	};

	context.on('onCodePathStart', (codePath, node) => {
		const upper = currentCodePathState;
		const isTerminatedSynchronousChild = upper
			&& isSynchronousCodePath(codePath, node)
			&& upper.currentSegments.size > 0
			&& [...upper.currentSegments].every(segment => upper.terminatedSegments.has(segment));
		currentCodePathState = {
			upper,
			codePath,
			node,
			currentSegments: new Set(),
			eventsBySegment: new Map(),
			executors: new Set(),
			catchClausesBySegment: new Map(),
			ignoredLoopEdges: [],
			terminatedSegments: new WeakSet(),
			terminatedFinallyBlocks: new WeakSet(),
			hasResolverReferences: upper?.hasResolverReferences ?? false,
		};

		if (isTerminatedSynchronousChild) {
			currentCodePathState.terminatedSegments.add(codePath.initialSegment);
		}

		if (
			isPromiseExecutor(node, context)
			&& registerResolverReferences(node, resolverReferenceExecutors, sourceCode)
		) {
			currentCodePathState.hasResolverReferences = true;
		}
	});

	context.on('onCodePathEnd', () => {
		const codePathState = currentCodePathState;
		const lastStatement = codePathState.node.type === 'StaticBlock'
			? codePathState.node.body.at(-1)
			: codePathState.node;
		const isProcessExitAtStart = codePathState.node.type === 'StaticBlock'
			? isProcessExitBlockAtStart(codePathState.node, context)
			: isProcessExitExpressionAtStart(codePathState.node, context);
		const isCaughtProcessExitSynchronousCodePath = isSynchronousCodePath(codePathState.codePath, codePathState.node)
			&& getExceptionPath(codePathState.node).catchClause
			&& lastStatement
			&& isProcessExitBranch(lastStatement, context)
			&& isBranchExit(lastStatement, context, isReturnOrThrowStatement)
			&& !isProcessExitAtStart;
		const isAlwaysExitingSynchronousCodePath = lastStatement && (
			(
				isBranchExit(lastStatement, context, isReturnOrThrowStatement)
				&& !isCaughtProcessExitSynchronousCodePath
			)
			|| (lastStatement.type === 'TryStatement' && isTerminalTryStatement(lastStatement, context))
			|| (
				codePathState.node.type === 'StaticBlock'
				&& !isCaughtProcessExitSynchronousCodePath
				&& isProcessExitAtStart
			)
		);
		reportMultipleResolverCalls(codePathState, context);

		if (
			codePathState.upper
			&& isSynchronousCodePath(codePathState.codePath, codePathState.node)
			&& (
				getReachableSegments(codePathState.codePath).every(segment => codePathState.terminatedSegments.has(segment))
				|| isAlwaysExitingSynchronousCodePath
			)
		) {
			for (const segment of codePathState.upper.currentSegments) {
				codePathState.upper.terminatedSegments.add(segment);
			}
		}

		currentCodePathState = codePathState.upper;
	});

	context.onExit('IfStatement', node => {
		const staticValue = getStaticValue(node.test, sourceCode.getScope(node.test));
		let selectedBranch;
		if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
			selectedBranch = staticValue.value ? node.consequent : node.alternate;
		}

		if (!selectedBranch || !isNonThrowingReturnBranch(selectedBranch)) {
			return;
		}

		for (const segment of currentCodePathState.currentSegments) {
			if (segment.reachable) {
				currentCodePathState.terminatedSegments.add(segment);
			}
		}
	});

	context.on('onCodePathSegmentStart', startSegment);
	context.on('onUnreachableCodePathSegmentStart', startSegment);
	context.on('onCodePathSegmentEnd', endSegment);
	context.on('onUnreachableCodePathSegmentEnd', endSegment);
	context.on('onCodePathSegmentLoop', (previousSegment, segment, node) => {
		if (
			!hasFalsyLiteralTest(node)
			&& !isContinueAcrossFinally(node)
		) {
			return;
		}

		currentCodePathState.ignoredLoopEdges.push({previousSegment, segment});
	});

	context.onExit([
		'Identifier',
		'CallExpression',
		'ImportExpression',
		'MemberExpression',
		'NewExpression',
		'ThrowStatement',
		'YieldExpression',
	], node => {
		if (isProcessExitCallAlwaysEvaluated(node, context)) {
			if (
				!isInAlwaysProvidedParameterDefault(node, context)
				&& !isInCatchableTryAfterPotentiallyThrowingCode(node, context, resolverReferenceExecutors)
			) {
				const terminalTryStatement = getTerminalTryStatement(node, context);
				if (terminalTryStatement) {
					currentCodePathState.terminatedFinallyBlocks.add(terminalTryStatement.finalizer);
				}

				if (isInAlwaysExecutedParameterDefault(node, context)) {
					currentCodePathState.terminatedSegments.add(currentCodePathState.codePath.initialSegment);
				}

				for (const segment of currentCodePathState.currentSegments) {
					currentCodePathState.terminatedSegments.add(segment);
				}
			}

			return;
		}

		if (!currentCodePathState.hasResolverReferences) {
			return;
		}

		if (
			node.type === 'Identifier'
			&& (
				resolverReferenceExecutors.has(node)
				|| !isDirectlyAwaited(node)
			)
		) {
			return;
		}

		if (node.type === 'ImportExpression' && !isDirectlyAwaited(node)) {
			return;
		}

		const executor = getResolverExecutor(node, resolverReferenceExecutors);
		// Promise resolver functions do not throw. Events from their arguments are recorded separately before the call.
		const {catchClause, finallyBlocks} = executor ? {catchClause: undefined, finallyBlocks: getContainingFinallyBlocks(node)} : getExceptionPath(node);
		if (!executor && !catchClause) {
			return;
		}

		if (
			isInNeverExecutedLoopPart(node)
			|| (executor && isInAlwaysProvidedParameterDefault(node, context))
		) {
			return;
		}

		addEvent(currentCodePathState, {
			catchClause,
			finallyBlocks,
			node,
			executor,
		});

		if (executor) {
			currentCodePathState.executors.add(executor);
		}
	});

	context.onExit([
		'ArrayExpression',
		'AssignmentExpression',
		'ConditionalExpression',
		'ImportExpression',
		'LogicalExpression',
		'ObjectExpression',
		'SequenceExpression',
		'TemplateLiteral',
		'YieldExpression',
	], node => {
		if (!isProcessExitExpressionAtStart(node, context)) {
			return;
		}

		for (const segment of currentCodePathState.currentSegments) {
			if (segment.reachable) {
				currentCodePathState.terminatedSegments.add(segment);
			}
		}
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow calling Promise executor resolver functions more than once on the same execution path.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
