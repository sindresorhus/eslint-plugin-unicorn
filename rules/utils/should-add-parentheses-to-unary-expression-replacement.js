import {isParenthesized} from './parentheses/parentheses.js';
import {getOutermostTypeScriptExpression} from './unwrap-typescript-expression.js';

const erasedAssertionTypes = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion']);

/**
Check whether replacing `node` with a unary expression needs grouping in its surrounding expression.
*/
export default function shouldAddParenthesesToUnaryExpressionReplacement(node, context) {
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;
	const isExponentiationLeftOperand = parent.type === 'BinaryExpression' && parent.operator === '**' && parent.left === expression;

	for (let current = node; ; current = current.parent) {
		// TypeScript drops parentheses around erased assertions before `**`, so those do not protect a generated unary operand.
		if (isParenthesized(current, context) && (!isExponentiationLeftOperand || !erasedAssertionTypes.has(current.type))) {
			return false;
		}

		if (current === expression) {
			break;
		}
	}

	return isExponentiationLeftOperand
		|| (parent.type === 'MemberExpression' && parent.object === expression)
		|| ((parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.callee === expression)
		|| (parent.type === 'TaggedTemplateExpression' && parent.tag === expression)
		// `!expr` is not a `LeftHandSideExpression`, so it cannot be a `superClass` either
		|| ((parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') && parent.superClass === expression);
}
