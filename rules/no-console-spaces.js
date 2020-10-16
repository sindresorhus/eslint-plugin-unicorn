'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const replaceStringRaw = require('./utils/replace-string-raw');

const MESSAGE_ID = 'no-console-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not use {{position}} space between `console.{{method}}` parameters.'
};

const methods = [
	'log',
	'debug',
	'info',
	'warn',
	'error'
];

const selector = methodSelector({
	names: methods,
	min: 1,
	object: 'console'
});

// Find exactly one leading space, allow exactly one space
const hasLeadingSpace = value => /^ [^ ]/.test(value);

// Find exactly one trailing space, allow exactly one space
const hasTrailingSpace = value => /[^ ] $/.test(value);

const create = context => {
	const sourceCode = context.getSourceCode();
	const report = (node, method, position) => {
		let start;
		let end;

		if (position === 'leading') {
			const [index] = node.range;
			start = index + 1;
			end = index + 2;
		} else {
			const [, index] = node.range;
			start = index - 2;
			end = index - 1;
		}

		context.report({
			loc: {
				start: sourceCode.getLocFromIndex(start),
				end: sourceCode.getLocFromIndex(end)
			},
			messageId: MESSAGE_ID,
			data: {method, position},
			fix: fixer => fixer.removeRange([start, end])
		});
	};
	return {
		[selector](node) {
			const method = node.callee.property.name;
			const {arguments: messages} = node;
			const {length} = messages;
			for (const [index, node] of messages.entries()) {
				const {type, value} = node;
				if (
					!(type === 'Literal' && typeof value === 'string') &&
					type !== 'TemplateLiteral'
				) {
					continue;
				}

				const raw = sourceCode.getText(node).slice(1, -1);

				if (index !== 0 && hasLeadingSpace(raw)) {
					report(node, method, 'leading');
				}

				if (index !== length - 1 && hasTrailingSpace(raw)) {
					report(node, method, 'trailing');
				}
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
