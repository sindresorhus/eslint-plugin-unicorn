'use strict';
const inferMethod = args => (args.length > 0 && typeof args[0].value === 'number') ? 'alloc' : 'from';

const create = context => {
	return {
		NewExpression: node => {
			if (node.callee.name === 'Buffer') {
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
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
