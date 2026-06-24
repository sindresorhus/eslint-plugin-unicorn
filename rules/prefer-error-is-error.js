import {isMemberExpression, isMethodCall} from './ast/index.js';
import {isTypeImportSpecifier} from './utils/index.js';

const MESSAGE_ID = 'prefer-error-is-error';
const messages = {
	[MESSAGE_ID]: 'Prefer `Error.isError(…)`.',
};

const isTypeImport = definition =>
	definition.type === 'ImportBinding'
	&& isTypeImportSpecifier(definition.node);

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeImport(definition);

function isValueShadowed(node, name, context) {
	let scope = context.sourceCode.getScope(node);

	while (scope) {
		const variable = scope.set.get(name);

		if (variable?.defs.some(definition => !isTypeOnlyDefinition(definition))) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
}

const isGlobalError = (node, context) =>
	node.type === 'Identifier'
	&& node.name === 'Error'
	&& !isValueShadowed(node, 'Error', context);

const isGlobalObject = (node, context) =>
	node.type === 'Identifier'
	&& node.name === 'Object'
	&& !isValueShadowed(node, 'Object', context);

const isErrorTagLiteral = node =>
	node.type === 'Literal'
	&& node.value === '[object Error]';

const supportedComparisonOperators = new Set([
	'===',
	'!==',
	'==',
	'!=',
]);

const isObjectPrototypeToString = (node, context) =>
	isMemberExpression(node, {property: 'toString', optional: false})
	&& isMemberExpression(node.object, {property: 'prototype', optional: false})
	&& isGlobalObject(node.object.object, context);

const isEmptyObjectToString = node =>
	isMemberExpression(node, {property: 'toString', optional: false})
	&& node.object.type === 'ObjectExpression'
	&& node.object.properties.length === 0;

const getToStringCallArgument = (node, context) => {
	if (
		!isMethodCall(node, {
			method: 'call',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return;
	}

	const method = node.callee.object;
	if (
		isObjectPrototypeToString(method, context)
		|| isEmptyObjectToString(method)
	) {
		return node.arguments[0];
	}
};

const getErrorTagComparison = (node, context) => {
	if (!supportedComparisonOperators.has(node.operator)) {
		return;
	}

	if (isErrorTagLiteral(node.right)) {
		const argument = getToStringCallArgument(node.left, context);
		if (argument) {
			return argument;
		}
	}

	if (isErrorTagLiteral(node.left)) {
		const argument = getToStringCallArgument(node.right, context);
		if (argument) {
			return argument;
		}
	}
};

const hasComments = (node, sourceCode) =>
	sourceCode.getCommentsInside(node).length > 0;

const getArgumentText = (node, sourceCode) => {
	const text = sourceCode.getText(node);
	return node.type === 'SequenceExpression' ? `(${text})` : text;
};

const createFix = ({node, argument, negate}, context) =>
	fixer => fixer.replaceText(
		node,
		`${negate ? '!' : ''}Error.isError(${getArgumentText(argument, context.sourceCode)})`,
	);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('BinaryExpression', node => {
		if (hasComments(node, context.sourceCode)) {
			return;
		}

		if (
			node.operator === 'instanceof'
			&& isGlobalError(node.right, context)
		) {
			return {
				node,
				messageId: MESSAGE_ID,
				fix: createFix({
					node,
					argument: node.left,
					negate: false,
				}, context),
			};
		}

		const argument = getErrorTagComparison(node, context);
		if (
			!argument
			|| isValueShadowed(node, 'Error', context)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			fix: createFix({
				node,
				argument,
				negate: node.operator === '!==' || node.operator === '!=',
			}, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Error.isError()` when checking for errors.',
			// eslint-disable-next-line no-warning-comments
			// TODO: Enable in the `recommended` config when `Error.isError()` is Baseline and the project targets Node.js >=24.
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
