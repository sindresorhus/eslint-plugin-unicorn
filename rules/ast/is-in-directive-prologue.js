import isDirective from './is-directive.js';
import isFunction from './is-function.js';

/**
Check if an expression is in the directive prologue position, that is, the expression of a statement at the start of a script, module, or function body, where only directives come before it. Changing a string literal there into something else (or the other way around) can add or remove a directive like `'use strict'`.

@param {import('estree').Node} node
@returns {boolean}
*/
export default function isInDirectivePrologue(node) {
	const {parent} = node;
	if (parent?.type !== 'ExpressionStatement' || parent.expression !== node) {
		return false;
	}

	const body = parent.parent;
	if (
		body.type !== 'Program'
		&& !(body.type === 'BlockStatement' && isFunction(body.parent))
	) {
		return false;
	}

	return body.body
		.slice(0, body.body.indexOf(parent))
		.every(statement => isDirective(statement));
}
