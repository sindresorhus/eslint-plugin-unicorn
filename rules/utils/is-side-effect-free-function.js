import hasPossibleSideEffect from './has-possible-side-effect.js';

/**
Check whether `node` is an inline function whose parameters and body have no side effects.

Calling such a callback more or fewer times, or in a different order, can not change the result, so a fix that changes how often a callback is called is safe for it.

@param {import('estree').Node | undefined} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isSideEffectFreeFunction(node, context) {
	return (node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression')
		&& [...node.params, node.body].every(child => !hasPossibleSideEffect(child, context));
}
