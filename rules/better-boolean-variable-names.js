'use strict';

const renameVariable = require('./utils/rename-variable.js');
const {isBooleanExpression, isBooleanTypeAnnotation, isBooleanReturnTypeFunction} = require('./utils/is-boolean.js');

const MESSAGE_ID_ERROR = 'better-boolean-variable-names/error';
const MESSAGE_ID_SUGGESTION = 'better-boolean-variable-names/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer readable Boolean variable names.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
Capitalize the first letter of a string

@param {string} str
@returns {string}
*/
function capitalize(string_) {
	return string_.charAt(0).toUpperCase() + string_.slice(1);
}

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
	const BOOLEAN_PREFIXED = new Set(['is', 'was', 'has', 'can', 'should', ...(configuration.prefixes ?? [])]);

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
	 * @param {import('estree').Node} node
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
			suggest: [...BOOLEAN_PREFIXED].map(prefix => {
				const [underscores, nameWithoutUnderscores] = extractUnderscores(variableName);

				const isUpperCase = nameWithoutUnderscores.toUpperCase() === nameWithoutUnderscores;

				const expectedVariableName = `${underscores}${isUpperCase ? prefix.toUpperCase() + '_' : prefix}${capitalize(nameWithoutUnderscores)}`;

				return {
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						value: variableName,
						replacement: expectedVariableName,
					},
					* fix(fixer) {
						yield * renameVariable(context.sourceCode, context.sourceCode.getScope(node), fixer, node, expectedVariableName);
					},
				};
			}),
		});
	}

	return {
		VariableDeclarator(node) {
			if (node.id.type === 'Identifier') {
				const variableName = node.id.name;

				// Const foo = (): boolean => {}
				// const foo = function () {}
				if (
					['FunctionExpression', 'ArrowFunctionExpression'].includes(node.init?.type)
									&& isBooleanReturnTypeFunction(node.init)
									&& !isValidBooleanVariableName(variableName)
				) {
					report(context, node.id, variableName);
					return;
				}

				if (
					(isBooleanExpression(context, node.init) || isBooleanTypeAnnotation(node.id.typeAnnotation))
									&& !isValidBooleanVariableName(variableName)
				) {
					report(context, node.id, variableName);
				}
			}
		},
		/**
		@param {import('estree').Function} node
		*/
		'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
			// Validate function name
			if (node.id?.type === 'Identifier') {
				const variableName = node.id.name;

				if (isBooleanReturnTypeFunction(node) && !isValidBooleanVariableName(variableName)) {
					report(context, node.id, variableName);
				}
			}

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
			description: 'Prefer readable Boolean variable names',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};
