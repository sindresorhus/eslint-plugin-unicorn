'use strict';
const isShadowed = require('./utils/is-shadowed.js');
const {
	referenceIdentifierSelector,
	callExpressionSelector,
} = require('./selectors/index.js');
const {replaceReferenceIdentifier} = require('./fix/index.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const METHOD_ERROR_MESSAGE_ID = 'method-error';
const METHOD_SUGGESTION_MESSAGE_ID = 'method-suggestion';
const PROPERTY_ERROR_MESSAGE_ID = 'property-error';
const messages = {
	[METHOD_ERROR_MESSAGE_ID]: 'Prefer `Number.{{name}}()` over `{{name}}()`.',
	[METHOD_SUGGESTION_MESSAGE_ID]: 'Replace `{{name}}()` with `Number.{{name}}()`.',
	[PROPERTY_ERROR_MESSAGE_ID]: 'Prefer `Number.{{property}}` over `{{identifier}}`.',
};

const methods = {
	// Safe
	parseInt: true,
	parseFloat: true,
	// Unsafe
	isNaN: false,
	isFinite: false,
};

const methodsSelector = [
	callExpressionSelector(Object.keys(methods)),
	' > ',
	'.callee',
].join('');

const propertiesSelector = referenceIdentifierSelector(['NaN', 'Infinity']);

const isNegative = node => {
	const {parent} = node;
	return parent && parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();
	const options = {
		checkInfinity: true,
		...context.options[0],
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
					name,
				},
			};

			const fix = fixer => replaceReferenceIdentifier(node, `Number.${name}`, fixer, sourceCode);

			if (isSafe) {
				problem.fix = fix;
			} else {
				problem.suggest = [
					{
						messageId: METHOD_SUGGESTION_MESSAGE_ID,
						data: {
							name,
						},
						fix,
					},
				];
			}

			return problem;
		},
		[propertiesSelector]: node => {
			if (reported.has(node) || isShadowed(context.getScope(), node)) {
				return;
			}

			const {name, parent} = node;
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
					property,
				},
			};

			if (property === 'NEGATIVE_INFINITY') {
				problem.node = parent;
				problem.data.identifier = '-Infinity';
				problem.fix = function * (fixer) {
					yield fixer.replaceText(parent, 'Number.NEGATIVE_INFINITY');
					yield * fixSpaceAroundKeyword(fixer, parent, sourceCode);
				};
			} else {
				problem.fix = fixer => replaceReferenceIdentifier(node, `Number.${property}`, fixer, sourceCode);
			}

			reported.add(node);
			return problem;
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkInfinity: {
				type: 'boolean',
				default: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number` static properties over global ones.',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		messages,
	},
};
