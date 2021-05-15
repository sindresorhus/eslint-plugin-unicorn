'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const quoteString = require('./utils/quote-string');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');
const shouldAddParenthesesToLogicalExpressionChild = require('./utils/should-add-parentheses-to-logical-expression-child');
const {getParenthesizedText} = require('./utils/parentheses');

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const SUGGEST_STRING_CAST = 'useStringCasting';
const SUGGEST_OPTIONAL_CHAINING = 'useOptionalChaining';
const SUGGEST_NULLISH_COALESCING = 'useNullishCoalescing';
const SUGGESTIONS = [SUGGEST_STRING_CAST, SUGGEST_OPTIONAL_CHAINING, SUGGEST_NULLISH_COALESCING];
const messages = {
	[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
	[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.',
	[SUGGEST_STRING_CAST]: 'When testing against a value that may not be a string, use string casting.',
	[SUGGEST_OPTIONAL_CHAINING]: 'When testing against a value that may not be a string, use optional chaining.',
	[SUGGEST_NULLISH_COALESCING]: 'When testing against a value that may not be a string, use nullish coalescing.'
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
					if (shouldAddParenthesesToLogicalExpressionChild(target, sourceCode)) {
						targetString = `(${targetString})`;
					}

					targetString += ' ?? \'\'';
					if (!isRegexParenthesized) {
						targetString = `(${targetString})`;
					}
				} else if (useStringCasting) {
					// String(target).startsWith(pattern)
					targetString = (isTargetParenthesized ? getParenthesizedText(target, sourceCode) : `(${targetString})`);
					if (target.type === 'SequenceExpression') {
						targetString = `(${targetString})`;
					}

					targetString = 'String' + targetString;
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
				yield fixer.replaceText(target, quoteString(result.string));
			}

			context.report({
				node,
				messageId: result.messageId,
				suggest: SUGGESTIONS.map(type => ({messageId: type, fix: fixer => fix(fixer, {[type]: true})})),
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
		fixable: 'code',
		schema: [],
		messages
	}
};
