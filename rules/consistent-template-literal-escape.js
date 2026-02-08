import {replaceTemplateElement} from './fix/index.js';
import {isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'consistent-template-literal-escape';
const messages = {
	[MESSAGE_ID]: 'Use `\\${` instead of `$\\{` to escape in template literals.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent, ['String.raw'])) {
			return;
		}

		const {raw} = node.value;

		// Match `$\{` or `\$\{` and replace with `\${`.
		// The `\\?` makes the leading backslash optional to handle both patterns.
		// The lookbehind ensures an even number of preceding backslashes (including zero).
		const fixedRaw = raw.replaceAll(
			/(?<=(?:^|[^\\])(?:\\\\)*)\\?\$\\{/g,
			String.raw`\${`,
		);

		if (raw !== fixedRaw) {
			return {
				node,
				messageId: MESSAGE_ID,
				fix: fixer => replaceTemplateElement(node, fixedRaw, context, fixer),
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
			description: 'Enforce consistent style for escaping `${` in template literals.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
