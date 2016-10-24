'use strict';

const create = context => {
	return {
		Identifier: node => {
			const name = node.name;

			if (name === 'substr' || name === 'substring') {
				context.report({
					node,
					message: `Use \`String.slice\` instead of \`String.${name}\`.`
				});
			}
		}
	};
};

module.exports = {
	create
};
