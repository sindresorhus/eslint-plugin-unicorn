'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getConsoleMethod = node => {
	const methods = [
		'log',
		'debug',
		'info',
		'warn',
		'error'
	];

	const {callee} = node;

	if (
		callee.type === 'MemberExpression' &&
		callee.object.type === 'Identifier' &&
		callee.object.name === 'console' &&
		callee.property.type === 'Identifier' &&
		methods.includes(callee.property.name)
	) {
		return callee.property.name;
	}
};

const fixValue = value => {
	if (!value) {
		return value;
	}

	// Find exactly one leading or tailing space
	return value.replace(/^ ?((?! ).*?[^ ]) ?$/, '$1');
};

const getFixableArguments = node => {
	const {
		arguments: args
	} = node;

	return args.filter(arg => {
		return (
			arg.type === 'Literal' &&
			typeof arg.value === 'string' &&
			arg.value !== fixValue(arg.value)
		);
	});
};

const fixArg = (context, arg, fixer) => {
	const replacement = fixValue(arg.value);

	// Ignore quotes
	const range = [
		arg.range[0] + 1,
		arg.range[1] - 1
	];

	return fixer.replaceTextRange(range, replacement);
};

const buildErrorMessage = method => {
	return `Do not include spaces in \`console.${method}\` parameters.`;
};

const create = context => {
	return {
		CallExpression(node) {
			const method = getConsoleMethod(node);
			if (!method) {
				return;
			}

			const args = getFixableArguments(node);
			args.forEach(arg => {
				context.report({
					node: arg,
					message: buildErrorMessage(method),
					fix: fixer => fixArg(context, arg, fixer)
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
