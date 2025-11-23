import {
	parseDirectiveComment,
} from './utils/index.js';

const MESSAGE_ID = 'no-abusive-eslint-disable';
const messages = {
	[MESSAGE_ID]: 'Specify the rules you want to disable.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * (node) {
		for (const comment of node.comments) {
			const directive = parseDirectiveComment(comment);

			if (!(
				// It's a eslint-disable comment
				directive?.isEslintDisableDirective
				// But it did not specify any rules
				&& !directive?.value
			)) {
				return;
			}

			const {sourceCode} = context;

			yield {
				// Can't set it at the given location as the warning
				// will be ignored due to the disable comment
				loc: {
					start: {
						...sourceCode.getLoc(comment).start,
						column: -1,
					},
					end: sourceCode.getLoc(comment).end,
				},
				messageId: MESSAGE_ID,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce specifying rules to disable in `eslint-disable` comments.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
