'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const quoteString = require('./utils/quote-string');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const messages = {
	[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
	[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.'
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

			context.report({
				node,
				messageId: result.messageId,
				fix: fixer => {
					const method = result.messageId === MESSAGE_STARTS_WITH ? 'startsWith' : 'endsWith';
					const [target] = node.arguments;
					let targetString = sourceCode.getText(target);

					if (
						// If regex is parenthesized, we can use it, so we don't need add again
						!isParenthesized(regexNode, sourceCode) &&
						(isParenthesized(target, sourceCode) || shouldAddParenthesesToMemberExpressionObject(target, sourceCode))
					) {
						targetString = `(${targetString})`;
					}

					// The regex literal always starts with `/` or `(`, so we don't need check ASI

					return [
						// Replace regex with string
						fixer.replaceText(regexNode, targetString),
						// `.test` => `.startsWith` / `.endsWith`
						fixer.replaceText(node.callee.property, method),
						// Replace argument with result.string
						fixer.replaceText(target, quoteString(result.string))
					];
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code'
	}
};
