import {hasSideEffect} from '@eslint-community/eslint-utils';
import containsNode from './contains-node.js';

/**
Check whether evaluating a node can have a side effect.

Same as `hasSideEffect()` from `@eslint-community/eslint-utils`, but also treats tagged templates and spread elements as side effects. `hasSideEffect()` misses them, but a tagged template calls its tag, and a spread element runs an iterator or getters.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function hasPossibleSideEffect(node, context) {
	return hasSideEffect(node, context.sourceCode)
		|| containsNode(node, context, childNode => childNode.type === 'TaggedTemplateExpression' || childNode.type === 'SpreadElement');
}
