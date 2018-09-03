'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getConsoleMethod = (node) => {
	const methods = [
		'log',
		'warn',
		'error',
	];

	const { callee } = node;

	if (
		callee.type !== 'MemberExpression' ||
		callee.object.type !== 'Identifier' ||
		callee.object.name !== 'console' ||
		callee.property.type !== 'Identifier' ||
		!methods.includes(callee.property.name)
	) {
		return;
	}

	return callee.property.name;
};

const getTrimmableArguments = (node) => {
	const {
		arguments: args = [],
	} = node;

	return args.filter((arg) => {
		return (
			arg.type === 'Literal' &&
			typeof arg.value === 'string' &&
			!!arg.value &&
			arg.value !== arg.value.trim()
		);
	});
}

const fix = (context, arg, fixer) => {
	const token = context.getSourceCode().getText(arg);
	const replacement = arg.value.trim();

	// Ignore quotes
	const range = [
		arg.range[0] + 1,
		arg.range[1] - 1,
	];

	return fixer.replaceTextRange(range, replacement)
}

const buildErrorMessage = (method) => {
	return `Do not include spaces in \`console.${method}\` parameters.`;
}

const create = (context) => {
	return {
		CallExpression(node) {
			const method = getConsoleMethod(node);
			if (!method) {
				return;
			}

			const args = getTrimmableArguments(node);
			if (!args.length) {
				return;
			}

			args.forEach((arg) => {
				context.report({
					node: arg,
					message: buildErrorMessage(method),
					fix: fixer => fix(context, arg, fixer),
				});
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
