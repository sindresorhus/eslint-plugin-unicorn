'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const replaceStringRaw = require('./utils/replace-string-raw');

const message = 'Do not use leading/trailing space between `console.{{method}}` parameters.';

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
const fixLeadingSpace = value =>
	value.length > 1 && value.charAt(0) === ' ' && value.charAt(1) !== ' ' ?
		value.slice(1) :
		value;

// Find exactly one trailing space, allow exactly one space
const fixTrailingSpace = value =>
	value.length > 1 && value.charAt(value.length - 1) === ' ' && value.charAt(value.length - 2) !== ' ' ?
		value.slice(0, -1) :
		value;

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

		let fixed = raw;

		if (index !== 0) {
			fixed = fixLeadingSpace(fixed);
		}

		if (index !== parameters.length - 1) {
			fixed = fixTrailingSpace(fixed);
		}

		if (raw !== fixed) {
			return {
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

			for (const {node, fixed} of fixedParameters) {
				context.report({
					node,
					message,
					data: {method},
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
		fixable: 'code'
	}
};
