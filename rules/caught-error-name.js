'use strict';

module.exports = function (context) {
	var opts = context.options[0];
	var name = (opts && opts.name) || 'err';

	var stack = [];

	return {
		'CatchClause': function (node) {
			if (stack.length === 1) {
				stack[0] = true;
			}
			stack.push(stack.length > 0 || node.param.name === name);
		},
		'CatchClause:exit': function (node) {
			if (!stack.pop()) {
				context.report({
					node: node.param,
					message: 'The catch clause parameter should be named ' + name
				});
			}
		}
	};
};
