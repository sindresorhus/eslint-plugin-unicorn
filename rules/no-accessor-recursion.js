const MESSAGE_ID_ERROR = 'no-accessor-recursion/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Disallow recursive access to `this` within getters and setters.',
};

/** @param {import('eslint').Scope.Scope} scope */
const isArrowFunctionScope = scope => scope.type === 'function' && scope.block.type === 'ArrowFunctionExpression';

/**
Get the closest non-arrow function scope.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} node
*/
const getClosestFunctionScope = (context, node) => {
	let scope = context.sourceCode.getScope(node);
	while (scope.type !== 'function' || isArrowFunctionScope(scope)) {
		if (scope.upper === null) {
			return scope;
		}

		scope = scope.upper;
	}

	return scope;
};

const isDotNotationAccess = node => node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const functionExpressionStack = [];

	return {
		...Object.fromEntries(
			['Property', 'MethodDefinition'].flatMap(nodeName =>
				['get', 'set'].flatMap(kind => [
					[`${nodeName}[kind="${kind}"]`, node => {
						functionExpressionStack.push(node);
					}],
					[`${nodeName}[kind="${kind}"]:exit`, () => {
						functionExpressionStack.pop();
					}],
				]),
			),
		),
		/** @param {import('estree').ThisExpression} node */
		ThisExpression(node) {
			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = functionExpressionStack.at(-1);

			if (!property) {
				return;
			}

			const scope = getClosestFunctionScope(context, node);

			// Check if `this` is in the current function expression scope
			if (scope.block !== property.value) {
				return;
			}

			/** @type {import('estree').MemberExpression} */
			const {parent} = node;

			// Check if `this` is accessed via dot notation
			if (!isDotNotationAccess(parent) || parent.property.name !== property.key.name) {
				return;
			}

			if (property.kind === 'get') {
				return {node: parent, messageId: MESSAGE_ID_ERROR};
			}

			if (property.kind === 'set' && parent.parent.type === 'AssignmentExpression' && parent.parent.left === parent) {
				return {node: parent.parent, messageId: MESSAGE_ID_ERROR};
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
