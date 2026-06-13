import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallOrNewExpression,
	isFunction,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';
import {unwrapTypeScriptExpression as unwrapExpression} from './utils/index.js';

const MESSAGE_ID = 'no-error-property-assignment';
const messages = {
	[MESSAGE_ID]: 'Do not assign to `{{property}}` on a built-in error.',
};

const errorProperties = new Set([
	'name',
	'stack',
	'cause',
]);

const aggregateErrorProperties = new Set([
	...errorProperties,
	'errors',
]);

const getDisallowedProperties = constructorName =>
	constructorName === 'AggregateError'
		? aggregateErrorProperties
		: errorProperties;

const getStaticPropertyName = memberExpression => {
	const {property} = memberExpression;

	if (!memberExpression.computed && property.type === 'Identifier') {
		return property.name;
	}

	if (
		memberExpression.computed
		&& property.type === 'Literal'
		&& typeof property.value === 'string'
	) {
		return property.value;
	}
};

const getStaticPropertyNameFromProperty = property => {
	const {key} = property;

	if (!property.computed && key.type === 'Identifier') {
		return key.name;
	}

	if (
		key.type === 'Literal'
		&& typeof key.value === 'string'
	) {
		return key.value;
	}
};

const getVariable = (node, context) =>
	findVariable(context.sourceCode.getScope(node), node);

// Keep TypeScript support syntactic: unwrap assertions and `satisfies` so `new Error() as Error` is recognized, but do not use parser services.
// A type named `Error` can describe subclasses or values returned from elsewhere, so type-aware matching would exceed the rule's known built-in-instance boundary and make results config-dependent.
const getKnownErrorConstructorNameFromFrames = (variable, knownErrorVariableFrames) => {
	for (const {knownErrorVariables} of knownErrorVariableFrames.toReversed()) {
		if (knownErrorVariables.has(variable)) {
			return knownErrorVariables.get(variable);
		}
	}
};

const getVariableFrameNode = variable => {
	const {scope} = variable;

	if (scope.block.type === 'Program') {
		return scope.block;
	}

	if (
		scope.type === 'function'
		&& scope.block.body?.type === 'BlockStatement'
	) {
		return scope.block.body;
	}

	return scope.block;
};

const setKnownErrorVariableFromDeclaration = (knownErrorVariableFrames, variable, constructorName) => {
	if (updateExistingKnownErrorVariable(knownErrorVariableFrames, variable, constructorName)) {
		return;
	}

	const frameNode = getVariableFrameNode(variable);
	const frame = knownErrorVariableFrames.findLast(frame => frame.node === frameNode);
	const currentFrame = knownErrorVariableFrames.at(-1);
	const targetFrame = frame ?? currentFrame;

	if (
		targetFrame !== currentFrame
		&& !canPropagateToFrame(knownErrorVariableFrames, targetFrame)
	) {
		getLocalUpdateFrame(knownErrorVariableFrames).knownErrorVariables.set(variable, constructorName);
		return;
	}

	targetFrame.knownErrorVariables.set(variable, constructorName);
};

const transparentBlockParentTypes = new Set([
	'BlockStatement',
	'Program',
	'StaticBlock',
	'SwitchCase',
]);

const isTransparentFrame = frame =>
	frame.node.type === 'BlockStatement'
	&& transparentBlockParentTypes.has(frame.node.parent.type)
	&& !frame.isFunctionBoundary;

const canPropagateToFrame = (knownErrorVariableFrames, targetFrame) => {
	for (const frame of knownErrorVariableFrames.toReversed()) {
		if (frame === targetFrame) {
			return true;
		}

		if (!isTransparentFrame(frame)) {
			return false;
		}
	}

	return false;
};

const getLocalUpdateFrame = knownErrorVariableFrames =>
	knownErrorVariableFrames.findLast(frame => !isTransparentFrame(frame))
	?? knownErrorVariableFrames.at(-1);

const updateExistingKnownErrorVariable = (knownErrorVariableFrames, variable, constructorName) => {
	let crossesFunctionBoundary = false;

	for (const frame of knownErrorVariableFrames.toReversed()) {
		if (frame.knownErrorVariables.has(variable)) {
			if (canPropagateToFrame(knownErrorVariableFrames, frame)) {
				frame.knownErrorVariables.set(variable, constructorName);
				return true;
			}

			if (!crossesFunctionBoundary) {
				frame.knownErrorVariables.set(variable, undefined);
			}

			getLocalUpdateFrame(knownErrorVariableFrames).knownErrorVariables.set(variable, constructorName);
			return true;
		}

		if (frame.isFunctionBoundary) {
			crossesFunctionBoundary = true;
		}
	}

	return false;
};

const setKnownErrorVariableFromAssignment = (knownErrorVariableFrames, variable, constructorName) => {
	if (updateExistingKnownErrorVariable(knownErrorVariableFrames, variable, constructorName)) {
		return;
	}

	const frameNode = getVariableFrameNode(variable);
	const frame = knownErrorVariableFrames.findLast(frame => frame.node === frameNode);

	if (
		frame
		&& canPropagateToFrame(knownErrorVariableFrames, frame)
	) {
		frame.knownErrorVariables.set(variable, constructorName);
		return;
	}

	getLocalUpdateFrame(knownErrorVariableFrames).knownErrorVariables.set(variable, constructorName);
};

const frameNodeTypes = new Set([
	'Program',
	'BlockStatement',
	'StaticBlock',
	'SwitchCase',
]);

const isFrameNode = node => frameNodeTypes.has(node.type);

