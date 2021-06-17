'use strict';
const {isOpeningBracketToken, isClosingBracketToken, getStaticValue} = require('eslint-utils');
const isLiteralValue = require('./utils/is-literal-value.js');
const {
	isParenthesized,
	getParenthesizedRange,
	getParenthesizedText
} = require('./utils/parentheses.js');
const {isNodeMatchesNameOrPath} = require('./utils/is-node-matches.js');
const needsSemicolon = require('./utils/needs-semicolon.js');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object.js');
const {
	getNegativeIndexLengthNode,
	removeLengthNode
} = require('./shared/negative-index.js');
const {methodCallSelector, callExpressionSelector, notLeftHandSideSelector} = require('./selectors/index.js');
const {removeMemberExpressionProperty, removeMethodCall} = require('./fix/index.js');

const MESSAGE_ID_NEGATIVE_INDEX = 'negative-index';
const MESSAGE_ID_INDEX = 'index';
const MESSAGE_ID_STRING_CHAR_AT_NEGATIVE = 'string-char-at-negative';
const MESSAGE_ID_STRING_CHAR_AT = 'string-char-at';
const MESSAGE_ID_SLICE = 'slice';
const MESSAGE_ID_GET_LAST_FUNCTION = 'get-last-function';
const SUGGESTION_ID = 'use-at';
const messages = {
	[MESSAGE_ID_NEGATIVE_INDEX]: 'Prefer `.at(…)` over `[….length - index]`.',
	[MESSAGE_ID_INDEX]: 'Prefer `.at(…)` over index access.',
	[MESSAGE_ID_STRING_CHAR_AT_NEGATIVE]: 'Prefer `String#at(…)` over `String#charAt(….length - index)`.',
	[MESSAGE_ID_STRING_CHAR_AT]: 'Prefer `String#at(…)` over `String#charAt(…)`.',
	[MESSAGE_ID_SLICE]: 'Prefer `.at(…)` over the first element from `.slice(…)`.',
	[MESSAGE_ID_GET_LAST_FUNCTION]: 'Prefer `.at(-1)` over `{{description}}(…)` to get the last element.',
	[SUGGESTION_ID]: 'Use `.at(…)`.'
};

const indexAccess = [
	'MemberExpression',
	'[optional!=true]',
	'[computed!=false]',
	notLeftHandSideSelector()
].join('');
const sliceCall = methodCallSelector({name: 'slice', min: 1, max: 2});
const stringCharAt = methodCallSelector({name: 'charAt', length: 1});

const isLiteralNegativeInteger = node =>
	node.type === 'UnaryExpression' &&
	node.prefix &&
	node.operator === '-' &&
	node.argument.type === 'Literal' &&
	Number.isInteger(node.argument.value) &&
	node.argument.value > 0;
const isZeroIndexAccess = node => {
	const {parent} = node;
	return parent.type === 'MemberExpression' &&
		!parent.optional &&
		parent.computed &&
		parent.object === node &&
		isLiteralValue(parent.property, 0);
};

const isArrayPopOrShiftCall = (node, method) => {
	const {parent} = node;
	return parent.type === 'MemberExpression' &&
		!parent.optional &&
		!parent.computed &&
		parent.object === node &&
		parent.property.type === 'Identifier' &&
		parent.property.name === method &&
		parent.parent.type === 'CallExpression' &&
		parent.parent.callee === parent &&
		!parent.parent.optional &&
		parent.parent.arguments.length === 0;
};

const isArrayPopCall = node => isArrayPopOrShiftCall(node, 'pop');
const isArrayShiftCall = node => isArrayPopOrShiftCall(node, 'shift');

function checkSliceCall(node) {
	const sliceArgumentsLength = node.arguments.length;
	const [startIndexNode, endIndexNode] = node.arguments;

	if (!isLiteralNegativeInteger(startIndexNode)) {
		return;
	}

	let firstElementGetMethod = '';
	if (isZeroIndexAccess(node)) {
		firstElementGetMethod = 'zero-index';
	} else if (isArrayShiftCall(node)) {
		firstElementGetMethod = 'shift';
	} else if (isArrayPopCall(node)) {
		firstElementGetMethod = 'pop';
	}

	if (!firstElementGetMethod) {
		return;
	}

	const startIndex = -startIndexNode.argument.value;
	if (sliceArgumentsLength === 1) {
		if (
			firstElementGetMethod === 'zero-index' ||
			firstElementGetMethod === 'shift' ||
			(startIndex === -1 && firstElementGetMethod === 'pop')
		) {
			return {safeToFix: true, firstElementGetMethod};
		}

		return;
	}

	if (
		isLiteralNegativeInteger(endIndexNode) &&
		-endIndexNode.argument.value === startIndex + 1
	) {
		return {safeToFix: true, firstElementGetMethod};
	}

	if (firstElementGetMethod === 'pop') {
		return;
	}

	return {safeToFix: false, firstElementGetMethod};
}

