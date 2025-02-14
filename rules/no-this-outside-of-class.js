const MESSAGE_ID = 'no-this-outside-of-class';
const messages = {
	[MESSAGE_ID]: 'Disallow `this` outside of class scope.',
};

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => {
	const {sourceCode} = context;

	const allowedScopes = new Set(['global', 'module', 'class', 'class-field-initializer']);

	return {
		ThisExpression(node) {
			const scope = sourceCode.getScope(node);

			if (allowedScopes.has(scope.type)) {
				return;
			}

			// The constructor/method of a class
			if (scope.type === 'function' && scope.upper?.type === 'class' && scope.block.parent.type === 'MethodDefinition') {
				return;
			}

			/** @type {import('eslint').Rule.ReportDescriptor} */
			const problem = {
				node,
				messageId: MESSAGE_ID,
			};

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `this` in non-class scope',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
