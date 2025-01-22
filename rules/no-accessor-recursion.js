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

@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isValidProperty = property =>
	['Property', 'MethodDefinition'].includes(property.type) && !property.computed && ['set', 'get'].includes(property.kind)
	&& (property.key.type === 'Identifier' || property.key.type === 'PrivateIdentifier');

/**
Check if two property keys are the same.

@param {import('estree').Property['key']} keyLeft
@param {import('estree').Property['key']} keyRight
*/
const isSameKey = (keyLeft, keyRight) => ['type', 'name'].every(key => keyLeft[key] === keyRight[key]);

/**
Check if `this` is accessed recursively within a getter or setter.

@param {import('estree').MemberExpression} parent
@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isRecursiveMemberAccess = (parent, property) => isDotNotationAccess(parent) && isSameKey(parent.property, property.key);

/**
Check if `this` is accessed recursively within a destructuring assignment.

@param {import('estree').VariableDeclarator} parent
@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isRecursiveDestructuringAccess = (parent, property) =>
	parent.type === 'VariableDeclarator'
	&& parent.id.type === 'ObjectPattern'
	&& parent.id.properties.some(declaratorProperty => declaratorProperty.type === 'Property' && !declaratorProperty.computed && isSameKey(declaratorProperty.key, property.key));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').ThisExpression} thisExpression */
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

			if (!isRecursiveMemberAccess(parent, property) && !isRecursiveDestructuringAccess(parent, property)) {
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
