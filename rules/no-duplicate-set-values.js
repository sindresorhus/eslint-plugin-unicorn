import {isNewExpression} from './ast/index.js';
import {getDuplicateArrayElements} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-duplicate-set-values';
const messages = {
	[MESSAGE_ID]: 'Remove duplicate value `{{value}}` from the Set.',
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('NewExpression', (/** @type {ESTree.NewExpression} */ node) => {
		if (!isNewExpression(node, {
			name: 'Set',
			argumentsLength: 1,
		})) {
			return;
		}

		const [iterable] = node.arguments;

		if (iterable.type !== 'ArrayExpression') {
			return;
		}

		const duplicateElements = getDuplicateArrayElements(iterable.elements, context);

		return duplicateElements.map(element => ({
			node: element ?? iterable,
			messageId: MESSAGE_ID,
			data: {
				value: element ? sourceCode.getText(element) : 'undefined',
			},
		}));
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow duplicate values in `Set` constructor array literals.',
			recommended: true,
		},
		messages,
	},
};

export default config;
