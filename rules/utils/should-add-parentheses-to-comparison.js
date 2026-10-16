import {isParenthesized} from './parentheses/parentheses.js';

/**
Check whether replacing `node` with a comparison needs parentheses in its surrounding expression.

A comparison like `foo.length > 0` binds looser than the `!foo.length` or `Boolean(foo.length)` it replaces, so it needs parentheses wherever the replaced expression needed them.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function shouldAddParenthesesToComparison(node, context) {
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

		// `typeof (foo.length > 0)`, `await (foo.length > 0)`, `(foo.length > 0)!`
		// `bar === (foo.length > 0)`, `bar + (foo.length > 0)`, `(foo.length > 0) ** 2`
		case 'AwaitExpression':
		case 'BinaryExpression':
		case 'TSAsExpression':
		case 'TSNonNullExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'UnaryExpression': {
			return true;
		}

		default: {
			return false;
		}
	}
}
