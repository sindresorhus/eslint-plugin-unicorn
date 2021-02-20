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
	':not([superClass])',
	'[body.type="ClassBody"]',
	'[body.body.length>0]'
].join('');

const isEqualToken = ({type, value}) =>
	type === 'Punctuator' && value === '=';

function isStaticMember(node) {
	const {type, private: isPrivate, static: isStatic, key} = node;

	if (
		type !== 'ClassProperty' &&
		type !== 'MethodDefinition') {
		return false;
	}

	if (!isStatic || isPrivate) {
		return false;
	}

	if (key.type === 'TSPrivateIdentifier') {
		return false;
	}

	return true;
}

function * switchClassMemberToObjectProperty(node, sourceCode, fixer) {
	const {type} = node;

	const staticToken = sourceCode.getFirstToken(node);
	/* istanbul ignore next */
	if (!(staticToken.type === 'Keyword' && staticToken.value === 'static')) {
		throw new Error(`Expect "static" token, got "${staticToken.value}".`);
	}

	yield fixer.remove(staticToken);
	yield removeSpacesAfter(staticToken, sourceCode, fixer);

	const maybeSemicolonToken =
		type === 'ClassProperty' ?
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

	yield (hasSemicolonToken ? fixer.replaceText(maybeSemicolonToken, ',') : fixer.insertTextAfter(node, ','));
}

function switchClassToObject(node, sourceCode) {
	const {type, id, body, parent} = node;

	if (type === 'ClassExpression' && id) {
		return;
	}

	// This is a stupid way check if `value` of `ClassProperty` uses `this`
	for (const node of body.body) {
		if (
			// eslint-disable-next-line unicorn/consistent-destructuring
			node.type === 'ClassProperty' &&
			// eslint-disable-next-line unicorn/consistent-destructuring
			node.value &&
			sourceCode.getText(node).includes('this')
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
		// Class `id` to `const`
		if (type === 'ClassDeclaration') {
			yield fixer.replaceText(classToken, 'const');
			yield fixer.insertTextBefore(body, '= ');
			yield fixer.insertTextAfter(body, ';');
		} else {
			// eslint-disable-next-line no-lonely-if
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
