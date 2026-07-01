/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
*/

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
// Copied from https://github.com/eslint/eslint/blob/b23015955c8d6e6516076190730f538c86927f26/lib/rules/utils/ast-utils.js#L1879-L1971
// and extended with TypeScript node types, following https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/util/getOperatorPrecedence.ts

const logicalOperatorPrecedence = {
	'??': 4,
	'||': 4,
	'&&': 5,
};

const binaryOperatorPrecedence = {
	'|': 6,
	'^': 7,
	'&': 8,
	'==': 9,
	'!=': 9,
	'===': 9,
	'!==': 9,
	'<': 10,
	'<=': 10,
	'>': 10,
	'>=': 10,
	in: 10,
	instanceof: 10,
	'<<': 11,
	'>>': 11,
	'>>>': 11,
	'+': 12,
	'-': 12,
	'*': 13,
	'/': 13,
	'%': 13,
	'**': 15,
};

// Precedence boundaries the `should-add-parentheses-to-*` helpers compare against. Exported so those
// callers can name the boundary instead of hardcoding a bare number that only makes sense against the
// table below.
// `UnaryExpression`, `AwaitExpression`, `TSTypeAssertion`, `TSNonNullExpression`, prefix `UpdateExpression`.
export const PRECEDENCE_UNARY = 16;
// `CallExpression`, `ChainExpression`, `ImportExpression`.
export const PRECEDENCE_CALL = 18;

/**
Get the operator precedence level of a given node. A higher number binds tighter.

This only covers node types that can appear as an operand of another expression (the kind of nodes these `should-add-parentheses-to-*` helpers compare against a surrounding operator); node types that can't (statements, patterns, etc) are not meaningful to compare and are not included.

This is only safe to use for a "is this operand's precedence lower than the precedence required by its new position" check (`getPrecedence(node) < requiredPrecedence`). It's not enough on its own to decide whether an operand needs parentheses *within a `BinaryExpression`/`LogicalExpression` of the same precedence class it already belongs to* - that also depends on associativity (`**` is right-associative, so `(a ** b) ** c` needs parentheses around the left operand even though both sides have the same precedence) and, for `LogicalExpression`, on whether `??` and `&&`/`||` are being mixed (a `SyntaxError` regardless of precedence, see `isMixedLogicalAndCoalesceExpressions` in ESLint's own `ast-utils.js`).

@param {ESTree.Node} node - The AST node to check.
@returns {number} The precedence level. Node types this function doesn't recognize (for example `Identifier`, `Literal`, or `MemberExpression`) get the highest level, since they never need to be parenthesized based on precedence alone.
*/
export default function getPrecedence(node) {
	switch (node.type) {
		case 'SequenceExpression': {
			return 0;
		}

		case 'AssignmentExpression':
		case 'ArrowFunctionExpression':
		case 'YieldExpression': {
			return 1;
		}

		case 'ConditionalExpression': {
			return 3;
		}

		case 'LogicalExpression': {
			return logicalOperatorPrecedence[node.operator];
		}

		case 'BinaryExpression': {
			return binaryOperatorPrecedence[node.operator];
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression': {
			return 10;
		}

		case 'UnaryExpression':
		case 'AwaitExpression':
		case 'TSTypeAssertion':
		case 'TSNonNullExpression': {
			return PRECEDENCE_UNARY;
		}

		case 'UpdateExpression': {
			return node.prefix ? PRECEDENCE_UNARY : 17;
		}

		case 'CallExpression':
		case 'ChainExpression':
		case 'ImportExpression': {
			return PRECEDENCE_CALL;
		}

		case 'NewExpression': {
			return 19;
		}

		default: {
			return 20;
		}
	}
}
