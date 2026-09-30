import {findVariable, isSemicolonToken} from '@eslint-community/eslint-utils';
import getClassHeadLocation from './utils/get-class-head-location.js';
import assertToken from './utils/assert-token.js';
import {removeSpacesAfter} from './fix/index.js';
import {needsSemicolon} from './utils/index.js';

const MESSAGE_ID = 'no-static-only-class';
const messages = {
	[MESSAGE_ID]: 'Use an object instead of a class with only static members.',
};

const isEqualToken = ({type, value}) => type === 'Punctuator' && value === '=';
// Keywords that only mean something inside a class, so they cannot survive the move to an object literal
const classOnlyKeywords = ['this', 'super', 'new.target'];
const isDeclarationOfExportDefaultDeclaration = node =>
	node.type === 'ClassDeclaration'
	&& node.parent.type === 'ExportDefaultDeclaration'
	&& node.parent.declaration === node;

const isPropertyDefinition = node => node.type === 'PropertyDefinition';
const isMethodDefinition = node => node.type === 'MethodDefinition';

function isStaticMember(node) {
	const {
		private: isPrivate,
		static: isStatic,
		declare: isDeclare,
		readonly: isReadonly,
		override: isOverride,
		accessibility,
		decorators,
		key,
	} = node;

	// Avoid matching unexpected node. For example: https://github.com/tc39/proposal-class-static-block
	if (!isPropertyDefinition(node) && !isMethodDefinition(node)) {
		return false;
	}

	if (!isStatic || isPrivate || key.type === 'PrivateIdentifier') {
		return false;
	}

	// TypeScript class
	return !(isDeclare
		|| isReadonly
		// An `override` member needs its base class, and an object literal has no `override` modifier
		|| isOverride
		|| accessibility !== undefined
		|| (Array.isArray(decorators) && decorators.length > 0));
}

function * switchClassMemberToObjectProperty(node, context, fixer) {
	const {sourceCode} = context;
	const staticToken = sourceCode.getFirstToken(node);
	assertToken(staticToken, {
		expected: {type: 'Keyword', value: 'static'},
		ruleId: 'no-static-only-class',
	});

	yield fixer.remove(staticToken);
	yield removeSpacesAfter(staticToken, context, fixer);

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

const referencesClassName = (value, id, context) => {
	if (!id) {
		return false;
	}

	const {sourceCode} = context;
	const variable = findVariable(sourceCode.getScope(id), id);

	if (!variable) {
		return false;
	}

	const [start, end] = sourceCode.getRange(value);
	return variable.references.some(({identifier}) => {
		const [referenceStart, referenceEnd] = sourceCode.getRange(identifier);
		return referenceStart >= start && referenceEnd <= end;
	});
};

function switchClassToObject(node, context) {
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

	const {sourceCode} = context;
	for (const member of body.body) {
		// A computed key is evaluated while the class is being created, where the class binding is initialized, but the `const` the class becomes is still in its temporal dead zone
		if (referencesClassName(member.key, id, context)) {
			return;
		}

		// This is a stupid way to check if the initializer of a `PropertyDefinition` uses `this`, `super` or `new.target`, which only exist in a class context
		const valueText = member.value && sourceCode.getText(member.value);
		const usesClassOnlyKeyword = Boolean(valueText) && classOnlyKeywords.some(keyword => valueText.includes(keyword));

		if (
			isPropertyDefinition(member)
			&& (
				member.typeAnnotation
				|| usesClassOnlyKeyword
				// A static field initializer runs after the class binding is initialized, but the `const` the class becomes is still in its temporal dead zone while it runs
				|| referencesClassName(member, id, context)
			)
		) {
			return;
		}
	}

	return function * (fixer) {
		const classToken = sourceCode.getFirstToken(node);
		/* c8 ignore next */
		assertToken(classToken, {
			expected: {type: 'Keyword', value: 'class'},
			ruleId: 'no-static-only-class',
		});

		if (isExportDefault || type === 'ClassExpression') {
			// A concise arrow body is an `AssignmentExpression`, so a bare `{` there would be parsed as a block body: `() => class {}` has to become `() => ({})`, and `() => class {}.a` has to become `() => ({}).a`.
			const isConciseArrowBody = sourceCode.getTokenBefore(classToken).value === '=>';

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
				&& sourceCode.getLoc(body).start.line !== sourceCode.getLoc(parent).start.line
				&& sourceCode.text.slice(sourceCode.getRange(classToken)[1], sourceCode.getRange(body)[0]).trim()
			) {
				yield fixer.replaceText(classToken, '{');

				const openingBraceToken = sourceCode.getFirstToken(body);
				yield fixer.remove(openingBraceToken);
			} else {
				yield fixer.replaceText(classToken, isConciseArrowBody ? '(' : '');

				/*
						Avoid breaking case like

						```js
						return class
						{};
						```
				*/
				yield removeSpacesAfter(classToken, context, fixer);
			}

			if (isConciseArrowBody) {
				yield fixer.insertTextAfter(body, ')');
			}

			// `export default {…}` is an expression, a following `(`, `[`, `` ` ``, `+`, `-` or `/` would continue it instead of starting a new statement.
			if (isExportDefault) {
				const lastToken = sourceCode.getLastToken(node);
				const tokenAfter = sourceCode.getTokenAfter(lastToken);
				if (needsSemicolon(lastToken, context, tokenAfter?.value ?? '')) {
					yield fixer.insertTextAfter(lastToken, ';');
				}
			}
		} else {
			yield fixer.replaceText(classToken, 'const');
			yield fixer.insertTextBefore(body, '= ');
			yield fixer.insertTextAfter(body, ';');
		}

		for (const node of body.body) {
			yield switchClassMemberToObjectProperty(node, context, fixer);
		}
	};
}

function create(context) {
	context.on(['ClassDeclaration', 'ClassExpression'], node => {
		if (
			node.superClass
			|| (node.decorators && node.decorators.length > 0)
			|| node.body.type !== 'ClassBody'
			|| node.body.body.length === 0
			|| node.body.body.some(node => !isStaticMember(node))
		) {
			return;
		}

		return {
			node,
			loc: getClassHeadLocation(node, context),
			messageId: MESSAGE_ID,
			fix: switchClassToObject(node, context),
		};
	});
}

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow classes that only have static members.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
