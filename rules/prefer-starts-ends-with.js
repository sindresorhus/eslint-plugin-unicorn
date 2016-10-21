'use strict';
const doesNotContain = (string, chars) => chars.every(char => !string.includes(char));

const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*']
);

const create = context => {
	return {
		CallExpression(node) {
			const callee = node.callee;
			const args = node.arguments;

			let pattern;
			if (callee.property.name === 'test' && callee.object.regex) {
				pattern = callee.object.regex.pattern;
			} else if (callee.property.name === 'match' && args && args[0] && args[0].regex) {
				pattern = args[0].regex.pattern;
			} else {
				return;
			}

			if (pattern.startsWith('^') && isSimpleString(pattern.substr(1))) {
				context.report({
					node,
					message: 'Prefer `.startsWith` over regex with `^`.'
				});
			} else if (pattern.endsWith('$') && isSimpleString(pattern.substr(0, pattern.length - 1))) {
				context.report({
					node,
					message: 'Prefer `.endsWith` over regex with `$`.'
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {}
};

