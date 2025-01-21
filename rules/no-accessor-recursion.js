const MESSAGE_ID_ERROR = 'no-accessor-recursion/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Disallow recursive access to `this` within getters and setters.',
};

/** @param {import('eslint').Scope.Scope} scope */
const isArrowFunctionScope = scope => scope.type === 'function' && scope.block.type === 'ArrowFunctionExpression';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const functionExpressionStack = [];

	return {
		// Getter for object literal
		'Property[kind="get"]'(node) {
			functionExpressionStack.push(node);
		},
		'Property[kind="get"]:exit'() {
			functionExpressionStack.pop();
		},
		// Setter for object literal
		'Property[kind="set"]'(node) {
			functionExpressionStack.push(node);
		},
		'Property[kind="set"]:exit'() {
			functionExpressionStack.pop();
		},
		// Getter for class
		'MethodDefinition[kind="get"]'(node) {
			functionExpressionStack.push(node);
		},
		'MethodDefinition[kind="get"]:exit'() {
			functionExpressionStack.pop();
		},
		// Setter for class
		'MethodDefinition[kind="set"]'(node) {
			functionExpressionStack.push(node);
		},
		'MethodDefinition[kind="set"]:exit'() {
			functionExpressionStack.pop();
		},
		ThisExpression(node) {
			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = functionExpressionStack.at(-1);

			if (!property) {
				return;
			}

			let scope = context.sourceCode.getScope(node);

			while (scope.type !== 'function' || isArrowFunctionScope(scope)) {
				scope = scope.upper;
			}

			// Check if `this` is in the current function expression scope
			if (scope.block === property.value) {
				/** @type {import('estree').MemberExpression} */
				const {parent} = node;

				const isThisAccessed = () => parent.type === 'MemberExpression' && !parent.computed && parent.property.type === 'Identifier' && parent.property.name === property.key.name;

				switch (property.kind) {
					case 'get': {
						if (isThisAccessed()) {
							return {node: parent, messageId: MESSAGE_ID_ERROR};
						}

						break;
					}

					case 'set': {
						if (isThisAccessed() && parent.parent.type === 'AssignmentExpression') {
							return {node: parent.parent, messageId: MESSAGE_ID_ERROR};
						}

						break;
					}

					default:
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow recursive access to `this` within getters and setters.',
			recommended: true,
		},
		defaultOptions: [],
		messages,
	},
};

export default config;
