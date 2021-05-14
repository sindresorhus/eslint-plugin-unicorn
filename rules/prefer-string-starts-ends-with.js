'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const quoteString = require('./utils/quote-string');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');
const getParenthesizedText = require('./utils/get-parenthesized-text');

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const SUGGEST_STRING_CAST = 'suggest-string-cast';
const SUGGEST_OPTIONAL_CHAINING = 'suggest-optional-chaining';
const SUGGEST_NULLISH_COALESCING = 'suggest-nullish-coalescing';
const messages = {
	[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
	[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.',
	[SUGGEST_STRING_CAST]: 'For strings that may be `undefined` / `null`, use string casting.',
	[SUGGEST_OPTIONAL_CHAINING]: 'For strings that may be `undefined` / `null`, use optional chaining.',
	[SUGGEST_NULLISH_COALESCING]: 'For strings that may be `undefined` / `null`, use nullish coalescing.'
};

const doesNotContain = (string, characters) => characters.every(character => !string.includes(character));

const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*', '|']
);

const regexTestSelector = [
	methodSelector({name: 'test', length: 1}),
	'[callee.object.regex]'
].join('');

const checkRegex = ({pattern, flags}) => {
	if (flags.includes('i') || flags.includes('m')) {
		return;
	}

	if (pattern.startsWith('^')) {
		const string = pattern.slice(1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_STARTS_WITH,
				string
			};
		}
	}

	if (pattern.endsWith('$')) {
		const string = pattern.slice(0, -1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_ENDS_WITH,
				string
			};
		}
	}
};

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[regexTestSelector](node) {
			const regexNode = node.callee.object;
			const {regex} = regexNode;
			const result = checkRegex(regex);
			if (!result) {
				return;
			}

			function * fix(fixer, {useNullishCoalescing, useOptionalChaining, useStringCasting} = {}) {
				const method = result.messageId === MESSAGE_STARTS_WITH ? 'startsWith' : 'endsWith';
				const [target] = node.arguments;
				let targetString = sourceCode.getText(target);
				const isRegexParenthesized = isParenthesized(regexNode, sourceCode);
				const isTargetParenthesized = isParenthesized(target, sourceCode);

				if (useNullishCoalescing) {
					// (target ?? '').startsWith(pattern)
					targetString = targetString + ' ?? \'\'';
					if (!isRegexParenthesized) {
						targetString = `(${targetString})`;
					}
				} else if (useStringCasting) {
					// String(target).startsWith(pattern)
					targetString = 'String' + (isTargetParenthesized ? getParenthesizedText(target, sourceCode) : `(${targetString})`);
				} else if (!isRegexParenthesized && (isTargetParenthesized || shouldAddParenthesesToMemberExpressionObject(target, sourceCode))) {
					targetString = `(${targetString})`;
				}

				// The regex literal always starts with `/` or `(`, so we don't need check ASI

				// Replace regex with string
				yield fixer.replaceText(regexNode, targetString);

				// `.test` => `.startsWith` / `.endsWith`
				yield fixer.replaceText(node.callee.property, method);

				// Optional chaining: target.startsWith => target?.startsWith
				if (useOptionalChaining) {
					yield fixer.replaceText(sourceCode.getTokenBefore(node.callee.property), '?.');
				}

				// Replace argument with result.string
				yield fixer.replaceText(target, quoteString(result.string))
			}

			context.report({
				node,
				messageId: result.messageId,
				suggest: [
					{
						messageId: SUGGEST_STRING_CAST,
						fix: fixer => fix(fixer, {useStringCasting: true})
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						fix: fixer => fix(fixer, {useOptionalChaining: true})
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						fix: fixer => fix(fixer, {useNullishCoalescing: true})
					}
				],
				fix
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`.',
			url: getDocumentationUrl(__filename),
			suggest: true
		},
		messages,
		fixable: 'code',
		schema: []
	}
};
