import {getArrayConcatInLoop} from './shared/array-concat-in-loop.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-array-concat-in-loop';
const messages = {
	[MESSAGE_ID]: 'Do not use `Array#concat()` to accumulate an array in a loop.',
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('AssignmentExpression', node => {
		const problem = getArrayConcatInLoop(node, context);

		if (!problem) {
			return;
		}

		return {
			node: problem.property,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow array accumulation with `Array#concat()` in loops.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
