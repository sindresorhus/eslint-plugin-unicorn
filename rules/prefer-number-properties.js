'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');

const methodMessageId = 'method';
const propertyMessageId = 'property';

const methods = {
	// Safe
	parseInt: true,
	parseFloat: true,
	// Unsafe
	isNaN: false,
	isFinite: false
};

const methodsSelector = [
	'CallExpression',
	'>',
	'Identifier',
	`:matches(${Object.keys(methods).map(name => `[name="${name}"]`).join(', ')})`
].join('');

const propertiesSelector = [
	':not(MemberExpression)',
	'>',
	'Identifier',
	'[name="NaN"]'
].join('');

const replaceProperty = (fixer, node) => fixer.insertTextBefore(node, 'Number.');

const create = context => {
	return {
		[methodsSelector]: node => {
			if (isShadowed(context.getScope(), node)) {
				return;
			}

			const {name} = node;
			const isSafe = methods[name];

			const problem = {
				node,
				messageId: methodMessageId,
				data: {
					name
				}
			};

			const fix = fixer => replaceProperty(fixer, node);

			if (isSafe) {
				problem.fix = fix;
			} else {
				problem.suggest = [{messageId: methodMessageId, fix}];
			}

			context.report(problem);
		},
		[propertiesSelector]: node => {
			if (isShadowed(context.getScope(), node)) {
				return;
			}

			const {name} = node;
			context.report({
				node,
				messageId: propertyMessageId,
				data: {
					name
				},
				fix: fixer => replaceProperty(fixer, node)
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
		fixable: 'code',
		messages: {
			[methodMessageId]: 'Prefer `Number.{{name}}()` over `{{name}}()`.',
			[propertyMessageId]: 'Prefer `Number.{{name}}` over `{{name}}`.'
		}
	}
};
