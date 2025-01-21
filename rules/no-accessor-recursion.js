const MESSAGE_ID_ERROR = 'no-accessor-recursion/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Disallow recursive access to `this` within getters and setters.',
};

/** @param {import('eslint').Scope.Scope} scope */
const isArrowFunctionScope = scope => scope.type === 'function' && scope.block.type === 'ArrowFunctionExpression';

/**
Get the closest non-arrow function scope.

@param {import('eslint').SourceCode} sourceCode
@param {import('estree').Node} node
*/
const getClosestFunctionScope = (sourceCode, node) => {
	let scope = sourceCode.getScope(node);
	while (scope.type !== 'function' || isArrowFunctionScope(scope)) {
		if (scope.upper === null) {
			return;
		}

		scope = scope.upper;
	}

	return scope;
};

const isDotNotationAccess = node => node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').ThisExpression} node */
		ThisExpression(node) {
			const scope = getClosestFunctionScope(sourceCode, node);

			if (!scope) {
				return;
			}

			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = scope.block.parent;

			if (!['Property', 'MethodDefinition'].includes(property.type) || property.key.type !== 'Identifier') {
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
