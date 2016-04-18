'use strict';
module.exports = function (context) {
	var startsWithHashBang = context.getSourceCode().lines[0].indexOf('#!') === 0;

	if (startsWithHashBang) {
		return {};
	}

	return {
		CallExpression: function (node) {
			var callee = node.callee;

			if (callee.type === 'MemberExpression' && callee.object.name === 'process' && callee.property.name === 'exit') {
				context.report({
					node: node,
					message: 'Only use `process.exit()` in CLI apps. Throw an error instead.'
				});
			}
		}
	};
};
