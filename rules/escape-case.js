const create = context => ({
	VariableDeclaration: node => {
		console.log(node);
		const arg = node.argument;
		const error = arg.callee;

		if (arg.type === 'CallExpression' && errorTypes.indexOf(error.name) !== -1) {
			context.report({
				node,
				message: 'Use uppercase characters for escape sequences.',
				// fix: fixer => fixer.insertTextBefore(error, 'new ')
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		// fixable: 'code'
	}
};
