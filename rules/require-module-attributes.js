import {isCommaToken} from '@eslint-community/eslint-utils';
import {removeObjectProperty} from './fix/index.js';
import {getParentheses} from './utils/index.js';

const MESSAGE_ID = 'require-module-attributes';
const messages = {
	[MESSAGE_ID]: '{{type}} with empty attribute list is not allowed.',
};

const isWithToken = token => token?.type === 'Keyword' && token.value === 'with';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on(['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'], declaration => {
		const {source, attributes} = declaration;

		if (!source || (Array.isArray(attributes) && attributes.length > 0)) {
			return;
		}

		const withToken = sourceCode.getTokenAfter(source);

		if (!isWithToken(withToken)) {
			return;
		}

		// `WithStatement` is not possible in modules, so we don't need worry it's not attributes

		const openingBraceToken = sourceCode.getTokenAfter(withToken);
		const closingBraceToken = sourceCode.getTokenAfter(openingBraceToken);

		return {
			node: declaration,
			loc: {
				start: sourceCode.getLoc(openingBraceToken).start,
				end: sourceCode.getLoc(closingBraceToken).end,
			},
			messageId: MESSAGE_ID,
			data: {
				type: declaration.type === 'ImportDeclaration' ? 'import statement' : 'export statement',
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => [withToken, closingBraceToken, openingBraceToken].map(token => fixer.remove(token)),
		};
	});

	context.on('ImportExpression', importExpression => {
		const {options: optionsNode} = importExpression;

		if (optionsNode?.type !== 'ObjectExpression') {
			return;
		}

		const emptyWithProperty = optionsNode.properties.find(
			property =>
				property.type === 'Property'
				&& !property.method
				&& !property.shorthand
				&& !property.computed
				&& property.kind === 'init'
				&& (
					(
						property.key.type === 'Identifier'
						&& property.key.name === 'with'
					)
					|| (
						property.key.type === 'Literal'
						&& property.key.value === 'with'
					)
				)
				&& property.value.type === 'ObjectExpression'
				&& property.value.properties.length === 0,
		);

		const nodeToRemove = optionsNode.properties.length === 0 || (emptyWithProperty && optionsNode.properties.length === 1)
			? optionsNode
			: emptyWithProperty;

		if (!nodeToRemove) {
			return;
		}

		const isProperty = nodeToRemove.type === 'Property';

		return {
			node: emptyWithProperty?.value ?? nodeToRemove,
			messageId: MESSAGE_ID,
			data: {
				type: 'import expression',
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => isProperty
				? removeObjectProperty(fixer, nodeToRemove, context)
				: [
					// Comma token before
					sourceCode.getTokenBefore(nodeToRemove, isCommaToken),
					...sourceCode.getTokens(nodeToRemove),
					...getParentheses(nodeToRemove, sourceCode),
				].map(token => fixer.remove(token)),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require non-empty module attributes for imports and exports',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
