'use strict';

const fix = value => {
	const results = /\\(x[a-f0-9]{2}|u[a-f0-9]{4}|u\{([0-9a-f]{1,})\}|c[a-z])/.exec(value);
	if (results) {
		const fixedEscape = results[0].slice(0, 2) + results[0].slice(2).toUpperCase();
		return value.slice(0, results.index) + fixedEscape + value.slice(results.index + results[0].length);
	}
	return value;
};

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			const match = node.raw.match(/\\(x[a-f0-9]{2}|u[a-f0-9]{4}|u\{([0-9a-f]{1,})\}|c[a-z])/);

			if (match) {
				context.report({
					node,
					message: 'Use uppercase characters for the value of the escape sequence',
					fix: fixer => fixer.replaceText(node, fix(node.raw))
				});
			}
		},

		TemplateLiteral(node) {
			node.quasis.forEach(element => {
				if (typeof element.value.raw !== 'string') {
					return;
				}

				const match = element.value.raw.match(/\\(x[a-f0-9]{2}|u[a-f0-9]{4}|u\{([0-9a-f]{1,})\}|c[a-z])/);

				if (match) {
					context.report({
						node,
						message: 'Use uppercase characters for the value of the escape sequence',
						fix: fixer => fixer.replaceText(node, '`' + fix(element.value.raw) + '`')
					});
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
