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

	name = node.type === 'ClassDeclaration' ? upperFirst(name) : name;
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
			const [exportDeclarationStart] = node.parent.range;
			const [arrowFunctionStart] = getParenthesizedRange(node, sourceCode);

			const originalExportDefaultText = sourceCode.text.slice(exportDeclarationStart, arrowFunctionStart);
			const shouldInsertSpaceAfterDefault
				= !originalExportDefaultText.endsWith(' ')
				&& !originalExportDefaultText.endsWith('\n')
				&& !originalExportDefaultText.endsWith('\t');

			return [
				fixer.replaceTextRange(
					[exportDeclarationStart, arrowFunctionStart],
					`const ${name} = `,
				),
				fixer.insertTextAfter(
					node.parent,
					`\n${originalExportDefaultText}${shouldInsertSpaceAfterDefault ? ' ' : ''}${name};`,
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
	context.on('ExportDefaultDeclaration', (node) => {
		if (!isAnonymousClassOrFunction(node.declaration)) {
			return;
		}

		return getProblem(node.declaration, context)
	});

	context.on('AssignmentExpression', (node) => {
		if (
			!isAnonymousClassOrFunction(node.right)
			|| !(
				isMemberExpression(node.left, {
					object: 'module',
					property: 'exports',
					computed: false,
					optional: false
				})
				|| (
					node.left.type === 'Identifier',
					node.left.name === 'exports'
				)
			)
		) {
			return
		}

		return getProblem(node.right, context);
	})
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
