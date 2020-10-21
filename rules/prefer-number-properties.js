'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');
const renameIdentifier = require('./utils/rename-identifier');

const METHOD_ERROR_MESSAGE_ID = 'method-error';
const METHOD_SUGGESTION_MESSAGE_ID = 'method-suggestion';
const PROPERTY_ERROR_MESSAGE_ID = 'property-error';
const messages = {
	[METHOD_ERROR_MESSAGE_ID]: 'Prefer `Number.{{name}}()` over `{{name}}()`.',
	[METHOD_SUGGESTION_MESSAGE_ID]: 'Replace `{{name}}()` with `Number.{{name}}()`.',
	[PROPERTY_ERROR_MESSAGE_ID]: 'Prefer `Number.{{property}}` over `{{identifier}}`.'
};

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
	':matches([name="NaN"],[name="Infinity"])',
	`:not(${
		[
			'MemberExpression[computed=false] > Identifier.property',
			'FunctionDeclaration > Identifier.id',
			'ClassDeclaration > Identifier.id',
			'ClassProperty[computed=false] > Identifier.key',
			'MethodDefinition[computed=false] > Identifier.key',
			'VariableDeclarator > Identifier.id',
			'Property[shorthand=false][computed=false] > Identifier.key',
			'TSDeclareFunction > Identifier.id',
			'TSEnumMember > Identifier.id',
			'TSPropertySignature > Identifier.key'
		].join(', ')
	})`
].join('');

const isNegative = node => {
	const {parent} = node;
	return parent && parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

const create = context => {
	const sourceCode = context.getSourceCode();
	const options = {
		checkInfinity: true,
		...context.options[0]
	};

	// Cache `NaN` and `Infinity` in `foo = {NaN, Infinity}`
	const reported = new WeakSet();

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
			if (reported.has(node) || isShadowed(context.getScope(), node)) {
				return;
			}

			const {name} = node;
			if (name === 'Infinity' && !options.checkInfinity) {
				return;
			}

			let property = name;
			if (name === 'Infinity') {
				property = isNegative(node) ? 'NEGATIVE_INFINITY' : 'POSITIVE_INFINITY';
			}

			const problem = {
				node,
				messageId: PROPERTY_ERROR_MESSAGE_ID,
				data: {
					identifier: name,
					property
				}
			};

			if (property === 'NEGATIVE_INFINITY') {
				problem.node = node.parent;
				problem.data.identifier = '-Infinity';
				problem.fix = fixer => fixer.replaceText(node.parent, 'Number.NEGATIVE_INFINITY');
			} else {
				problem.fix = fixer => renameIdentifier(node, `Number.${property}`, fixer, sourceCode);
			}

			context.report(problem);
			reported.add(node);
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			checkInfinity: {
				type: 'boolean',
				default: true
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
