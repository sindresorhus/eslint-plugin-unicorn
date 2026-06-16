/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
*/

// Primary and left-hand-side expressions bind tighter than any operator, so they never need parentheses when substituted into a surrounding expression.
const strongPrecedenceNodeTypes = new Set([
	'ArrayExpression',
	'CallExpression',
	'ChainExpression',
	'Identifier',
	'ImportExpression',
	'Literal',
	'MemberExpression',
	'NewExpression',
	'Super',
	'TaggedTemplateExpression',
	'TemplateLiteral',
	'ThisExpression',
	'TSNonNullExpression',
]);

/**
Check if `node` binds tightly enough that it can be substituted into any expression position without parentheses.

Note that `ObjectExpression` is intentionally excluded, since a bare object literal needs parentheses both at the start of a statement and as the object of a member expression.

@param {ESTree.Node} node
@returns {boolean}
*/
export default function isStrongPrecedenceNode(node) {
	return strongPrecedenceNodeTypes.has(node.type);
}
