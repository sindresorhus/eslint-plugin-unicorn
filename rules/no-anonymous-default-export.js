'use strict';

const path = require('node:path')
const {
	getFunctionHeadLocation,
	getFunctionNameWithKind,
	isOpeningParenToken,
} = require('@eslint-community/eslint-utils');
const {
	isIdentifierName,
} = require('@babel/helper-validator-identifier');
const getClassHeadLocation = require('./utils/get-class-head-location.js');
const {upperFirst, camelCase} = require('./utils/lodash.js');
const assertToken = require('./utils/assert-token.js');
const {} = require('./ast/index.js');
const {} = require('./fix/index.js');
const {
	getScopes,
	avoidCapture,
} = require('./utils/index.js');


const MESSAGE_ID_ERROR = 'no-anonymous-default-export/error';
const MESSAGE_ID_SUGGESTION = 'no-anonymous-default-export/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'The {{description}} should be named.',
	[MESSAGE_ID_SUGGESTION]: 'Name it as `{{name}}`.',
};

const EXPECTED_FUNCTION_DESCRIPTION_SUFFIX = ' \'default\''

function getSuggestionName(node, filename, sourceCode) {
	if (filename === '<input>' || filename === '<text>') {
		return;
	}

	let [name] = path.basename(filename).split('.')
	name = camelCase(name)

	if (!isIdentifierName(name)) {
		return
	}

	name = node.type === 'ClassDeclaration' ? upperFirst(name) : name
	name = avoidCapture(name, getScopes(sourceCode.getScope(node)));

	return name;
}

function * addName(fixer, node, name, sourceCode) {
	switch (node.type) {
		case 'ClassDeclaration': {
			const classToken = sourceCode.getFirstToken(node);
			assertToken(classToken, {
				expected: {type: 'Keyword', value: 'class'},
				ruleId: 'no-anonymous-default-export',
			})
			yield fixer.insertTextAfter(classToken, ` ${name}`);
			return;
		}
		case 'FunctionDeclaration': {
			const openingParenthesisToken = sourceCode.getFirstToken(
				node,
				isOpeningParenToken,
			);
			yield fixer.insertTextBefore(
				openingParenthesisToken,
				`${sourceCode.text.charAt(openingParenthesisToken.range[0] - 1) === ' ' ? '' : ' '}${name} `
			);
			return;
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode, physicalFilename} = context;

	return {
		ExportDefaultDeclaration({declaration: node}) {
			if (!(
				(
					(
						node.type === 'FunctionDeclaration' ||
						node.type === 'ClassDeclaration'
					)
					&& !node.id
				)
				||
				node.type === 'ArrowFunctionExpression'
			)) {
				return;
			}

			const suggestionName = getSuggestionName(node, physicalFilename, sourceCode)

			let loc
			let description
			if (node.type === 'ClassDeclaration') {
				loc = getClassHeadLocation(node, sourceCode);
				description = 'class';
			} else {
				loc = getFunctionHeadLocation(node, sourceCode);
				// [TODO: @fisker]: Ask `@eslint-community/eslint-utils` to expose `getFunctionKind`
				const nameWithKind = getFunctionNameWithKind(node)
				description =
					nameWithKind.endsWith(EXPECTED_FUNCTION_DESCRIPTION_SUFFIX)
					? nameWithKind.slice(0, -EXPECTED_FUNCTION_DESCRIPTION_SUFFIX.length)
					: nameWithKind
			}

			const problem = {
				node,
				loc,
				messageId: MESSAGE_ID_ERROR,
				data: {
					description,
				},
			}

			if (!suggestionName) {
				return problem;
			}

			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						name: suggestionName,
					},
					fix: fixer => addName(fixer, node, suggestionName, sourceCode)
				},
			];

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow anonymous functions and classes as the default export.',
		},

		hasSuggestions: true,
		messages,
	},
};
