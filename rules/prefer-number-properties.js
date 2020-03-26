'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');
const renameIdentifier = require('./utils/rename-identifier');

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
	`:not(${
		[
			'MemberExpression[computed=false]',
			'FunctionDeclaration',
			'ClassDeclaration',
			'MethodDefinition'
		].join(', ')
	})`,
	'>',
	'Identifier',
	'[name="NaN"]'
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

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

			const fix = fixer => renameIdentifier(node, `Number.${name}`, fixer, sourceCode);

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

			const {parent} = node;

			if (
				parent &&
				(
					(parent.type === 'VariableDeclarator' && parent.id === node) ||
					(parent.type === 'Property' && !parent.shorthand && parent.key === node) ||
					(parent.type === 'TSDeclareFunction' && parent.id === node) ||
					parent.type === 'TSEnumMember' ||
					parent.type === 'TSPropertySignature'
				)
			) {
				return;
			}

			const {name} = node;
			context.report({
				node,
				messageId: propertyMessageId,
				data: {
					name
				},
				fix: fixer => renameIdentifier(node, `Number.${name}`, fixer, sourceCode)
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
