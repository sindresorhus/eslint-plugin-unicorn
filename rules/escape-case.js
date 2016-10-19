const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			const match = node.raw.match(/\\(x[a-f0-9]{2})|(u[a-f0-9]{4})|(u\{([0-9a-f]{1,})\})|(c[a-z])/);

			if (match) {
				context.report({
					node,
					message: 'Use uppercase characters for escape sequences'
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {}
};
