import {onRoot, toLocation} from './utils/index.js';

const MESSAGE_ID = 'no-leading-empty-lines';
const messages = {
	[MESSAGE_ID]: 'Do not use empty lines at the beginning of a file.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	// Skip named virtual files created by processors, such as Markdown code blocks.
	if (context.filename !== context.physicalFilename) {
		return;
	}

	onRoot(context, node => {
		const leadingEmptyLines = context.sourceCode.text.match(/^(?:[\t ]*(?:\r\n|[\n\r]))+/v)?.[0];
		if (!leadingEmptyLines) {
			return;
		}

		const range = [0, leadingEmptyLines.length];
		return {
			node,
			loc: toLocation(range, context),
			messageId: MESSAGE_ID,
			fix: fixer => fixer.removeRange(range),
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Disallow empty lines at the beginning of a file.',
			recommended: true,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
