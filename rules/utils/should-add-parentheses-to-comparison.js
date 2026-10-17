import getPrecedence from './get-precedence.js';
import {isParenthesized} from './parentheses/parentheses.js';

/**
Check whether replacing `node` with a comparison needs parentheses in its surrounding expression.

A comparison can bind more loosely than the expression it replaces, for example when changing `instanceof Function` to `typeof … === 'function'`.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@param {string} operator - The replacement comparison operator.
@returns {boolean}
*/
export default function shouldAddParenthesesToComparison(node, context, operator) {
	if (isParenthesized(node, context)) {
		return false;
	}

	const {parent} = node;

	switch (parent.type) {
		// `(foo.length > 0).x`
		case 'MemberExpression': {
			return parent.object === node;
		}

		// `(foo.length > 0)()`, `new (foo.length > 0)()`
		case 'CallExpression':
		case 'NewExpression': {
			return parent.callee === node;
		}

		// `(foo.length > 0)\`x\``
		case 'TaggedTemplateExpression': {
			return parent.tag === node;
		}

		// `bar === (foo.length === 0)`, `bar + (foo.length > 0)`, `(foo.length > 0) ** 2`
		case 'BinaryExpression':
		case 'TSAsExpression':
		case 'TSSatisfiesExpression': {
			const precedence = getPrecedence({type: 'BinaryExpression', operator});
			const parentPrecedence = getPrecedence(parent);
			return parentPrecedence > precedence
				|| (parentPrecedence === precedence && parent.type === 'BinaryExpression' && parent.right === node);
		}

		// `typeof (foo.length > 0)`, `await (foo.length > 0)`, `(foo.length > 0)!`
		case 'AwaitExpression':
		case 'TSNonNullExpression':
		case 'TSTypeAssertion':
		case 'UnaryExpression': {
			return true;
		}

		default: {
			return false;
		}
	}
}
