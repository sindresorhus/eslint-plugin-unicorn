const MESSAGE_ID_ERROR = 'no-accessor-recursion/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Disallow recursive access to `this` within getters and setters.',
};

/**
Get the closest non-arrow function scope.

@param {import('eslint').SourceCode} sourceCode
@param {import('estree').Node} node
@return {import('eslint').Scope.Scope | undefined}
*/
const getClosestFunctionScope = (sourceCode, node) => {
	for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
		if (scope.type === 'function' && scope.block.type !== 'ArrowFunctionExpression') {
			return scope;
		}
	}
};

const isDotNotationAccess = node =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& node.property.type === 'Identifier';
const isAccessor = node =>
	['Property', 'MethodDefinition'].includes(node.type)
	&& ['set', 'get'].includes(node.kind)
	&& !node.computed
	&& node.key.type === 'Identifier';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').ThisExpression} node */
		ThisExpression(thisExpression) {
			/** @type {import('estree').MemberExpression} */
			const {parent} = thisExpression;

			// Check if `this` is accessed via dot notation
			if (!isDotNotationAccess(parent)) {
				return;
			}

			const scope = getClosestFunctionScope(sourceCode, thisExpression);

			if (!scope) {
				return;
			}

			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = scope.block.parent;

			if (!isAccessor(property) || parent.property.name !== property.key.name) {
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
