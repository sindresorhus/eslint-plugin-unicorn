import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction} from './ast/index.js';

const MESSAGE_ID = 'no-invalid-argument-count';
const messages = {
	[MESSAGE_ID]: 'Expected {{expected}}, but got {{actual}}.',
};

const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSInstantiationExpression',
]);

const formatArgumentCount = count => `${count} ${count === 1 ? 'argument' : 'arguments'}`;

const unwrapExpression = node => {
	while (typeScriptExpressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const isThisParameter = parameter =>
	parameter?.type === 'Identifier'
	&& parameter.name === 'this';

const isOptionalParameter = parameter =>
	parameter.type === 'AssignmentPattern'
	|| parameter.type === 'RestElement'
	|| parameter.optional === true;

const getArity = functionNode => {
	const parameters = isThisParameter(functionNode.params[0])
		? functionNode.params.slice(1)
		: functionNode.params;
	let minimum = parameters.length;
	let hasRest = false;

	for (const parameter of parameters.toReversed()) {
		if (parameter.type === 'RestElement') {
			hasRest = true;
		}

		if (!isOptionalParameter(parameter)) {
			break;
		}

		minimum--;
	}

	return {
		minimum,
		maximum: hasRest ? Infinity : parameters.length,
	};
};

const hasWriteReference = variable => variable.references.some(reference =>
	!reference.init
	&& reference.isWrite());

const getFunctionNodeFromVariable = variable => {
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;

	if (definition.type === 'FunctionName') {
		if (hasWriteReference(variable)) {
			return;
		}

		return definition.node.body ? definition.node : undefined;
	}

	if (definition.type !== 'Variable') {
		return;
	}

	const {node} = definition;
	const init = node.init && unwrapExpression(node.init);
	if (
		node.parent.kind !== 'const'
		|| !init
		|| !isFunction(init)
	) {
		return;
	}

	return init;
};

const getFunctionNode = (callExpression, sourceCode) => {
	const callee = unwrapExpression(callExpression.callee);

	if (isFunction(callee)) {
		return callee;
	}

	if (callee.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(sourceCode.getScope(callee), callee);
	return getFunctionNodeFromVariable(variable);
};

const getExpectedText = ({minimum, maximum}, argumentCount) => {
	if (argumentCount < minimum) {
		return minimum === maximum
			? formatArgumentCount(minimum)
			: `at least ${formatArgumentCount(minimum)}`;
	}

	return minimum === maximum
		? formatArgumentCount(maximum)
		: `at most ${formatArgumentCount(maximum)}`;
};

const hasInvalidArgumentCount = ({minimum, maximum}, argumentCount) =>
	argumentCount < minimum || argumentCount > maximum;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', callExpression => {
		if (callExpression.arguments.some(argument => argument.type === 'SpreadElement')) {
			return;
		}

		const functionNode = getFunctionNode(callExpression, sourceCode);
		if (!functionNode) {
			return;
		}

		const arity = getArity(functionNode);
		const argumentCount = callExpression.arguments.length;

		if (!hasInvalidArgumentCount(arity, argumentCount)) {
			return;
		}

		return {
			node: callExpression.callee,
			messageId: MESSAGE_ID,
			data: {
				expected: getExpectedText(arity, argumentCount),
				actual: formatArgumentCount(argumentCount),
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow calling functions with an invalid number of arguments.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
