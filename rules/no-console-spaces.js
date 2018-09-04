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

const getArgumentValue = (context, nodeArgument) => {
	let value = null;

	if (nodeArgument.type === 'Literal' && typeof nodeArgument.value === 'string') {
		value = nodeArgument.value;
	}

	if (nodeArgument.type === 'TemplateLiteral') {
		const sourceCode = context.getSourceCode();
		value = sourceCode.getText(nodeArgument);
		// Strip off backticks
		value = value.substring(1, value.length - 1);
	}

	return value;
};

const fixValue = value => {
	if (!value) {
		return value;
	}

	// Find exactly one leading or tailing space
	return value.replace(/^ ?((?! ).*?[^ ]) ?$/, '$1');
};

const getFixableArguments = (context, node) => {
	const {
		arguments: args
	} = node;

	return args.filter(nodeArgument => {
		const value = getArgumentValue(context, nodeArgument);
		return value !== fixValue(value);
	});
};

const fixArg = (context, nodeArgument, fixer) => {
	const value = getArgumentValue(context, nodeArgument);
	const replacement = fixValue(value);

	// Ignore quotes and backticks
	const range = [
		nodeArgument.range[0] + 1,
		nodeArgument.range[1] - 1
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

			const stringArgs = getFixableArguments(context, node);
			for (const nodeArgument of stringArgs) {
				context.report({
					node: nodeArgument,
					message: buildErrorMessage(method),
					fix: fixer => fixArg(context, nodeArgument, fixer)
				});
			}
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
