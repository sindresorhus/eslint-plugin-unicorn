import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	escapeString,
	shouldAddParenthesesToMemberExpressionObject,
	shouldAddParenthesesToLogicalExpressionChild,
	isKnownNonString,
	isMethodNamed,
	isString,
	isSameReference,
	needsSemicolon,
} from './utils/index.js';
import {
	isMethodCall,
	isRegexLiteral,
	isLiteral,
	isNumericLiteral,
} from './ast/index.js';

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const MESSAGE_INDEX_OF_STARTS_WITH = 'prefer-starts-with-indexOf';
const MESSAGE_SLICE_STARTS_WITH = 'prefer-starts-with-slice';
const MESSAGE_SLICE_ENDS_WITH = 'prefer-ends-with-slice';
const FIX_TYPE_STRING_CASTING = 'useStringCasting';
const FIX_TYPE_OPTIONAL_CHAINING = 'useOptionalChaining';
const FIX_TYPE_NULLISH_COALESCING = 'useNullishCoalescing';
const messages = {
	[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
	[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.',
	[MESSAGE_INDEX_OF_STARTS_WITH]: 'Prefer `String#startsWith()` over `String#indexOf() === 0`.',
	[MESSAGE_SLICE_STARTS_WITH]: 'Prefer `String#startsWith()` over comparing a string slice.',
	[MESSAGE_SLICE_ENDS_WITH]: 'Prefer `String#endsWith()` over comparing a string slice.',
	[FIX_TYPE_STRING_CASTING]: 'Convert to string `String(…).{{method}}()`.',
	[FIX_TYPE_OPTIONAL_CHAINING]: 'Use optional chaining `…?.{{method}}()`.',
	[FIX_TYPE_NULLISH_COALESCING]: 'Use nullish coalescing `(… ?? \'\').{{method}}()`.',
};

const doesNotContain = (string, characters) => characters.every(character => !string.includes(character));
const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*', '|'],
);
const addParentheses = text => `(${text})`;
const equalityOperators = new Set(['===', '!==', '==', '!=']);
const isNegatedEqualityOperator = operator => operator === '!==' || operator === '!=';

const getNumericLiteralValue = node => {
	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '-'
		&& isNumericLiteral(node.argument)
	) {
		return -node.argument.value;
	}
};

const isLengthProperty = node => (
	node?.type === 'MemberExpression'
	&& !node.computed
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
);

const getStaticStringLength = (node, context) => {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));

	if (typeof staticValue?.value === 'string') {
		return staticValue.value.length;
	}
};

const isMatchingLengthProperty = (lengthNode, searchArgument) =>
	isLengthProperty(lengthNode)
	&& isSameReference(lengthNode.object, searchArgument);

const isMatchingNegativeLengthProperty = (node, searchArgument) => (
	node?.type === 'UnaryExpression'
	&& node.operator === '-'
	&& isMatchingLengthProperty(node.argument, searchArgument)
);

const getSliceComparison = (sliceCall, searchArgument, context) => {
	const {arguments: argumentNodes} = sliceCall;
	const [firstArgument, secondArgument] = argumentNodes;
	const searchLength = getStaticStringLength(searchArgument, context);

	if (
		argumentNodes.length === 2
		&& isLiteral(firstArgument, 0)
		&& (
			(searchLength !== undefined && getNumericLiteralValue(secondArgument) === searchLength)
			|| isMatchingLengthProperty(secondArgument, searchArgument)
		)
	) {
		return {
			method: 'startsWith',
			messageId: MESSAGE_SLICE_STARTS_WITH,
		};
	}

	if (
		argumentNodes.length === 1
		&& searchLength !== undefined
		&& searchLength > 0
		&& (
			getNumericLiteralValue(firstArgument) === -searchLength
			|| isMatchingNegativeLengthProperty(firstArgument, searchArgument)
		)
	) {
		return {
			method: 'endsWith',
			messageId: MESSAGE_SLICE_ENDS_WITH,
		};
	}
};

