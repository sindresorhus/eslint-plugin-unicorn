'use strict';

const renameVariable = require('./fix/rename-variable.js');
const {isBooleanExpression, isBooleanTypeAnnotation} = require('./utils/is-boolean.js');
const capitalizeFirstLetter = require('./utils/capitalize-first-letter.js');

const MESSAGE_ID_ERROR = 'better-boolean-variable-names/error';
const MESSAGE_ID_SUGGESTION = 'better-boolean-variable-names/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer readable boolean variable names.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
Extract underscores from the variable name

@param {string} variableName
@returns {[string, string]}
*/
function extractUnderscores(variableName) {
	const underscoresRegex = /^_+/;

	const match = variableName.match(underscoresRegex);
	const underscores = match ? match[0] : '';
	const nameWithoutUnderscores = variableName.replace(underscoresRegex, '');

	return [underscores, nameWithoutUnderscores];
}

/**
@param {import('eslint').Rule.RuleContext} context
@returns {import('eslint').Rule.RuleListener}
*/
const create = context => {
	const configuration = context.options[0] || {};

	const BOOLEAN_PREFIXED = new Set([
		'is',
		'was',
		'has',
		'can',
		'should',
		'had',
		'will',
		'would',
		'could',
		'shall',
		'does',
		'needs',
		'must',
		'includes',
		'enables',
		'disables',
		'supports',
		'allows',
		'requires',
		...(configuration.prefixes ?? []),
	]);

	const replacement
			= [...BOOLEAN_PREFIXED]
				.slice(0, -1)
				.map(v => `\`${v}\``)
				.join(', ')
			+ ', or '
			+ [...BOOLEAN_PREFIXED].slice(-1).map(v => `\`${v}\``);

	/**
	Checks whether it is a readable Boolean identifier name

	@param {string} identifier
	@returns {boolean}
	*/
	function isValidBooleanVariableName(identifier) {
		for (const prefix of BOOLEAN_PREFIXED) {
			// Trim the leading underscores
			identifier = identifier.replace(/^_+/, '');

			if (identifier.startsWith(prefix) && identifier.length > prefix.length) {
				return true;
			}
		}

		return false;
	}

	/**
	 *
	 * @param {import('eslint').Rule.RuleContext} context
	 * @param {import('estree').Identifier} node
	 * @param {string} variableName
	 */
	function report(context, node, variableName) {
		context.report({
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				name: variableName,
				prefixes: replacement,
			},
			suggest: [...BOOLEAN_PREFIXED].slice(0, 5).map(prefix => {
				const [underscores, nameWithoutUnderscores] = extractUnderscores(variableName);

				const isUpperCase = nameWithoutUnderscores.toUpperCase() === nameWithoutUnderscores;

				const expectedVariableName = `${underscores}${isUpperCase ? prefix.toUpperCase() + '_' : prefix}${capitalizeFirstLetter(nameWithoutUnderscores)}`;

				return {
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						value: variableName,
						replacement: expectedVariableName,
					},
					fix(fixer) {
						const scope = context.sourceCode.getScope(node);

						const variable = scope.variables.find(variable => variable.name === node.name);

						if (!variable) {
							return;
						}

						return renameVariable(variable, expectedVariableName, fixer);
					},
				};
			}),
		});
	}

	return {
		VariableDeclarator(node) {
			if (node.id.type === 'Identifier') {
				const variableName = node.id.name;

				const isBooleanDeclarator = isBooleanTypeAnnotation(node.id.typeAnnotation) || isBooleanExpression(context, node.init);

				if (isBooleanDeclarator && !isValidBooleanVariableName(variableName)) {
					report(context, node.id, variableName);
				}
			}
		},
		/**
		@param {import('estree').Function} node
		*/
		'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
			// Validate params
			for (const parameter of node.params) {
				if (parameter.type === 'Identifier') {
					const variableName = parameter.name;
					if (isBooleanTypeAnnotation(parameter.typeAnnotation) && !isValidBooleanVariableName(variableName)) {
						report(context, parameter, variableName);
					}
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer readable boolean variable names.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				properties: {
					prefixes: {
						type: 'array',
						items: {
							type: 'string',
						},
						minItems: 1,
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
		messages,
	},
};
