'use strict';

const messages = {
	'switch-braces-expected': 'Expected braces in switch statement',
	'switch-braces-unexpected': 'Unexpected braces in switch statement'
};

const create = context => {
	const isBracesRequired = (context.options[0] || 'always') === 'always';
	const messageId = isBracesRequired ? 'switch-braces-expected' : 'switch-braces-unexpected';

	return {
		[`SwitchCase > *.consequent[type!="${isBracesRequired ? 'BlockStatement' : 'BreakStatement'}"]`]: node => {
			const fix = isBracesRequired
				? function * (fixer) {
					yield fixer.insertTextBefore(node, '{');
					yield fixer.insertTextAfter(node, '}');
				}
				: function* (fixer) {
					yield fixer.removeRange([node.range[0], node.range[0] + 1]);
					yield fixer.removeRange([node.range[1] - 1, node.range[1]]);
				};

			context.report({
				node,
				messageId,
				fix
			});
		}
	}
};

const schema = [{
	enum: ["always", "never"]
}];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce consistent brace style for `switch` statements.'
		},
		fixable: 'code',
		schema,
		messages
	}
};
