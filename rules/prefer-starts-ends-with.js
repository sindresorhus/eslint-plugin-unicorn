'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';

const doesNotContain = (string, characters) => characters.every(character => !string.includes(character));

const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*']
);

const regexTestSelector = [
	methodSelector({name: 'test', length: 1}),
	'[callee.object.regex]'
].join('');

const stringMatchSelector = [
	methodSelector({name: 'match', length: 1}),
	'[arguments.0.regex]'
]

const checkRegex = ({pattern, flags}) => {
	if (flags.includes('i')) {
		return;
	}

	if (pattern.startsWith('^')) {
		const string = pattern.slice(1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_STARTS_WITH,
				string,
			}
		}
	}

	if (pattern.endsWith('$')) {
		const string = pattern.slice(0, -1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_ENDS_WITH,
				string,
			}
		}
	}
}

const create = context => {
	return {
		[regexTestSelector](node) {
			const {regex} = node.callee.object;
			const result = checkRegex(regex);
			if (!result) {
				return;
			}
			context.report({
				node,
				messageId: result.messageId
			});
		},
		[stringMatchSelector](node) {
			const {regex} = node.arguments[0];
			const result = checkRegex(regex);
			if (!result) {
				return;
			}
			context.report({
				node,
				messageId: result.messageId
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
		messages: {
			[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
			[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.'
		}
	},
	fixable: 'code'
};
