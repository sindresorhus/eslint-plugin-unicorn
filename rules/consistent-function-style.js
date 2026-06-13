import {findVariable} from '@eslint-community/eslint-utils';
import {getParenthesizedText, hasUnsafeArrowConversionReference} from './utils/index.js';

const MESSAGE_ID = 'consistent-function-style';
const MESSAGE_ID_SUGGESTION = 'consistent-function-style/suggestion';

const STYLE_DECLARATION = 'declaration';
const STYLE_FUNCTION_EXPRESSION = 'function-expression';
const STYLE_ARROW_FUNCTION = 'arrow-function';
const STYLE_METHOD = 'method';
const STYLE_IGNORE = 'ignore';

const roleStyles = new Map([
	['default', [
		STYLE_DECLARATION,
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['namedFunctions', [
		STYLE_DECLARATION,
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['namedExports', [
		STYLE_DECLARATION,
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['callbacks', [
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['objectProperties', [
		STYLE_METHOD,
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['reassignedVariables', [
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
	['typedVariables', [
		STYLE_FUNCTION_EXPRESSION,
		STYLE_ARROW_FUNCTION,
		STYLE_IGNORE,
	]],
]);

const roleNames = new Map([
	['default', 'function'],
	['namedFunctions', 'named function'],
	['namedExports', 'named export'],
	['callbacks', 'callback'],
	['objectProperties', 'object property'],
	['reassignedVariables', 'reassigned variable'],
	['typedVariables', 'typed variable'],
]);

const styleNames = new Map([
	[STYLE_DECLARATION, 'a function declaration'],
	[STYLE_FUNCTION_EXPRESSION, 'a function expression'],
	[STYLE_ARROW_FUNCTION, 'an arrow function'],
	[STYLE_METHOD, 'a method'],
]);

const defaultOptions = {
	default: STYLE_IGNORE,
	namedFunctions: STYLE_IGNORE,
	namedExports: STYLE_IGNORE,
	callbacks: STYLE_IGNORE,
	objectProperties: STYLE_IGNORE,
	reassignedVariables: STYLE_IGNORE,
	typedVariables: STYLE_IGNORE,
};

const messages = {
	[MESSAGE_ID]: 'Expected {{expected}} for this {{role}}, but found {{actual}}.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with {{expected}}.',
};

const createRoleSchema = role => ({
	enum: roleStyles.get(role),
});

const isVariableFunction = node =>
	node.parent.type === 'VariableDeclarator'
	&& node.parent.init === node
	&& node.parent.id.type === 'Identifier';

const isNamedExport = node => {
	if (node.parent.type === 'ExportNamedDeclaration') {
		return true;
	}

	return isVariableFunction(node)
		&& node.parent.parent.type === 'VariableDeclaration'
		&& node.parent.parent.parent.type === 'ExportNamedDeclaration';
};

const isCallback = node =>
	(
		node.parent.type === 'CallExpression'
		|| node.parent.type === 'NewExpression'
	)
	&& node.parent.arguments.includes(node);

const isObjectProperty = node =>
	node.parent.type === 'Property'
	&& node.parent.value === node
	&& node.parent.kind === 'init';

const isAccessorProperty = node =>
	node.parent.type === 'Property'
	&& node.parent.value === node
	&& node.parent.kind !== 'init';

const classElementValueParentTypes = new Set([
	'AccessorProperty',
	'MethodDefinition',
	'PropertyDefinition',
]);

const isClassElementValue = node =>
	classElementValueParentTypes.has(node.parent.type);

const isIife = node =>
	(
		node.parent.type === 'CallExpression'
		|| node.parent.type === 'NewExpression'
	)
	&& node.parent.callee === node;

const hasThisParameter = node =>
	node.params.some(parameter => parameter.type === 'Identifier' && parameter.name === 'this');

const isTypedVariable = node =>
	isVariableFunction(node)
	&& Boolean(node.parent.id.typeAnnotation);

const isReassignedVariable = (node, sourceCode) => {
	if (!isVariableFunction(node)) {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(node.parent.id), node.parent.id);

	return variable?.references.some(reference =>
		!reference.init
		&& reference.isWrite()) ?? false;
};

const getActualStyle = node => {
	if (node.type === 'FunctionDeclaration') {
		return STYLE_DECLARATION;
	}

	if (node.type === 'ArrowFunctionExpression') {
		return STYLE_ARROW_FUNCTION;
	}

	return node.parent.type === 'Property' && node.parent.method
		? STYLE_METHOD
		: STYLE_FUNCTION_EXPRESSION;
};

const getParametersText = (node, sourceCode) =>
	node.params.map(parameter => sourceCode.getText(parameter)).join(', ');

const getReturnTypeText = (node, sourceCode) =>
	node.returnType
		? sourceCode.getText(node.returnType)
		: '';

const getFunctionExpressionBodyText = (node, context) =>
	node.body.type === 'BlockStatement'
		? context.sourceCode.getText(node.body)
		: `{ return ${getParenthesizedText(node.body, context)}; }`;

const getCallbackReplacement = (node, expectedStyle, context) => {
	const {sourceCode} = context;
	const parametersText = getParametersText(node, sourceCode);
	const returnTypeText = getReturnTypeText(node, sourceCode);

	if (expectedStyle === STYLE_ARROW_FUNCTION) {
		return `${node.async ? 'async ' : ''}(${parametersText})${returnTypeText} => ${sourceCode.getText(node.body)}`;
	}

	return `${node.async ? 'async ' : ''}function (${parametersText})${returnTypeText} ${getFunctionExpressionBodyText(node, context)}`;
};

const getSuggestion = ({
	node,
	role,
	actualStyle,
	expectedStyle,
	context,
}) => {
	const {sourceCode} = context;

	if (
		role !== 'callbacks'
		|| node.parent.type !== 'CallExpression'
		|| !(
			(actualStyle === STYLE_FUNCTION_EXPRESSION && expectedStyle === STYLE_ARROW_FUNCTION)
			|| (actualStyle === STYLE_ARROW_FUNCTION && expectedStyle === STYLE_FUNCTION_EXPRESSION)
		)
		|| node.id
		|| node.generator
		|| node.typeParameters
		|| hasThisParameter(node)
		|| sourceCode.getCommentsInside(node).length > 0
		|| node.params.some(parameter => hasUnsafeArrowConversionReference(parameter, sourceCode.visitorKeys))
		|| hasUnsafeArrowConversionReference(node.body, sourceCode.visitorKeys)
	) {
		return;
	}

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			data: {
				expected: styleNames.get(expectedStyle),
			},
			fix: fixer => fixer.replaceText(node, getCallbackReplacement(node, expectedStyle, context)),
		},
	];
};

const getRole = (node, sourceCode) => {
	if (isTypedVariable(node)) {
		return 'typedVariables';
	}

	if (isReassignedVariable(node, sourceCode)) {
		return 'reassignedVariables';
	}

	if (isNamedExport(node)) {
		return 'namedExports';
	}

	if (isCallback(node)) {
		return 'callbacks';
	}

	if (isObjectProperty(node)) {
		return 'objectProperties';
	}

	if (
		node.type === 'FunctionDeclaration'
		|| isVariableFunction(node)
	) {
		return 'namedFunctions';
	}

	return 'default';
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const options = context.options[0];

	context.on(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'], node => {
		if (
			(node.parent.type === 'ExportDefaultDeclaration' && !node.id)
			|| isAccessorProperty(node)
			|| isClassElementValue(node)
			|| isIife(node)
			|| node.decorators?.length > 0
			|| !node.body
		) {
			return;
		}

		const role = getRole(node, sourceCode);
		const expectedStyle = options[role] ?? options.default;
		const actualStyle = getActualStyle(node);

		if (
			expectedStyle === STYLE_IGNORE
			|| expectedStyle === actualStyle
			|| (node.generator && expectedStyle === STYLE_ARROW_FUNCTION)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {
				role: roleNames.get(role),
				expected: styleNames.get(expectedStyle),
				actual: styleNames.get(actualStyle),
			},
		};

		const suggest = getSuggestion({
			node,
			role,
			actualStyle,
			expectedStyle,
			context,
		});

		return suggest
			? {...problem, suggest}
			: problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce function syntax by role.',
			recommended: false,
		},
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				properties: Object.fromEntries(roleStyles.keys().map(role => [role, createRoleSchema(role)])),
				additionalProperties: false,
			},
		],
		defaultOptions: [defaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
