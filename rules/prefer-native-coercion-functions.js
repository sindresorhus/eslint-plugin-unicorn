'use strict';
const {getFunctionHeadLocation, getFunctionNameWithKind} = require('eslint-utils');
const {not} = require('./selectors/index.js');

const MESSAGE_ID= 'prefer-native-coercion-functions';
const messages = {
	[MESSAGE_ID]: '{{functionNameWithKind}} is equivalent of `{{replacementFunction}}`, should use `{{replacementFunction}}` directly.',
};

const nativeCoercionFunctionNames = new Set(['String', 'Number', 'BigInt', 'Boolean', 'Symbol']);

const isNativeCoercionFunctionCall = (node, firstArgumentName) =>
	node.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& nativeCoercionFunctionNames.has(node.callee.name)
	&& node.arguments[0]
	&& node.arguments[0].type === 'Identifier'
	&& node.arguments[0].name === firstArgumentName

function getCallExpression(node) {
	const firstParameterName = node.params[0].name;

	// `(v) => String(v)`
	if (
		node.type === 'ArrowFunctionExpression'
		&& isNativeCoercionFunctionCall(node.body, firstParameterName)
	) {
		return node.body;
	}

	// `(v) => {return String(v);}`
	// `function (v) {return String(v);}`
	if (
		node.body.type === 'BlockStatement'
		&& node.body.body.length === 1
		&& node.body.body[0].type === 'ReturnStatement'
		&& isNativeCoercionFunctionCall(node.body.body[0].argument, firstParameterName)
	) {
		return node.body.body[0].argument;
	}
}

const selector = [
	':function',
	'[async!=true]',
	'[generator!=true]',
	'[params.length>0]',
	'[params.0.type="Identifier"]',
	not([
		'MethodDefinition[kind="constructor"] > .value',
		'MethodDefinition[kind="set"] > .value',
		'Property[kind="set"] > .value'
	]),
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	return {
		[selector](node) {
			const callExpression = getCallExpression(node);

			if (!callExpression) {
				return;
			}

			const name = callExpression.callee.name

			const sourceCode = context.getSourceCode();
			const problem = {
				node,
				loc: getFunctionHeadLocation(node, sourceCode),
				messageId: MESSAGE_ID,
				data: {
					functionNameWithKind: getFunctionNameWithKind(node, sourceCode),
					replacementFunction: name,
				},
			};

			if (
				node.type === 'FunctionDeclaration'
				|| sourceCode.getCommentsInside(node).length > 0
				|| node.params.length !== 1
				|| callExpression.arguments.length !== 1
			) {
				return problem;
			}

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			problem.fix = fixer => {
				let text = name;

				if (
					node.parent.type === 'Property'
					&& node.parent.method
					&& node.parent.value === node
				) {
					text = `: ${text}`;
				} else if (node.parent.type === 'MethodDefinition') {
					text = ` = ${text};`;
				}

				return fixer.replaceText(node, text);
			};
			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer use `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly.',
		},
		fixable: 'code',
		messages,
	},
};
