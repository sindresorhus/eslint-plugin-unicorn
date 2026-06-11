import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallOrNewExpression,
	isFunction,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';

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

const getAllowedProperties = constructorName =>
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

const typeScriptWrapperTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
]);

const unwrapExpression = node => {
	while (typeScriptWrapperTypes.has(node?.type)) {
		node = node.expression;
	}

	return node;
};

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

const setKnownErrorVariable = (knownErrorVariableFrames, variable, constructorName) => {
	for (const {knownErrorVariables} of knownErrorVariableFrames.toReversed()) {
		if (knownErrorVariables.has(variable)) {
			knownErrorVariables.set(variable, constructorName);
			return;
		}
	}

	const frameNode = getVariableFrameNode(variable);
	const frame = knownErrorVariableFrames.toReversed().find(frame => frame.node === frameNode);

	(frame ?? knownErrorVariableFrames.at(-1)).knownErrorVariables.set(variable, constructorName);
};

const setKnownErrorVariableFromAssignment = (knownErrorVariableFrames, variable, constructorName) => {
	let crossesFunctionBoundary = false;

	for (const frame of knownErrorVariableFrames.toReversed()) {
		if (frame.knownErrorVariables.has(variable)) {
			if (constructorName && frame !== knownErrorVariableFrames.at(-1)) {
				knownErrorVariableFrames.at(-1).knownErrorVariables.set(variable, constructorName);
				return;
			}

			const targetFrame = crossesFunctionBoundary
				? knownErrorVariableFrames.at(-1)
				: frame;

			targetFrame.knownErrorVariables.set(variable, constructorName);
			return;
		}

		if (frame.isFunctionBoundary) {
			crossesFunctionBoundary = true;
		}
	}

	knownErrorVariableFrames.at(-1).knownErrorVariables.set(variable, constructorName);
};

const isFrameNode = node =>
	node.type === 'Program'
	|| node.type === 'BlockStatement'
	|| node.type === 'StaticBlock'
	|| node.type === 'SwitchCase';

const isDirectChildOfCurrentFrame = node => {
	const {parent} = node;

	if (isFrameNode(parent)) {
		return true;
	}

	return (
		parent.type === 'VariableDeclaration'
		&& isFrameNode(parent.parent)
	);
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

function * checkObjectAssign(callExpression, context, knownErrorVariables) {
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

	const allowedProperties = getAllowedProperties(constructorName);

	for (const source of sources) {
		if (source.type !== 'ObjectExpression') {
			continue;
		}

		for (const property of source.properties) {
			if (property.type !== 'Property') {
				continue;
			}

			const propertyName = getStaticPropertyNameFromProperty(property);
			if (allowedProperties.has(propertyName)) {
				yield getPropertyProblem(property.key, propertyName);
			}
		}
	}
}

const checkDirectAssignment = (assignmentExpression, context, knownErrorVariables) => {
	if (!isMemberExpression(assignmentExpression.left, {optional: false})) {
		return;
	}

	const {left: memberExpression} = assignmentExpression;
	const constructorName = getKnownErrorConstructorName(memberExpression.object, context, knownErrorVariables);
	if (!constructorName) {
		return;
	}

	const propertyName = getStaticPropertyName(memberExpression);
	if (getAllowedProperties(constructorName).has(propertyName)) {
		return getPropertyProblem(memberExpression.property, propertyName);
	}
};

const updateKnownErrorVariable = (assignmentExpression, context, knownErrorVariables) => {
	if (!(
		assignmentExpression.parent.type === 'ExpressionStatement'
		&& isDirectChildOfCurrentFrame(assignmentExpression.parent)
	)) {
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

	const constructorName = assignmentExpression.operator === '='
		? getErrorConstructorName(assignmentExpression.right, context)
		: undefined;

	if (constructorName) {
		setKnownErrorVariableFromAssignment(knownErrorVariables, variable, constructorName);
	} else {
		setKnownErrorVariableFromAssignment(knownErrorVariables, variable, undefined);
	}
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
		setKnownErrorVariable(knownErrorVariables, variable, constructorName ?? undefined);
	});

	context.on('AssignmentExpression', node => {
		const problem = checkDirectAssignment(node, context, knownErrorVariables);
		updateKnownErrorVariable(node, context, knownErrorVariables);

		return problem;
	});

	context.on('CallExpression', node => checkObjectAssign(node, context, knownErrorVariables));
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
