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

/** @param {import('estree').MemberExpression} node */
const isDotNotationAccess = node => node.type === 'MemberExpression' && !node.computed && (node.property.type === 'Identifier' || node.property.type === 'PrivateIdentifier');

/**
Check if a property is a valid getter or setter.

@param {import('estree').Node} property
*/
const isValidProperty = property =>
	['Property', 'MethodDefinition'].includes(property.type) && !property.computed && !property.static
	&& (property.key.type === 'Identifier' || property.key.type === 'PrivateIdentifier');

/**
Check if `this` is accessed recursively within a getter or setter.

@param {import('estree').MemberExpression} parent
@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isRecursiveAccess = (parent, property) => isDotNotationAccess(parent) && parent.property.name === property.key.name;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').ThisExpression} node */
		ThisExpression(thisExpression) {
			/** @type {import('estree').MemberExpression} */
			const {parent} = thisExpression;

			const scope = getClosestFunctionScope(sourceCode, thisExpression);

			if (!scope) {
				return;
			}

			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = scope.block.parent;

			if (!isValidProperty(property)) {
				return;
			}

			if (!isRecursiveAccess(parent, property)) {
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
