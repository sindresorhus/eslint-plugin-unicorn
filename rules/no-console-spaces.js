'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const replaceStringRaw = require('./utils/replace-string-raw');

const MESSAGE_ID = 'no-console-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not use {{positions}} space between `console.{{method}}` parameters.'
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

	const fixParamter = (node, index, parameters) => {
		if (
			!(node.type === 'Literal' && typeof node.value === 'string') &&
			node.type !== 'TemplateLiteral'
		) {
			return;
		}

		const raw = sourceCode.getText(node).slice(1, -1);
		const positions = [];

		let fixed = raw;

		if (index !== 0 && hasLeadingSpace(fixed)) {
			positions.push('leading');
			fixed = fixed.slice(1);
		}

		if (index !== parameters.length - 1 && hasTrailingSpace(fixed)) {
			positions.push('trailing');
			fixed = fixed.slice(0, -1);
		}

		if (raw !== fixed) {
			return {
				positions,
				node,
				fixed
			};
		}
	};

	return {
		[selector](node) {
			const method = node.callee.property.name;
			const fixedParameters = node.arguments
				.map((parameter, index) => fixParamter(parameter, index, node.arguments))
				.filter(Boolean);

			for (const {node, fixed, positions} of fixedParameters) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					data: {method, positions: positions.join(' and ')},
					fix: fixer => replaceStringRaw(fixer, node, fixed)
				});
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
