'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const doesNotContain = (string, characters) => characters.every(character => !string.includes(character));

const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*']
);

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;
			const {property} = callee;

			if (!(property && callee.type === 'MemberExpression')) {
				return;
			}

			const arguments_ = node.arguments;

			let regex;
			if (property.name === 'test' && callee.object.regex) {
				({regex} = callee.object);
			} else if (
				property.name === 'match' &&
				arguments_ &&
				arguments_[0] &&
				arguments_[0].regex
			) {
				({regex} = arguments_[0]);
			} else {
				return;
			}

			if (regex.flags && regex.flags.includes('i')) {
				return;
			}

			const {pattern} = regex;
			if (pattern.startsWith('^') && isSimpleString(pattern.slice(1))) {
				context.report({
					node,
					message: 'Prefer `String#startsWith()` over a regex with `^`.'
				});
			} else if (
				pattern.endsWith('$') &&
				isSimpleString(pattern.slice(0, -1))
			) {
				context.report({
					node,
					message: 'Prefer `String#endsWith()` over a regex with `$`.'
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		}
	}
};
