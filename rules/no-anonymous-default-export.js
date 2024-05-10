'use strict';

const path = require('node:path');
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
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {
	getScopes,
	avoidCapture,
} = require('./utils/index.js');
const {isMemberExpression} = require('./ast/index.js');

const MESSAGE_ID_ERROR = 'no-anonymous-default-export/error';
const MESSAGE_ID_SUGGESTION = 'no-anonymous-default-export/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'The {{description}} should be named.',
	[MESSAGE_ID_SUGGESTION]: 'Name it as `{{name}}`.',
};

const isClassKeywordToken = token => token.type === 'Keyword' && token.value === 'class';
const isAnonymousClassOrFunction = node =>
	(
		(
			node.type === 'FunctionDeclaration'
			|| node.type === 'FunctionExpression'
			|| node.type === 'ClassDeclaration'
			|| node.type === 'ClassExpression'
		)
		&& !node.id
	)
	|| node.type === 'ArrowFunctionExpression';

function getSuggestionName(node, filename, sourceCode) {
	if (filename === '<input>' || filename === '<text>') {
		return;
	}

	let [name] = path.basename(filename).split('.');
	name = camelCase(name);

	if (!isIdentifierName(name)) {
		return;
	}

	name = node.type === 'ClassDeclaration' || node.type === 'ClassExpression' ? upperFirst(name) : name;
	name = avoidCapture(name, getScopes(sourceCode.getScope(node)));

	return name;
}

function addName(fixer, node, name, sourceCode) {
	switch (node.type) {
		case 'ClassDeclaration':
		case 'ClassExpression': {
			const lastDecorator = node.decorators?.at(-1);
			const classToken = lastDecorator
				? sourceCode.getTokenAfter(lastDecorator, isClassKeywordToken)
				: sourceCode.getFirstToken(node, isClassKeywordToken);
			return fixer.insertTextAfter(classToken, ` ${name}`);
		}

		case 'FunctionDeclaration':
		case 'FunctionExpression': {
			const openingParenthesisToken = sourceCode.getFirstToken(
				node,
				isOpeningParenToken,
			);
			return fixer.insertTextBefore(
				openingParenthesisToken,
				`${sourceCode.text.charAt(openingParenthesisToken.range[0] - 1) === ' ' ? '' : ' '}${name} `,
			);
		}

		case 'ArrowFunctionExpression': {
			const [exportDeclarationStart, exportDeclarationEnd]
				= node.parent.type === 'ExportDefaultDeclaration'
					? node.parent.range
					: node.parent.parent.range;
			const [arrowFunctionStart, arrowFunctionEnd] = getParenthesizedRange(node, sourceCode);

			let textBefore = sourceCode.text.slice(exportDeclarationStart, arrowFunctionStart);
			let textAfter = sourceCode.text.slice(arrowFunctionEnd, exportDeclarationEnd);

			textBefore = `\n${textBefore}`;
			if (!/\s$/.test(textBefore)) {
				textBefore = `${textBefore} `;
			}

			if (!textAfter.endsWith(';')) {
				textAfter = `${textAfter};`;
			}

			return [
				fixer.replaceTextRange(
					[exportDeclarationStart, arrowFunctionStart],
					`const ${name} = `,
				),
				fixer.replaceTextRange(
					[arrowFunctionEnd, exportDeclarationEnd],
					';',
				),
				fixer.insertTextAfterRange(
					[exportDeclarationEnd, exportDeclarationEnd],
					`${textBefore}${name}${textAfter}`,
				),
			];
		}

		// No default
	}
}

function getProblem(node, context) {
	const {sourceCode, physicalFilename} = context;

	const suggestionName = getSuggestionName(node, physicalFilename, sourceCode);

	let loc;
	let description;
	if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
		loc = getClassHeadLocation(node, sourceCode);
		description = 'class';
	} else {
		loc = getFunctionHeadLocation(node, sourceCode);
		// [TODO: @fisker]: Ask `@eslint-community/eslint-utils` to expose `getFunctionKind`
		const nameWithKind = getFunctionNameWithKind(node);
		description = nameWithKind.replace(/ '.*?'$/, '');
	}

	const problem = {
		node,
		loc,
		messageId: MESSAGE_ID_ERROR,
		data: {
			description,
		},
	};

	if (!suggestionName) {
		return problem;
	}

	problem.suggest = [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			data: {
				name: suggestionName,
			},
			fix: fixer => addName(fixer, node, suggestionName, sourceCode),
		},
	];

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ExportDefaultDeclaration', node => {
		if (!isAnonymousClassOrFunction(node.declaration)) {
			return;
		}

		return getProblem(node.declaration, context);
	});

	context.on('AssignmentExpression', node => {
		if (
			!isAnonymousClassOrFunction(node.right)
			|| !(
				node.parent.type === 'ExpressionStatement'
				&& node.parent.expression === node
			)
			|| !(
				isMemberExpression(node.left, {
					object: 'module',
					property: 'exports',
					computed: false,
					optional: false,
				})
				|| (
					node.left.type === 'Identifier',
					node.left.name === 'exports'
				)
			)
		) {
			return;
		}

		return getProblem(node.right, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow anonymous functions and classes as the default export.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};
