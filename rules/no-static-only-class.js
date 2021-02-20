'use strict';
const {isSemicolonToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getClassHeadLocation = require('./utils/get-class-head-location');
const removeSpacesAfter = require('./utils/remove-spaces-after');

const MESSAGE_ID = 'no-static-only-class';
const messages = {
	[MESSAGE_ID]: 'Use object instead of class with only static members.'
};

const selector = [
	':matches(ClassDeclaration, ClassExpression)',
	':not([superClass], [decorators.length>0])',
	'[body.type="ClassBody"]',
	'[body.body.length>0]'
].join('');

const assertToken = (token, expected) => {
	const {type, value} = token;
	/* istanbul ignore next */
	if (
		type !== expected.type ||
		value !== expected.value
	) {
		const issueLink = 'https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=%60no-static-only-class%60%3A%20Unexpected%20token%20error';
		throw new Error(
			`Expect token '${JSON.stringify(expected)}', got '${JSON.stringify({type, value})}', Please open an issue at ${issueLink}.`
		);
	}
};

const isEqualToken = ({type, value}) => type === 'Punctuator' && value === '=';
const isDeclarationOfExportDefaultDeclaration = node =>
	node.type === 'ClassDeclaration' &&
	node.parent.type === 'ExportDefaultDeclaration' &&
	node.parent.declaration === node;

function isStaticMember(node) {
	const {
		type,
		private: isPrivate,
		static: isStatic,
		declare: isDeclare,
		readonly: isReadonly,
		accessibility,
		decorators,
		key
	} = node;

	// Avoid matching unexpected node. For example: https://github.com/tc39/proposal-class-static-block
	/* istanbul ignore next */
	if (type !== 'ClassProperty' && type !== 'MethodDefinition') {
		return false;
	}

	if (!isStatic || isPrivate) {
		return false;
	}

	// TypeScript class
	if (
		isDeclare ||
		isReadonly ||
		typeof accessibility !== 'undefined' ||
		(Array.isArray(decorators) && decorators.length > 0) ||
		key.type === 'TSPrivateIdentifier'
	) {
		return false;
	}

	return true;
}

function * switchClassMemberToObjectProperty(node, sourceCode, fixer) {
	const {type} = node;

	const staticToken = sourceCode.getFirstToken(node);
	// `babel-eslint` and `@babel/eslint-parser` use `{type: 'Identifier', value: 'static'}`
	if (!(staticToken.value === 'static' && staticToken.type === 'Identifier')) {
		assertToken(staticToken, {type: 'Keyword', value: 'static'});
	}

	yield fixer.remove(staticToken);
	yield removeSpacesAfter(staticToken, sourceCode, fixer);

	const maybeSemicolonToken = type === 'ClassProperty' ?
		sourceCode.getLastToken(node) :
		sourceCode.getTokenAfter(node);
	const hasSemicolonToken = isSemicolonToken(maybeSemicolonToken);

	if (type === 'ClassProperty') {
		const {key, value} = node;

		if (value) {
			// Computed key may have `]` after `key`
			const equalToken = sourceCode.getTokenAfter(key, isEqualToken);
			yield fixer.replaceText(equalToken, ':');
		} else if (hasSemicolonToken) {
			yield fixer.insertTextBefore(maybeSemicolonToken, ': undefined');
		} else {
			yield fixer.insertTextAfter(node, ': undefined');
		}
	}

	yield (
		hasSemicolonToken ?
			fixer.replaceText(maybeSemicolonToken, ',') :
			fixer.insertTextAfter(node, ',')
	);
}

function switchClassToObject(node, sourceCode) {
	const {
		type,
		id,
		body,
		declare: isDeclare,
		abstract: isAbstract,
		implements: classImplements,
		parent
	} = node;

	if (
		isDeclare ||
		isAbstract ||
		(Array.isArray(classImplements) && classImplements.length > 0)
	) {
		return;
	}

	if (type === 'ClassExpression' && id) {
		return;
	}

	const isExportDefault = isDeclarationOfExportDefaultDeclaration(node);

	if (isExportDefault && id) {
		return;
	}

	for (const node of body.body) {
		if (
			node.type === 'ClassProperty' &&
			(
				node.typeAnnotation ||
				// This is a stupid way to check if `value` of `ClassProperty` uses `this`
				(node.value && sourceCode.getText(node).includes('this'))
			)
		) {
			return;
		}
	}

	// There are comments after return, and `{` is not on same line
	// ```js
	// function a() {
	// 	return class // comment
	// 	{
	// 		static a() {}
	// 	}
	// }
	// ```
	const classToken = sourceCode.getFirstToken(node);
	/* istanbul ignore next */
	assertToken(classToken, {type: 'Keyword', value: 'class'});

	let needMoveBodyOpeningBraceToken = false;
	if (
		type === 'ClassExpression' &&
		parent.type === 'ReturnStatement' &&
		body.loc.start.line !== parent.loc.start.line &&
		sourceCode.text.slice(classToken.range[1], body.range[0]).trim()
	) {
		needMoveBodyOpeningBraceToken = true;
	}

	return function * (fixer) {
		if (isExportDefault || type === 'ClassExpression') {
			if (needMoveBodyOpeningBraceToken) {
				yield fixer.replaceText(classToken, '{');

				const openingBraceToken = sourceCode.getFirstToken(body);
				yield fixer.remove(openingBraceToken);
			} else {
				yield fixer.replaceText(classToken, '');

				// Avoid breaking case like
				// ```js
				// return class
				// {};
				// ```
				yield removeSpacesAfter(classToken, sourceCode, fixer);
			}

			// There should not be ASI problem
		} else {
			yield fixer.replaceText(classToken, 'const');
			yield fixer.insertTextBefore(body, '= ');
			yield fixer.insertTextAfter(body, ';');
		}

		for (const node of body.body) {
			yield * switchClassMemberToObjectProperty(node, sourceCode, fixer);
		}
	};
}

function create(context) {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			if (node.body.body.some(node => !isStaticMember(node))) {
				return;
			}

			context.report({
				node,
				loc: getClassHeadLocation(node, sourceCode),
				messageId: MESSAGE_ID,
				fix: switchClassToObject(node, sourceCode)
			});
		}
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
