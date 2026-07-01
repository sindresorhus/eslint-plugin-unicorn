import isSameReference from './is-same-reference.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

const optionalChainNodeTypes = new Set([
	'CallExpression',
	'MemberExpression',
]);

const referenceNodeTypes = new Set([
	'Identifier',
	'MemberExpression',
	'Super',
	'ThisExpression',
]);

/**
The comparison operators (strict equality, strict inequality, and the four relational operators) that these rules reason about.
*/
export const comparisonOperators = new Set(['<', '<=', '>', '>=', '===', '!==']);

/**
Equality operators after applying a leading logical negation.
*/
export const negatedEqualityOperators = new Map([
	['===', '!=='],
	['!==', '==='],
	['==', '!='],
	['!=', '=='],
]);

/**
Comparison operators after applying a leading logical negation, including relational operators.
*/
export const negatedComparisonOperators = new Map([
	...negatedEqualityOperators,
	['>', '<='],
	['>=', '<'],
	['<', '>='],
	['<=', '>'],
]);

/**
Logical operators after applying De Morgan's law.
*/
export const negatedLogicalOperators = new Map([
	['&&', '||'],
	['||', '&&'],
]);

const logicalOperatorPrecedence = {
	'||': 1,
	'&&': 2,
};

/**
Check whether `operator` has lower precedence than `parentOperator`.
*/
export const hasLowerLogicalOperatorPrecedence = (operator, parentOperator) =>
	logicalOperatorPrecedence[operator] < logicalOperatorPrecedence[parentOperator];

/**
Flip a comparison operator so it reads with its operands in the opposite order. Equality operators are symmetric, so they stay the same.
*/
export const flipOperator = {
	'<': '>',
	'<=': '>=',
	'>': '<',
	'>=': '<=',
	'===': '===',
	'!==': '!==',
};

/**
Unwrap TypeScript type-only expression wrappers (`as`, `satisfies`, `<Type>`, and `!`), which have no runtime effect.

@param {import('estree').Node} node The node to unwrap.
@returns {import('estree').Node} The unwrapped node.
*/
export const unwrapExpression = unwrapTypeScriptExpression;

/**
Get the punctuator token for a binary expression operator.
*/
export const getPunctuatorBinaryExpressionOperatorToken = (node, context) => context.sourceCode.getTokenAfter(
	node.left,
	token => token.type === 'Punctuator' && token.value === node.operator,
);

/**
Return the source text for a binary expression with only its operator replaced.
*/
export const getBinaryExpressionWithReplacedOperatorText = (node, context, replacementOperator) => {
	const {sourceCode} = context;
	const operatorToken = getPunctuatorBinaryExpressionOperatorToken(node, context);
	const [nodeStart] = sourceCode.getRange(node);
	const [operatorStart, operatorEnd] = sourceCode.getRange(operatorToken);
	const text = sourceCode.getText(node);

	return [
		text.slice(0, operatorStart - nodeStart),
		replacementOperator,
		text.slice(operatorEnd - nodeStart),
	].join('');
};

const normalizeReference = node => {
	node = unwrapExpression(node);

	if (node.type === 'MemberExpression') {
		return {
			...node,
			object: normalizeReference(node.object),
			property: node.computed ? normalizeReference(node.property) : node.property,
		};
	}

	return node;
};

/**
Check if two nodes reference the same value, ignoring TypeScript type-only wrappers.

@param {import('estree').Node} left The first node to compare.
@param {import('estree').Node} right The second node to compare.
@returns {boolean} `true` if both nodes reference the same value.
*/
export const isSame = (left, right) =>
	isSameReference(normalizeReference(left), normalizeReference(right));

/**
Check if a node is a reference (identifier, member access, `this`, or `super`), ignoring TypeScript type-only wrappers.

@returns {boolean} `true` if the node is a reference.
*/
export const isReference = node => referenceNodeTypes.has(unwrapExpression(node).type);

/**
Check if a node contains optional chaining (`?.`) anywhere within it, which is not safe to reason about as a plain reference.

@returns {boolean} `true` if the node contains optional chaining.
*/
export const containsOptionalChain = node => {
	if (node.type === 'ChainExpression') {
		return true;
	}

	if (optionalChainNodeTypes.has(node.type) && node.optional) {
		return true;
	}

	return Object.entries(node).some(([key, value]) => {
		if (key === 'parent' || !value) {
			return false;
		}

		if (Array.isArray(value)) {
			return value.some(element => element?.type && containsOptionalChain(element));
		}

		return value.type && containsOptionalChain(value);
	});
};
