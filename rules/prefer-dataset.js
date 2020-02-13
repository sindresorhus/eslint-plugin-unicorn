'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValidVariableName = require('./utils/is-valid-variable-name');
const quoteString = require('./utils/quote-string');
const methodSelector = require('./utils/method-selector');

const selector = [
	methodSelector({
		name: 'setAttribute',
		length: 2
	}),
	'[arguments.0.type="Literal"]'
].join('');

const parseNodeText = (context, argument) => context.getSourceCode().getText(argument);

const dashToCamelCase = string => string.replace(/-[a-z]/g, s => s[1].toUpperCase());

const fix = (context, node, fixer) => {
	let [name, value] = node.arguments;
	const calleeObject = parseNodeText(context, node.callee.object);

	name = dashToCamelCase(name.value.slice(5));
	value = parseNodeText(context, value);

	const replacement = `${calleeObject}.dataset${
		isValidVariableName(name) ?
			`.${name}` :
			`[${quoteString(name)}]`
	} = ${value}`;

	return fixer.replaceText(node, replacement);
};

const create = context => {
	return {
		[selector](node) {
			const name = node.arguments[0].value;

			if (typeof name !== 'string' || !name.startsWith('data-') || name === 'data-') {
				return;
			}

			context.report({
				node,
				message: 'Prefer `.dataset` over `setAttribute(…)`.',
				fix: fixer => fix(context, node, fixer)
			});
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
