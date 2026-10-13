import {getPropertyName} from '@eslint-community/eslint-utils';
import hasPossibleSideEffect from './has-possible-side-effect.js';
import {getParenthesizedRange} from './parentheses/parentheses.js';

/**
Get the static name of a member expression property or an object property key, like `getPropertyName()` from `@eslint-community/eslint-utils` (`foo.bar`, `foo['bar']`, ``foo[`bar`]``, `foo['b' + 'ar']`).

Returns `undefined` when the name is unknown, for a private name, or when the computed key has side effects (`foo[(sideEffect(), 'bar')]`), so a fix that rewrites the member does not drop them.

@param {object} node - A `MemberExpression`, `Property`, `PropertyDefinition`, or `MethodDefinition`.
@param {import('eslint').Rule.RuleContext} context
@param {import('eslint').Scope.Scope} [initialScope] - Scope for resolving constant names and built-ins.
@returns {string | undefined}
*/
export function getStaticPropertyName(node, context, initialScope) {
	const key = node.type === 'MemberExpression' ? node.property : node.key;
	if (node.computed && hasPossibleSideEffect(key, context)) {
		return;
	}

	return getPropertyName(node, initialScope) ?? undefined;
}

/**
Get the range of the member access operator (the `.`, `?.`, or `[` … `]`) of a member expression.

@param {object} memberExpression
@param {import('eslint').Rule.RuleContext} context
@returns {Array<number>}
*/
export function getMemberAccessOperatorRange(memberExpression, context) {
	const {sourceCode} = context;
	const [, start] = getParenthesizedRange(memberExpression.object, context);
	const end = memberExpression.computed
		? sourceCode.getRange(sourceCode.getTokenBefore(memberExpression.property, token => token.value === '['))[1]
		: sourceCode.getRange(memberExpression.property)[0];

	return [start, end];
}
