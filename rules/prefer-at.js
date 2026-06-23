import {
	isOpeningBracketToken,
	isClosingBracketToken,
	getStaticValue,
} from '@eslint-community/eslint-utils';
import {
	isParenthesized,
	getParenthesizedRange,
	getParenthesizedText,
	getConstVariableInitializer,
	isNodeMatchesNameOrPath,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	isLeftHandSide,
	unwrapTypeScriptExpression as unwrapExpression,
} from './utils/index.js';
import {
	getNegativeIndexLengthNode,
	removeLengthNode,
} from './shared/negative-index.js';
import {getSubstringSingleCharacterIndex} from './shared/substring.js';
import {removeMemberExpressionProperty, removeMethodCall} from './fix/index.js';
import {
	isLiteral,
	isStringLiteral,
	isCallExpression,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';

const MESSAGE_ID_NEGATIVE_INDEX = 'negative-index';
const MESSAGE_ID_INDEX = 'index';
const MESSAGE_ID_STRING_CHAR_AT_NEGATIVE = 'string-char-at-negative';
const MESSAGE_ID_STRING_CHAR_AT = 'string-char-at';
const MESSAGE_ID_STRING_SUBSTRING = 'string-substring';
const MESSAGE_ID_SLICE = 'slice';
const MESSAGE_ID_GET_LAST_FUNCTION = 'get-last-function';
const SUGGESTION_ID = 'use-at';
const messages = {
	[MESSAGE_ID_NEGATIVE_INDEX]: 'Prefer `.at(…)` over `[….length - index]`.',
	[MESSAGE_ID_INDEX]: 'Prefer `.at(…)` over index access.',
	[MESSAGE_ID_STRING_CHAR_AT_NEGATIVE]: 'Prefer `String#at(…)` over `String#charAt(….length - index)`.',
	[MESSAGE_ID_STRING_CHAR_AT]: 'Prefer `String#at(…)` over `String#charAt(…)`.',
	[MESSAGE_ID_STRING_SUBSTRING]: 'Prefer `String#at(…)` over `String#substring(…)` when getting one character.',
	[MESSAGE_ID_SLICE]: 'Prefer `.at(…)` over the first element from `.slice(…)`.',
	[MESSAGE_ID_GET_LAST_FUNCTION]: 'Prefer `.at(-1)` over `{{description}}(…)` to get the last element.',
	[SUGGESTION_ID]: 'Use `.at(…)`.',
};

const isArguments = node => node.type === 'Identifier' && node.name === 'arguments';

const isUnsupportedAtReceiverExpression = node => {
	node = unwrapExpression(node);

	return node.type === 'ObjectExpression'
		|| (node.type === 'Literal' && !isStringLiteral(node))
		|| node.type === 'ArrowFunctionExpression'
		|| node.type === 'FunctionExpression'
		|| node.type === 'ClassExpression';
};

const isObviouslyNonArrayReceiver = (node, context) => {
	node = unwrapExpression(node);

	if (isUnsupportedAtReceiverExpression(node)) {
		return true;
	}

	const initializer = getConstVariableInitializer(node, context);
	return Boolean(initializer && isUnsupportedAtReceiverExpression(initializer));
};

const isLiteralNegativeInteger = node =>
	node.type === 'UnaryExpression'
	&& node.prefix
	&& node.operator === '-'
	&& node.argument.type === 'Literal'
	&& Number.isSafeInteger(node.argument.value)
	&& node.argument.value > 0;
const isZeroIndexAccess = node =>
	isMemberExpression(node.parent, {
		optional: false,
		computed: true,
	})
	&& node.parent.object === node
	&& isLiteral(node.parent.property, 0);

const isArrayPopOrShiftCall = (node, method) =>
	isMethodCall(node.parent.parent, {
		method,
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
	})
	&& node.parent.object === node;

const isArrayPopCall = node => isArrayPopOrShiftCall(node, 'pop');
const isArrayShiftCall = node => isArrayPopOrShiftCall(node, 'shift');

function getFirstElementGetMethod(node) {
	if (isZeroIndexAccess(node)) {
		return isLeftHandSide(node.parent) ? undefined : 'zero-index';
	}

	if (isArrayShiftCall(node)) {
		return 'shift';
	}

	if (isArrayPopCall(node)) {
		return 'pop';
	}
}

function getSliceCallResult(node) {
	const sliceArgumentsLength = node.arguments.length;
	const [startIndexNode, endIndexNode] = node.arguments;

	if (!isLiteralNegativeInteger(startIndexNode)) {
		return;
	}

	const firstElementGetMethod = getFirstElementGetMethod(node);
	if (!firstElementGetMethod) {
		return;
	}

	const startIndex = -startIndexNode.argument.value;
	if (sliceArgumentsLength === 1) {
		if (
			startIndexNode.argument.value === 1
			&& (
				firstElementGetMethod === 'zero-index'
				|| firstElementGetMethod === 'shift'
				|| ((firstElementGetMethod === 'pop') && (startIndex === -1))
			)
		) {
			return {safeToFix: true, firstElementGetMethod};
		}

		return;
	}

	if (
		isLiteralNegativeInteger(endIndexNode)
		&& -endIndexNode.argument.value === startIndex + 1
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
	'underscore.last',
];

// TODO: Remove this once DOM collections like NodeList and HTMLCollection reliably support `.at()` in browsers.
const domCollectionProperties = [
	'childNodes',
	'children',
];

const domCollectionMethods = [
	'getElementsByClassName',
	'getElementsByName',
	'getElementsByTagName',
	'getElementsByTagNameNS',
	'querySelectorAll',
];

const isDomCollectionReceiver = node => {
	node = unwrapExpression(node);

	return isMemberExpression(node, {properties: domCollectionProperties})
		|| isMethodCall(node, {methods: domCollectionMethods});
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {
		getLastElementFunctions,
		checkAllIndexAccess,
	} = context.options[0];
	const getLastFunctions = [...getLastElementFunctions, ...lodashLastFunctions];
	const {sourceCode} = context;

	// Index access
	context.on('MemberExpression', node => {
		if (
			!node.computed
			|| isLeftHandSide(node)
		) {
			return;
		}

		if (isDomCollectionReceiver(node.object)) {
			return;
		}

		const indexNode = node.property;
		const lengthNode = getNegativeIndexLengthNode(indexNode, node.object);

		if (!lengthNode) {
			if (!checkAllIndexAccess) {
				return;
			}

			// Only if we are sure it's a non-negative integer
			const staticValue = getStaticValue(indexNode, sourceCode.getScope(indexNode));
			if (!staticValue || !Number.isSafeInteger(staticValue.value) || staticValue.value < 0) {
				return;
			}

			if (isObviouslyNonArrayReceiver(node.object, context)) {
				return;
			}
		}

		if (isArguments(node.object)) {
			return;
		}

		return {
			node: indexNode,
			messageId: lengthNode ? MESSAGE_ID_NEGATIVE_INDEX : MESSAGE_ID_INDEX,
			* fix(fixer) {
				if (lengthNode) {
					yield removeLengthNode(lengthNode, fixer, context);
				}

				// Only remove space for `foo[foo.length - 1]`
				if (
					indexNode.type === 'BinaryExpression'
					&& indexNode.operator === '-'
					&& indexNode.left === lengthNode
					&& indexNode.right.type === 'Literal'
					&& /^\d+$/v.test(indexNode.right.raw)
				) {
					const numberNode = indexNode.right;
					const tokenBefore = sourceCode.getTokenBefore(numberNode);
					if (
						tokenBefore.type === 'Punctuator'
						&& tokenBefore.value === '-'
						&& /^\s+$/v.test(sourceCode.text.slice(sourceCode.getRange(tokenBefore)[1], sourceCode.getRange(numberNode)[0]))
					) {
						yield fixer.removeRange([sourceCode.getRange(tokenBefore)[1], sourceCode.getRange(numberNode)[0]]);
					}
				}

				const isOptional = node.optional;
				const openingBracketToken = sourceCode.getTokenBefore(indexNode, isOpeningBracketToken);
				yield fixer.replaceText(openingBracketToken, `${isOptional ? '' : '.'}at(`);

				const closingBracketToken = sourceCode.getTokenAfter(indexNode, isClosingBracketToken);
				yield fixer.replaceText(closingBracketToken, ')');
			},
		};
	});

	// `string.charAt`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'charAt',
			argumentsLength: 1,
			optionalCall: false,
		})) {
			return;
		}

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
						yield removeLengthNode(lengthNode, fixer, context);
					}

					yield fixer.replaceText(node.callee.property, 'at');
				},
			}],
		};
	});

	// `string.substring(index, index + 1)`
	context.on('CallExpression', node => {
		const indexNode = getSubstringSingleCharacterIndex(node);
		if (!indexNode) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_STRING_SUBSTRING,
		};

		const [firstArgument, secondArgument] = node.arguments;
		const replacementRange = [
			getParenthesizedRange(firstArgument, context)[0],
			getParenthesizedRange(secondArgument, context)[1],
		];
		const hasCommentsInsideReplacementRange = sourceCode.getAllComments().some(comment => {
			const commentRange = sourceCode.getRange(comment);
			return commentRange[0] >= replacementRange[0] && commentRange[1] <= replacementRange[1];
		});
		if (hasCommentsInsideReplacementRange) {
			return problem;
		}

		return {
			...problem,
			suggest: [{
				messageId: SUGGESTION_ID,
				* fix(fixer) {
					yield fixer.replaceText(node.callee.property, 'at');

					yield fixer.replaceTextRange(replacementRange, getParenthesizedText(indexNode, context));
				},
			}],
		};
	});

	// `.slice()`
	context.on('CallExpression', sliceCall => {
		if (!isMethodCall(sliceCall, {
			method: 'slice',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
		})) {
			return;
		}

		const result = getSliceCallResult(sliceCall);
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
				const [, start] = getParenthesizedRange(sliceCall.arguments[0], context);
				const [end] = sourceCode.getRange(sourceCode.getLastToken(sliceCall));
				yield fixer.removeRange([start, end]);
			}

			yield (
				// Remove `[0]`, `.shift()`, or `.pop()`
				firstElementGetMethod === 'zero-index'
					? removeMemberExpressionProperty(fixer, sliceCall.parent, context)
					: removeMethodCall(fixer, sliceCall.parent.parent, context)
			);
		}

		const problem = {
			node: sliceCall.callee.property,
			messageId: MESSAGE_ID_SLICE,
		};

		if (safeToFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: SUGGESTION_ID, fix}];
		}

		return problem;
	});

	context.on('CallExpression', node => {
		if (!isCallExpression(node, {argumentsLength: 1, optional: false})) {
			return;
		}

		const matchedFunction = getLastFunctions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath));
		if (!matchedFunction) {
			return;
		}

		const [array] = node.arguments;

		if (isArguments(array)) {
			return;
		}

		return {
			node: node.callee,
			messageId: MESSAGE_ID_GET_LAST_FUNCTION,
			data: {description: matchedFunction.trim()},
			fix(fixer) {
				let fixed = getParenthesizedText(array, context);

				if (
					!isParenthesized(array, sourceCode)
					&& shouldAddParenthesesToMemberExpressionObject(array, context)
				) {
					fixed = `(${fixed})`;
				}

				fixed += '.at(-1)';

				const tokenBefore = sourceCode.getTokenBefore(node);
				if (needsSemicolon(tokenBefore, context, fixed)) {
					fixed = `;${fixed}`;
				}

				return fixer.replaceText(node, fixed);
			},
		};
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			getLastElementFunctions: {
				type: 'array',
				uniqueItems: true,
				description: 'Additional functions that return the last element.',
			},
			checkAllIndexAccess: {
				type: 'boolean',
				description: 'Whether to also check non-negative integer index access.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.at()` method for index access and `String#charAt()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{getLastElementFunctions: [], checkAllIndexAccess: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
