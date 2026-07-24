import {isKnownNonIndexedCollection} from './is-array.js';

const directlyReportableReceiverTypes = new Set([
	'ArrayExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
]);

/**
Check if an array rule should skip a method call because its receiver is known not to be an array, for example a `Set` or a custom type that happens to declare a same-named method.

A typed array receiver is still reported, since it shares most of `Array`'s method surface. The methods it does lack (`push()`, `splice()`, `flat()`, …) are not on its prototype at all, so a call that a rule for one of them would report is already broken, and reporting it costs nothing. A rule where a typed array must not be reported should call `isKnownNonArray` instead, as `require-array-sort-compare` does, because `TypedArray#sort()` already sorts numerically.

Receivers written as a literal, array, object, function, or template are still reported, since the mismatch is visible at the call site.

Any `new Foo()` receiver other than `new Array()` counts as a non-array, so a class that extends `Array` is skipped. That is deliberate and out of scope, not a bug to fix.

@param {import('estree').Node} node The receiver of the method call.
@param {import('eslint').Rule.RuleContext} context
@returns {boolean} `true` if the call should not be reported.
*/
export default function shouldSkipKnownNonArrayReceiver(node, context) {
	return !directlyReportableReceiverTypes.has(node.type) && isKnownNonIndexedCollection(node, context);
}
