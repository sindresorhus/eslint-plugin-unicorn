'use strict';
module.exports = context => {
	const startsWithHashBang = context.getSourceCode().lines[0].indexOf('#!') === 0;

	if (startsWithHashBang) {
		return {};
	}

	return {
		CallExpression: node => {
			const callee = node.callee;

			if (callee.type === 'MemberExpression' && callee.object.name === 'process' && callee.property.name === 'exit') {
				context.report({
					node,
					message: 'Only use `process.exit()` in CLI apps. Throw an error instead.'
				});
			}
		}
	};
};
