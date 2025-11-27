import {
	getEslintDisableDirectives,
} from './utils/index.js';

const MESSAGE_ID = 'no-abusive-eslint-disable';
const messages = {
	[MESSAGE_ID]: 'Specify the rules you want to disable.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * () {
		for (const directive of getEslintDisableDirectives(context)) {
			if (directive.value) {
				continue;
			}

			const {start, end} = context.sourceCode.getLoc(directive.node);

			yield {
				// Can't set it at the given location as the warning
				// will be ignored due to the disable comment
				loc: {
					start: {
						...start,
						column: -1,
					},
					end,
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