const isDirectChildOfCurrentFrame = node => {
	const {parent} = node;

	if (isFrameNode(parent)) {
		return true;
	}

	return (
		parent.type === 'VariableDeclaration'
		&& (
			isFrameNode(parent.parent)
			|| (parent.parent.type === 'ForStatement' && parent.parent.init === parent)
		)
	);
};

const bracelessBodyParentTypes = new Set([
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'WhileStatement',
]);

const getAssignmentTrackingMode = assignmentExpression => {
	const {parent} = assignmentExpression;

	if (parent.type === 'ForStatement' && parent.init === assignmentExpression) {
		return 'normal';
	}

	if (parent.type !== 'ExpressionStatement') {
		return;
	}

	if (isDirectChildOfCurrentFrame(parent)) {
		return 'normal';
	}

	const statement = parent.parent;
	if (
		statement.type === 'IfStatement'
		&& (statement.consequent === parent || statement.alternate === parent)
	) {
		return 'conditional';
	}

	if (
		bracelessBodyParentTypes.has(statement.type)
		&& statement.body === parent
	) {
		return 'conditional';
	}
};

const getErrorConstructorName = (node, context) => {
	node = unwrapExpression(node);

	if (!(
		isCallOrNewExpression(node, {
			names: builtinErrors,
			optional: false,
		})
		&& context.sourceCode.isGlobalReference(node.callee)
	)) {
		return;
	}

	return node.callee.name;
};

const getKnownErrorConstructorName = (node, context, knownErrorVariables) => {
	node = unwrapExpression(node);

	const constructorName = getErrorConstructorName(node, context);
	if (constructorName) {
		return constructorName;
	}

	if (node.type !== 'Identifier') {
		return;
	}

	return getKnownErrorConstructorNameFromFrames(
		getVariable(node, context),
		knownErrorVariables,
	);
};

const getPropertyProblem = (node, property) => ({
	node,
	messageId: MESSAGE_ID,
	data: {property},
});

function * getObjectAssignProblems(callExpression, context, knownErrorVariables) {
	if (!(
		isMethodCall(callExpression, {
			object: 'Object',
			method: 'assign',
			minimumArguments: 2,
			optionalMember: false,
			optionalCall: false,
		})
		&& context.sourceCode.isGlobalReference(callExpression.callee.object)
	)) {
		return;
	}

	const [target, ...sources] = callExpression.arguments;
	const constructorName = getKnownErrorConstructorName(target, context, knownErrorVariables);
	if (!constructorName) {
		return;
	}

	const disallowedProperties = getDisallowedProperties(constructorName);

	for (const source of sources) {
		if (source.type !== 'ObjectExpression') {
			continue;
		}

		for (const property of source.properties) {
			if (property.type !== 'Property') {
				continue;
			}

			const propertyName = getStaticPropertyNameFromProperty(property);
			if (disallowedProperties.has(propertyName)) {
				yield getPropertyProblem(property.key, propertyName);
			}
		}
	}
}

const getDirectAssignmentProblem = (assignmentExpression, context, knownErrorVariables) => {
	if (!isMemberExpression(assignmentExpression.left, {optional: false})) {
		return;
	}

	const {left: memberExpression} = assignmentExpression;
	const constructorName = getKnownErrorConstructorName(memberExpression.object, context, knownErrorVariables);
	if (!constructorName) {
		return;
	}

	const propertyName = getStaticPropertyName(memberExpression);
	if (getDisallowedProperties(constructorName).has(propertyName)) {
		return getPropertyProblem(memberExpression.property, propertyName);
	}
};

const updateKnownErrorVariable = (assignmentExpression, context, knownErrorVariables) => {
	const trackingMode = getAssignmentTrackingMode(assignmentExpression);
	if (!trackingMode) {
		return;
	}

	const {left} = assignmentExpression;
	if (left.type !== 'Identifier') {
		return;
	}

	const variable = getVariable(left, context);
	if (!variable) {
		return;
	}

	const constructorName = trackingMode === 'normal' && assignmentExpression.operator === '='
		? getErrorConstructorName(assignmentExpression.right, context)
		: undefined;

	setKnownErrorVariableFromAssignment(knownErrorVariables, variable, constructorName);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const knownErrorVariables = [{
		node: context.sourceCode.ast,
		knownErrorVariables: new Map(),
		isFunctionBoundary: false,
	}];

	context.on(['BlockStatement', 'StaticBlock', 'SwitchCase'], node => {
		knownErrorVariables.push({
			node,
			knownErrorVariables: new Map(),
			isFunctionBoundary: node.type === 'BlockStatement' && isFunction(node.parent),
		});
	});

	context.onExit(['BlockStatement', 'StaticBlock', 'SwitchCase'], () => {
		knownErrorVariables.pop();
	});

	context.on('VariableDeclarator', node => {
		if (
			node.id.type !== 'Identifier'
			|| !isDirectChildOfCurrentFrame(node)
		) {
			return;
		}

		const constructorName = getErrorConstructorName(node.init, context);
		if (
			!constructorName
			&& !node.init
		) {
			return;
		}

		const [variable] = context.sourceCode.getDeclaredVariables(node);
		setKnownErrorVariableFromDeclaration(knownErrorVariables, variable, constructorName ?? undefined);
	});

	context.on('AssignmentExpression', node => {
		const problem = getDirectAssignmentProblem(node, context, knownErrorVariables);
		updateKnownErrorVariable(node, context, knownErrorVariables);

		return problem;
	});

	context.on('CallExpression', node => getObjectAssignProblems(node, context, knownErrorVariables));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow assigning to built-in error properties.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
