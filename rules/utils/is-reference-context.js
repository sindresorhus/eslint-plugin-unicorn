import {getOutermostTypeScriptExpression} from './unwrap-typescript-expression.js';

/**
Check whether replacing an expression with a reference could change its meaning in a call, tagged template, or `delete` expression.

@param {import('estree').Node} node
@returns {boolean}
*/
export default function isReferenceContext(node) {
	// `(true && obj.method)()` calls the method with `this` undefined, but `(obj.method)()` would pass `obj` as `this`. `delete` also needs a reference, so the result is not a plain value in these positions.
	// TypeScript wrappers like `(true && obj.method)!()` are removed at runtime, so check the position of the outermost one.
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;
	return (parent.type === 'CallExpression' && parent.callee === expression)
		|| (parent.type === 'TaggedTemplateExpression' && parent.tag === expression)
		|| (parent.type === 'UnaryExpression' && parent.operator === 'delete');
}
