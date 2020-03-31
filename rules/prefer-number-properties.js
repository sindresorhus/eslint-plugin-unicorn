'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');
const renameIdentifier = require('./utils/rename-identifier');

const METHOD_ERROR_MESSAGE_ID = 'method-error';
const METHOD_SUGGESTION_MESSAGE_ID = 'method-suggestion';
const PROPERTY_ERROR_MESSAGE_ID = 'property-error';

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
	'Identifier.callee',
	`:matches(${Object.keys(methods).map(name => `[name="${name}"]`).join(', ')})`
].join('');

const propertiesSelector = [
	'Identifier',
	'[name="NaN"]',
	`:not(${
		[
			'MemberExpression[computed=false] > Identifier.property',
			'FunctionDeclaration > Identifier.id',
			'ClassDeclaration > Identifier.id',
			'MethodDefinition > Identifier.key',
			'VariableDeclarator > Identifier.id',
			'Property[shorthand=false] > Identifier.key',
			'TSDeclareFunction > Identifier.id',
			'TSEnumMember > Identifier.id',
			'TSPropertySignature > Identifier.key'
		].join(', ')
	})`
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
				messageId: METHOD_ERROR_MESSAGE_ID,
				data: {
					name
				}
			};

			const fix = fixer => renameIdentifier(node, `Number.${name}`, fixer, sourceCode);

			if (isSafe) {
				problem.fix = fix;
			} else {
				problem.suggest = [
					{
						messageId: METHOD_SUGGESTION_MESSAGE_ID,
						data: {
							name
						},
						fix
					}
				];
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
				messageId: PROPERTY_ERROR_MESSAGE_ID,
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
			[METHOD_ERROR_MESSAGE_ID]: 'Prefer `Number.{{name}}()` over `{{name}}()`.',
			[METHOD_SUGGESTION_MESSAGE_ID]: 'Replace `{{name}}()` with `Number.{{name}}()`.',
			[PROPERTY_ERROR_MESSAGE_ID]: 'Prefer `Number.{{name}}` over `{{name}}`.'
		}
	}
};
