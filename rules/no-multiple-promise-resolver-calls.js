import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction, isNewExpression} from './ast/index.js';
import {isGlobalIdentifier, isTypeScriptExpressionWrapper} from './utils/index.js';

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

function addEvent(state, event) {
	for (const segment of state.currentSegments) {
		if (!segment.reachable) {
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
const createResolverState = ({resolverUncalled = false, resolverCalled = false, catchClausesAfterResolverCall = new Set(), pendingFinallyBlocksByCatchClause = new Map()} = {}) => ({
	resolverUncalled,
	resolverCalled,
	catchClausesAfterResolverCall,
	pendingFinallyBlocksByCatchClause,
});

const cloneResolverState = state => createResolverState({
	resolverUncalled: state.resolverUncalled,
	resolverCalled: state.resolverCalled,
	catchClausesAfterResolverCall: new Set(state.catchClausesAfterResolverCall),
	pendingFinallyBlocksByCatchClause: cloneFinallyBlocksByCatchClause(state.pendingFinallyBlocksByCatchClause),
});

const getStateAfterEvent = (state, event, executor) => {
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
		|| isIgnoredLoopEdge(codePathState, previousSegment, segment)
	) {
		return createResolverState();
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
	&& state.resolverUncalled === otherState.resolverUncalled
	&& state.resolverCalled === otherState.resolverCalled
	&& areSetsEqual(state.catchClausesAfterResolverCall, otherState.catchClausesAfterResolverCall)
	&& areFinallyBlocksByCatchClauseEqual(state.pendingFinallyBlocksByCatchClause, otherState.pendingFinallyBlocksByCatchClause)
);

function mergeResolverState(target, source) {
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
	const state = createResolverState({resolverUncalled: segment === codePathState.codePath.initialSegment});
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

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const resolverReferenceExecutors = new WeakMap();
	let hasResolverReferences = false;
	let currentCodePathState;

	const startSegment = (segment, node) => {
		currentCodePathState.currentSegments.add(segment);
		addCatchClause(currentCodePathState, segment, node);
	};

	const endSegment = segment => {
		currentCodePathState.currentSegments.delete(segment);
	};

	context.on('onCodePathStart', (codePath, node) => {
		currentCodePathState = {
			upper: currentCodePathState,
			codePath,
			currentSegments: new Set(),
			eventsBySegment: new Map(),
			executors: new Set(),
			catchClausesBySegment: new Map(),
			ignoredLoopEdges: [],
		};

		if (
			isPromiseExecutor(node, context)
			&& registerResolverReferences(node, resolverReferenceExecutors, sourceCode)
		) {
			hasResolverReferences = true;
		}
	});

	context.on('onCodePathEnd', () => {
		reportMultipleResolverCalls(currentCodePathState, context);
		currentCodePathState = currentCodePathState.upper;
	});

	context.on('onCodePathSegmentStart', startSegment);
	context.on('onUnreachableCodePathSegmentStart', startSegment);
	context.on('onCodePathSegmentEnd', endSegment);
	context.on('onUnreachableCodePathSegmentEnd', endSegment);
	context.on('onCodePathSegmentLoop', (previousSegment, segment, node) => {
		if (!hasFalsyLiteralTest(node)) {
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
		if (!hasResolverReferences) {
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
