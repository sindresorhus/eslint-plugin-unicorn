'use strict';
const cleanRegexp = require('clean-regexp');

const message = 'Use regex shorthands to improve readability.';

const create = context => {
	return {
		'Literal[regex]': node => {
			const oldPattern = node.regex.pattern;
			const flags = node.regex.flags;

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange(node.range, `/${newPattern}/${flags}`)
				});
			}
		},
		'NewExpression[callee.name="RegExp"]': node => {
			const args = node.arguments;

			if (args.length === 0 || args[0].type !== 'Literal') {
				return;
			}

			const oldPattern = args[0].value;
			const flags = args[1] && args[1].type === 'Literal' ? args[1].value : '';

			const newPattern = cleanRegexp(oldPattern, flags);

			if (oldPattern !== newPattern) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange(args[0].range, `'${newPattern}'`)
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
