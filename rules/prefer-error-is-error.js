import {findVariable} from '@eslint-community/eslint-utils';
import {isMemberExpression, isMethodCall} from './ast/index.js';
import {isGlobalIdentifier} from './utils/index.js';

const MESSAGE_ID = 'prefer-error-is-error';
const messages = {
	[MESSAGE_ID]: 'Prefer `Error.isError(…)`.',
};

const isTypeImport = definition =>
	definition.type === 'ImportBinding'
	&& (
		definition.parent.importKind === 'type'
		|| definition.node.importKind === 'type'
	);

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeImport(definition);

const isValueShadowed = (node, name, context) =>
	findVariable(context.sourceCode.getScope(node), name)?.defs.some(definition => !isTypeOnlyDefinition(definition)) ?? false;

const isGlobalError = (node, context) =>
	node.type === 'Identifier'
	&& node.name === 'Error'
	&& !isValueShadowed(node, 'Error', context);

const isGlobalObject = (node, context) =>
	node.type === 'Identifier'
	&& node.name === 'Object'
	&& isGlobalIdentifier(node, context);

const isErrorTagLiteral = node =>
	node.type === 'Literal'
	&& node.value === '[object Error]';

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
	if (
		node.operator !== '==='
		&& node.operator !== '!=='
	) {
		return;
	}

	if (isErrorTagLiteral(node.right)) {
		const argument = getToStringCallArgument(node.left, context);
		if (argument) {
			return {argument};
		}
	}

	if (isErrorTagLiteral(node.left)) {
		const argument = getToStringCallArgument(node.right, context);
		if (argument) {
			return {argument};
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

		const comparison = getErrorTagComparison(node, context);
		if (
			!comparison
			|| isValueShadowed(node, 'Error', context)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			fix: createFix({
				node,
				argument: comparison.argument,
				negate: node.operator === '!==',
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
			// TODO: Enable in the `recommended` config when `Error.isError()` is Baseline and the project target has moved beyond Node.js >=22 to a Node.js version that ships it.
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
