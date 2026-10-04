import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
Get the destructuring pattern (`ObjectPattern` or `ArrayPattern`) that directly contains a pattern node, looking through defaults (`a = 1`), rest elements (`...a`), object pattern properties, and TypeScript expression wrappers.

@param {import('estree').Node} node
@returns {import('estree').ObjectPattern | import('estree').ArrayPattern | undefined}
*/
export default function getParentPattern(node) {
	const {parent} = node;

	if (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'AssignmentPattern'
		&& parent.left === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'RestElement'
		&& parent.argument === node
	) {
		return getParentPattern(parent);
	}

	if (
		parent.type === 'Property'
		&& parent.value === node
		&& parent.parent.type === 'ObjectPattern'
	) {
		return parent.parent;
	}

	if (
		parent.type === 'ObjectPattern'
		|| parent.type === 'ArrayPattern'
	) {
		return parent;
	}
}
