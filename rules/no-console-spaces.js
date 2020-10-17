'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

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
const hasLeadingSpace = value => value.length > 1 && value.charAt(0) === ' ' && value.charAt(1) !== ' ';

// Find exactly one trailing space, allow exactly one space
const hasTrailingSpace = value => value.length > 1 && value.charAt(value.length - 1) === ' ' && value.charAt(value.length - 2) !== ' ';

const create = context => {
	const sourceCode = context.getSourceCode();
	const report = (node, method, position) => {
		const index = position === 'leading' ?
			node.range[0] + 1 :
			node.range[1] - 2;

		context.report({
			loc: {
				start: sourceCode.getLocFromIndex(index),
				end: sourceCode.getLocFromIndex(index + 1)
			},
			messageId: MESSAGE_ID,
			data: {method, position},
			fix: fixer => fixer.removeRange([index, index + 1])
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
