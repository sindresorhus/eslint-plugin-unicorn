'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');

const messageId = 'preferNumberProperties';

const methods = {
	parseInt: true,
	parseFloat: true,
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
				messageId,
				data: {
					name
				}
			};

			const fix = fixer => replaceProperty(fixer, node);

			if (isSafe) {
				problem.fix = fix;
			} else {
				problem.suggest = [{messageId, fix}];
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
				messageId,
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
			[messageId]: 'Prefer `Number.{{name}}` over `{{name}}`.'
		}
	}
};
