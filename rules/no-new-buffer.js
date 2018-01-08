'use strict';
const inferMethod = args => (args.length > 0 && typeof args[0].value === 'number') ? 'alloc' : 'from';

const create = context => {
	return {
		'NewExpression[callee.name="Buffer"]': node => {
			const method = inferMethod(node.arguments);
			const range = [
				node.start,
				node.callee.end
			];

			context.report({
				node,
				message: `\`new Buffer()\` is deprecated, use \`Buffer.${method}()\` instead.`,
				fix: fixer => fixer.replaceTextRange(range, `Buffer.${method}`)
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/docs/rules/no-new-buffer.md'
		},
		fixable: 'code'
	}
};
