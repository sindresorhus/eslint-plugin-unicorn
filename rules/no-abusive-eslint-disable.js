const MESSAGE_ID = 'no-abusive-eslint-disable';
const messages = {
	[MESSAGE_ID]: 'Specify the rules you want to disable.',
};

// https://github.com/eslint/eslint/blob/df5566f826d9f5740546e473aa6876b1f7d2f12c/lib/languages/js/source-code/source-code.js#L914-L917
const ESLINT_DISABLE_DIRECTIVE_TYPES = new Set([
	'disable',
	'disable-next-line',
	'disable-line',
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', function * () {
		const {sourceCode} = context;
		const {directives} = sourceCode.getDisableDirectives();
		for (const directive of directives) {
			if (
				!(
				// It's a eslint-disable comment
					ESLINT_DISABLE_DIRECTIVE_TYPES.has(directive.type)
					// But it did not specify any rules
					&& !directive.value
				)) {
				return;
			}

			const comment = directive.node;

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