const lodashLastFunctions = [
	'_.last',
	'lodash.last',
	'underscore.last'
];

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {
		getLastElementFunctions,
		checkAllIndexAccess
	} = {
		getLastElementFunctions: [],
		checkAllIndexAccess: false,
		...context.options[0]
	};
	const getLastFunctions = [...getLastElementFunctions, ...lodashLastFunctions];
	const sourceCode = context.getSourceCode();

	return {
		[indexAccess](node) {
			const indexNode = node.property;
			const lengthNode = getNegativeIndexLengthNode(indexNode, node.object);

			if (!lengthNode) {
				if (!checkAllIndexAccess) {
					return;
				}

				// Only if we are sure it's an positive integer
				const staticValue = getStaticValue(indexNode, context.getScope());
				if (!staticValue || !Number.isInteger(staticValue.value) || staticValue.value < 0) {
					return;
				}
			}

			return {
				node: indexNode,
				messageId: lengthNode ? MESSAGE_ID_NEGATIVE_INDEX : MESSAGE_ID_INDEX,
				* fix(fixer) {
					if (lengthNode) {
						yield removeLengthNode(lengthNode, fixer, sourceCode);
					}

					const openingBracketToken = sourceCode.getTokenBefore(indexNode, isOpeningBracketToken);
					yield fixer.replaceText(openingBracketToken, '.at(');

					const isClosingBraceToken = sourceCode.getTokenAfter(indexNode, isClosingBracketToken);
					yield fixer.replaceText(isClosingBraceToken, ')');
				}
			};
		},
		[stringCharAt](node) {
			const [indexNode] = node.arguments;
			const lengthNode = getNegativeIndexLengthNode(indexNode, node.callee.object);

			// `String#charAt` don't care about index value, we assume it's always number
			if (!lengthNode && !checkAllIndexAccess) {
				return;
			}

			return {
				node: indexNode,
				messageId: lengthNode ? MESSAGE_ID_STRING_CHAR_AT_NEGATIVE : MESSAGE_ID_STRING_CHAR_AT,
				suggest: [{
					messageId: SUGGESTION_ID,
					* fix(fixer) {
						if (lengthNode) {
							yield removeLengthNode(lengthNode, fixer, sourceCode);
						}

						yield fixer.replaceText(node.callee.property, 'at');
					}
				}]
			};
		},
		[sliceCall](sliceCall) {
			const result = checkSliceCall(sliceCall);
			if (!result) {
				return;
			}

			const {safeToFix, firstElementGetMethod} = result;

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			function * fix(fixer) {
				// `.slice` to `.at`
				yield fixer.replaceText(sliceCall.callee.property, 'at');

				// Remove extra arguments
				if (sliceCall.arguments.length !== 1) {
					const [, start] = getParenthesizedRange(sliceCall.arguments[0], sourceCode);
					const [end] = sourceCode.getLastToken(sliceCall).range;
					yield fixer.removeRange([start, end]);
				}

				// Remove `[0]`, `.shift()`, or `.pop()`
				if (firstElementGetMethod === 'zero-index') {
					yield removeMemberExpressionProperty(fixer, sliceCall.parent, sourceCode);
				} else {
					yield * removeMethodCall(fixer, sliceCall.parent.parent, sourceCode);
				}
			}

			const problem = {
				node: sliceCall.callee.property,
				messageId: MESSAGE_ID_SLICE
			};

			if (safeToFix) {
				problem.fix = fix;
			} else {
				problem.suggest = [{messageId: SUGGESTION_ID, fix}];
			}

			return problem;
		},
		[callExpressionSelector({length: 1})](node) {
			const matchedFunction = getLastFunctions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath));
			if (!matchedFunction) {
				return;
			}

			return {
				node: node.callee,
				messageId: MESSAGE_ID_GET_LAST_FUNCTION,
				data: {description: matchedFunction.trim()},
				fix(fixer) {
					const [array] = node.arguments;

					let fixed = getParenthesizedText(array, sourceCode);

					if (
						!isParenthesized(array, sourceCode) &&
						shouldAddParenthesesToMemberExpressionObject(array, sourceCode)
					) {
						fixed = `(${fixed})`;
					}

					fixed = `${fixed}.at(-1)`;

					const tokenBefore = sourceCode.getTokenBefore(node);
					if (needsSemicolon(tokenBefore, sourceCode, fixed)) {
						fixed = `;${fixed}`;
					}

					return fixer.replaceText(node, fixed);
				}
			};
		}
	};
}

const schema = [
	{
		type: 'object',
		properties: {
			getLastElementFunctions: {
				type: 'array',
				uniqueItems: true
			},
			checkAllIndexAccess: {
				type: 'boolean',
				default: false
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.at()` method for index access and `String#charAt()`.'
		},
		fixable: 'code',
		schema,
		messages,
		hasSuggestions: true
	}
};