const getRegexProblem = ({pattern, flags}) => {
	if (flags.includes('i') || flags.includes('m')) {
		return;
	}

	if (pattern.startsWith('^')) {
		const string = pattern.slice(1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_STARTS_WITH,
				string,
			};
		}
	}

	if (pattern.endsWith('$')) {
		const string = pattern.slice(0, -1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_ENDS_WITH,
				string,
			};
		}
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				method: 'test',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isRegexLiteral(node.callee.object)
		) {
			return;
		}

		const regexNode = node.callee.object;
		const {regex} = regexNode;
		const result = getRegexProblem(regex);
		if (!result) {
			return;
		}

		const [target] = node.arguments;
		if (isKnownNonString(target, context)) {
			return;
		}

		let isTargetString = target.type === 'TemplateLiteral'
			|| (
				target.type === 'CallExpression'
				&& target.callee.type === 'Identifier'
				&& target.callee.name === 'String'
			);
		let isNonString = false;
		if (!isTargetString) {
			const staticValue = getStaticValue(target, sourceCode.getScope(target));

			if (staticValue) {
				isTargetString = typeof staticValue.value === 'string';
				isNonString = !isTargetString;
			}
		}

		const problem = {
			node,
			messageId: result.messageId,
		};
		const method = result.messageId === MESSAGE_STARTS_WITH ? 'startsWith' : 'endsWith';

		function * fix(fixer, fixType) {
			let targetText = getParenthesizedText(target, context);
			const isRegexParenthesized = isParenthesized(regexNode, context);
			const isTargetParenthesized = isParenthesized(target, context);

			switch (fixType) {
				// Goal: `(target ?? '').startsWith(pattern)`
				case FIX_TYPE_NULLISH_COALESCING: {
					if (
						!isTargetParenthesized
						&& shouldAddParenthesesToLogicalExpressionChild(target, {operator: '??', property: 'left'})
					) {
						targetText = addParentheses(targetText);
					}

					targetText += ' ?? \'\'';

					// `LogicalExpression` need to add parentheses to call `.startsWith()`,
					// but if regex is parenthesized, we can reuse it
					if (!isRegexParenthesized) {
						targetText = addParentheses(targetText);
					}

					break;
				}

				// Goal: `String(target).startsWith(pattern)`
				case FIX_TYPE_STRING_CASTING: {
					// `target` was a call argument, don't need to check parentheses
					targetText = `String(${targetText})`;
					// `CallExpression` don't need add parentheses to call `.startsWith()`
					break;
				}

				// Goal: `target.startsWith(pattern)` or `target?.startsWith(pattern)`
				case FIX_TYPE_OPTIONAL_CHAINING: {
					// Optional chaining: `target.startsWith` => `target?.startsWith`
					yield fixer.replaceText(sourceCode.getTokenBefore(node.callee.property), '?.');
				}

				// Fallthrough
				default: {
					if (
						!isRegexParenthesized
						&& !isTargetParenthesized
						&& shouldAddParenthesesToMemberExpressionObject(target, context)
					) {
						targetText = addParentheses(targetText);
					}
				}
			}

			// The regex literal always starts with `/` or `(`, so we don't need check ASI

			// Replace regex with string
			yield fixer.replaceText(regexNode, targetText);

			// `.test` => `.startsWith` / `.endsWith`
			yield fixer.replaceText(node.callee.property, method);

			// Replace argument with result.string
			yield fixer.replaceTextRange(getParenthesizedRange(target, context), escapeString(result.string));
		}

		if (isTargetString || !isNonString) {
			problem.fix = fix;
		}

		if (!isTargetString) {
			problem.suggest = [
				FIX_TYPE_STRING_CASTING,
				FIX_TYPE_OPTIONAL_CHAINING,
				FIX_TYPE_NULLISH_COALESCING,
			].map(type => ({messageId: type, data: {method}, fix: fixer => fix(fixer, type)}));
		}

		return problem;
	});

	context.on('BinaryExpression', node => {
		const {left, right, operator} = node;

		if (!equalityOperators.has(operator)) {
			return;
		}

		let indexOfCall;
		if (isMethodNamed(left, 'indexOf') && isLiteral(right, 0)) {
			indexOfCall = left;
		} else if (isMethodNamed(right, 'indexOf') && isLiteral(left, 0)) {
			indexOfCall = right;
		} else {
			return;
		}

		if (
			indexOfCall.optional
			|| indexOfCall.callee.optional
			|| indexOfCall.callee.computed
			|| indexOfCall.arguments.length !== 1
			|| indexOfCall.arguments[0].type === 'SpreadElement'
		) {
			return;
		}

		const target = indexOfCall.callee.object;
		if (!isString(target, context)) {
			return;
		}

		const isNegated = isNegatedEqualityOperator(operator);
		const [searchArgument] = indexOfCall.arguments;

		return {
			node,
			messageId: MESSAGE_INDEX_OF_STARTS_WITH,
			* fix(fixer, {abort}) {
				if (!isString(searchArgument, context)) {
					return abort();
				}

				if (sourceCode.getCommentsInside(node).length > 0) {
					return abort();
				}

				let targetText = getParenthesizedText(target, context);

				if (
					!isParenthesized(target, context)
					&& shouldAddParenthesesToMemberExpressionObject(target, context)
				) {
					targetText = `(${targetText})`;
				}

				const searchText = sourceCode.getText(searchArgument);
				const replacement = `${isNegated ? '!' : ''}${targetText}.startsWith(${searchText})`;
				yield fixer.replaceText(node, replacement);
			},
		};
	});

	context.on('BinaryExpression', node => {
		const {left, right, operator} = node;

		if (!equalityOperators.has(operator)) {
			return;
		}

		let sliceCall;
		let searchArgument;
		if (isMethodNamed(left, 'slice')) {
			sliceCall = left;
			searchArgument = right;
		} else if (isMethodNamed(right, 'slice')) {
			sliceCall = right;
			searchArgument = left;
		} else {
			return;
		}

		if (
			sliceCall.optional
			|| sliceCall.callee.optional
			|| sliceCall.callee.computed
			|| sliceCall.arguments.length === 0
			|| sliceCall.arguments.length > 2
			|| sliceCall.arguments.some(node => node.type === 'SpreadElement')
		) {
			return;
		}

		const target = sliceCall.callee.object;
		if (
			!isString(target, context)
			|| !isString(searchArgument, context)
		) {
			return;
		}

		const comparison = getSliceComparison(sliceCall, searchArgument, context);
		if (!comparison) {
			return;
		}

		return {
			node,
			messageId: comparison.messageId,
			* fix(fixer, {abort}) {
				if (
					sourceCode.getCommentsInside(node).length > 0
				) {
					return abort();
				}

				let targetText = getParenthesizedText(target, context);

				if (
					!isParenthesized(target, context)
					&& shouldAddParenthesesToMemberExpressionObject(target, context)
				) {
					targetText = `(${targetText})`;
				}

				const searchText = getParenthesizedText(searchArgument, context);
				let replacement = `${isNegatedEqualityOperator(operator) ? '!' : ''}${targetText}.${comparison.method}(${searchText})`;
				if (needsSemicolon(sourceCode.getTokenBefore(node), context, replacement)) {
					replacement = `;${replacement}`;
				}

				yield fixer.replaceText(node, replacement);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#startsWith()` & `String#endsWith()` over regexes, `String#indexOf() === 0`, and slice checks.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
