'use strict';
const {isSemicolonToken} = require('eslint-utils');
const getClassHeadLocation = require('./utils/get-class-head-location.js');
const assertToken = require('./utils/assert-token.js');
const {removeSpacesAfter} = require('./fix/index.js');

const MESSAGE_ID = 'no-static-only-class';
const messages = {
	[MESSAGE_ID]: 'Use an object instead of a class with only static members.',
};

const selector = [
	':matches(ClassDeclaration, ClassExpression)',
	':not([superClass], [decorators.length>0])',
	'[body.type="ClassBody"]',
	'[body.body.length>0]',
].join('');

const isEqualToken = ({type, value}) => type === 'Punctuator' && value === '=';
const isDeclarationOfExportDefaultDeclaration = node =>
	node.type === 'ClassDeclaration'
	&& node.parent.type === 'ExportDefaultDeclaration'
	&& node.parent.declaration === node;

// https://github.com/estree/estree/blob/master/stage3/class-features.md#propertydefinition
const isPropertyDefinition = node => node.type === 'PropertyDefinition'
	// Legacy node type
	|| node.type === 'ClassProperty';
const isMethodDefinition = node => node.type === 'MethodDefinition';

function isStaticMember(node) {
	const {
		private: isPrivate,
		static: isStatic,
		declare: isDeclare,
		readonly: isReadonly,
		accessibility,
		decorators,
		key,
	} = node;

	// Avoid matching unexpected node. For example: https://github.com/tc39/proposal-class-static-block
	if (!isPropertyDefinition(node) && !isMethodDefinition(node)) {
		return false;
	}

	if (!isStatic || isPrivate) {
		return false;
	}

	// TypeScript class
	if (
		isDeclare
		|| isReadonly
		|| typeof accessibility !== 'undefined'
		|| (Array.isArray(decorators) && decorators.length > 0)
		|| key.type === 'TSPrivateIdentifier'
	) {
		return false;
	}

	return true;
}

function * switchClassMemberToObjectProperty(node, sourceCode, fixer) {
	const staticToken = sourceCode.getFirstToken(node);
	assertToken(staticToken, {
		expected: [
			{type: 'Keyword', value: 'static'},
			// `@babel/eslint-parser` use `{type: 'Identifier', value: 'static'}`
			{type: 'Identifier', value: 'static'},
		],
		ruleId: 'no-static-only-class',
	});

	yield fixer.remove(staticToken);
	yield removeSpacesAfter(staticToken, sourceCode, fixer);

	const maybeSemicolonToken = isPropertyDefinition(node)
		? sourceCode.getLastToken(node)
		: sourceCode.getTokenAfter(node);
	const hasSemicolonToken = isSemicolonToken(maybeSemicolonToken);

	if (isPropertyDefinition(node)) {
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
		hasSemicolonToken
			? fixer.replaceText(maybeSemicolonToken, ',')
			: fixer.insertTextAfter(node, ',')
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
		parent,
	} = node;

	if (
		isDeclare
		|| isAbstract
		|| (Array.isArray(classImplements) && classImplements.length > 0)
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
			isPropertyDefinition(node)
			&& (
				node.typeAnnotation
				// This is a stupid way to check if `value` of `PropertyDefinition` uses `this`
				|| (node.value && sourceCode.getText(node.value).includes('this'))
			)
		) {
			return;
		}
	}

	return function * (fixer) {
		const classToken = sourceCode.getFirstToken(node);
		/* istanbul ignore next */
		assertToken(classToken, {
			expected: {type: 'Keyword', value: 'class'},
			ruleId: 'no-static-only-class',
		});

		if (isExportDefault || type === 'ClassExpression') {
			/*
				There are comments after return, and `{` is not on same line

				```js
				function a() {
					return class // comment
					{
						static a() {}
					}
				}
				```
			*/
			if (
				type === 'ClassExpression'
				&& parent.type === 'ReturnStatement'
				&& body.loc.start.line !== parent.loc.start.line
				&& sourceCode.text.slice(classToken.range[1], body.range[0]).trim()
			) {
				yield fixer.replaceText(classToken, '{');

				const openingBraceToken = sourceCode.getFirstToken(body);
				yield fixer.remove(openingBraceToken);
			} else {
				yield fixer.replaceText(classToken, '');

				/*
						Avoid breaking case like

						```js
						return class
						{};
						```
				*/
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

			return {
				node,
				loc: getClassHeadLocation(node, sourceCode),
				messageId: MESSAGE_ID,
				fix: switchClassToObject(node, sourceCode),
			};
		},
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Forbid classes that only have static members.',
		},
		fixable: 'code',
		messages,
	},
};
