'use strict';

const create = context => {
	return {
		Identifier: node => {
			if (['substr', 'substring'].indexOf(node.name) > -1) {
				const args = node.parent.parent.arguments;
				console.dir(args[0].type);
				context.report({
					node,
					message: `Use \`String.slice\` instead of \`String.${node.name}\`.`
				});
			}
		}
	};
};

module.exports = {
	create
};
