import {
	getStaticValue as getStaticValueFromEslintUtilities,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

export const isBranchExpression = node => {
	node = unwrapTypeScriptExpression(node);
	while (node.type === 'UnaryExpression') {
		node = unwrapTypeScriptExpression(node.argument);
	}

	return node.type === 'ConditionalExpression' || node.type === 'LogicalExpression';
};

/**
Get the static value of a node only when evaluating it has no side effects, including getter-backed member reads.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {object | undefined}
*/
export default function getStaticValueIfNoSideEffects(node, context) {
	node = unwrapTypeScriptExpression(node);
	const {sourceCode} = context;
	if (hasSideEffect(node, sourceCode, {considerGetters: true})) {
		return;
	}

	return getStaticValueFromEslintUtilities(node, sourceCode.getScope(node)) ?? undefined;
}
