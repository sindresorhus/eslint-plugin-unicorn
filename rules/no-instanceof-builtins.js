import {
	checkVueTemplate,
	getParenthesizedRange,
	getTokenStore,
	isParenthesized,
	isGlobalIdentifier,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';
import {replaceNodeOrTokenAndSpacesBefore, fixSpaceAroundKeyword} from './fix/index.js';
import builtinErrors from './shared/builtin-errors.js';
import typedArray from './shared/typed-array.js';

const isInstanceofToken = token => token.value === 'instanceof' && token.type === 'Keyword';

const MESSAGE_ID = 'no-instanceof-builtins';
const MESSAGE_ID_SWITCH_TO_TYPE_OF = 'switch-to-type-of';
const messages = {
	[MESSAGE_ID]: 'Avoid using `instanceof` for type checking as it can lead to unreliable results.',
	[MESSAGE_ID_SWITCH_TO_TYPE_OF]: 'Switch to `typeof … === \'{{type}}\'`.',
};

const primitiveWrappers = new Set([
	'String',
	'Number',
	'Boolean',
	'BigInt',
	'Symbol',
]);

const globalObjectNames = new Set([
	'global',
	'globalThis',
	'self',
	'window',
]);

const strictStrategyConstructors = [
	// Error types
	...builtinErrors,

	// Collection types
	'Map',
	'Set',
	'WeakMap',
	'WeakRef',
	'WeakSet',

	// Arrays and Typed Arrays
	'ArrayBuffer',
	...typedArray,

	// Data types
	'Object',

	// Regular Expressions
	'RegExp',

	// Async and functions
	'Promise',
	'Proxy',

	// Other
	'DataView',
	'Date',
	'SharedArrayBuffer',
	'FinalizationRegistry',
];

const replaceWithFunctionCall = (node, context, functionName) => function * (fixer) {
	const {left, right} = node;
	const tokenStore = getTokenStore(context, node);
	const instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);

	yield fixSpaceAroundKeyword(fixer, node, context);

	const range = getParenthesizedRange(left, {sourceCode: tokenStore});
	yield fixer.insertTextBeforeRange(range, functionName + '(');
	yield fixer.insertTextAfterRange(range, ')');

	yield replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, context, tokenStore);
	yield replaceNodeOrTokenAndSpacesBefore(right, '', fixer, context, tokenStore);
};

const replaceWithTypeOfExpression = (node, context, constructorName) => function * (fixer) {
	const {left, right} = node;
	const tokenStore = getTokenStore(context, node);
	const instanceofToken = tokenStore.getTokenAfter(left, isInstanceofToken);
	const {sourceCode} = context;

	// Check if the node is in a Vue.js template expression
	const vueExpressionContainer = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'VExpressionContainer');

	// Get safe quote
	const safeQuote = vueExpressionContainer ? (sourceCode.getText(vueExpressionContainer)[0] === '"' ? '\'' : '"') : '\'';

	yield fixSpaceAroundKeyword(fixer, node, context);

	const leftRange = getParenthesizedRange(left, {sourceCode: tokenStore});

	// Wrap a low-precedence left operand so `typeof` applies to the whole expression,
	// e.g. `a + b instanceof Function` -> `typeof (a + b) === 'function'`.
	if (
		!isParenthesized(left, context)
		&& shouldAddParenthesesToUnaryExpressionArgument(left, 'typeof')
	) {
		yield fixer.insertTextBeforeRange(leftRange, 'typeof (');
		yield fixer.insertTextAfterRange(leftRange, ')');
	} else {
		yield fixer.insertTextBeforeRange(leftRange, 'typeof ');
	}

	yield fixer.replaceText(instanceofToken, '===');

	const rightRange = getParenthesizedRange(right, {sourceCode: tokenStore});

	yield fixer.replaceTextRange(rightRange, safeQuote + constructorName.toLowerCase() + safeQuote);
};

function getConstructor(node, context) {
	if (node.type === 'Identifier') {
		return {
			name: node.name,
			referenceText: node.name,
		};
	}

	if (
		node.type === 'MemberExpression'
		&& !node.computed
		&& node.property.type === 'Identifier'
		&& node.object.type === 'Identifier'
		&& globalObjectNames.has(node.object.name)
		&& isGlobalIdentifier(node.object, context)
	) {
		return {
			name: node.property.name,
			referenceText: context.sourceCode.getText(node),
		};
	}
}

const hasCommentsInside = (node, context) =>
	context.sourceCode.getCommentsInside(node).length > 0;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		useErrorIsError = false,
		strategy = 'loose',
		include = [],
		exclude = [],
	} = context.options[0] ?? {};

	const forbiddenConstructors = new Set(strategy === 'strict'
		? [...strictStrategyConstructors, ...include]
		: include);

	context.on('BinaryExpression', /** @param {import('estree').BinaryExpression} node */ node => {
		const {right, operator} = node;

		if (operator !== 'instanceof') {
			return;
		}

		const constructor = getConstructor(right, context);
		if (!constructor || exclude.includes(constructor.name)) {
			return;
		}

		const {name: constructorName, referenceText} = constructor;

		/** @type {import('eslint').Rule.ReportDescriptor} */
		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		if (
			constructorName === 'Array'
			|| (constructorName === 'Error' && useErrorIsError)
		) {
			const methodName = constructorName === 'Array' ? 'isArray' : 'isError';
			const functionName = `${referenceText}.${methodName}`;
			problem.fix = replaceWithFunctionCall(node, context, functionName);
			return problem;
		}

		if (constructorName === 'Function') {
			if (!hasCommentsInside(right, context)) {
				problem.fix = replaceWithTypeOfExpression(node, context, constructorName);
			}

			return problem;
		}

		if (primitiveWrappers.has(constructorName)) {
			if (!hasCommentsInside(right, context)) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SWITCH_TO_TYPE_OF,
						data: {type: constructorName.toLowerCase()},
						fix: replaceWithTypeOfExpression(node, context, constructorName),
					},
				];
			}

			return problem;
		}

		if (!forbiddenConstructors.has(constructorName)) {
			return;
		}

		return problem;
	});
};

const schema = [
	{
		type: 'object',
		properties: {
			useErrorIsError: {
				type: 'boolean',
			},
			strategy: {
				enum: [
					'loose',
					'strict',
				],
			},
			include: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
			exclude: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
		},
		additionalProperties: false,
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `instanceof` with built-in objects',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{
			useErrorIsError: false,
			strategy: 'loose',
			include: [],
			exclude: [],
		}],
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
