import {
	getParenthesizedRange,
	getParenthesizedText,
} from './utils/index.js';
import typedArray from './shared/typed-array.js';
import {
	isMethodCall,
	isNewExpression,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-iterator-to-array';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-to-array/suggestion';

const iteratorMethods = [
	'entries',
	'keys',
	'values',
];

const iteratorHelperMethods = [
	'drop',
	'filter',
	'flatMap',
	'map',
	'take',
];

const collectionConstructors = ['Map', 'WeakMap', 'Set', 'WeakSet'];

const messages = {
	[MESSAGE_ID]: 'Prefer `Iterator#toArray()` over a temporary spread array.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Iterator#toArray()`.',
};

const getIteratorExpressionFixType = node => {
	if (
		isMethodCall(node, {
			object: 'Iterator',
			method: 'from',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| isMethodCall(node, {
			object: 'Iterator',
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return 'fix';
	}

	if (
		isMethodCall(node, {
			methods: iteratorMethods,
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})
		|| isMethodCall(node, {
			method: 'matchAll',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return 'suggestion';
	}

	if (!isMethodCall(node, {
		methods: iteratorHelperMethods,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	return getIteratorExpressionFixType(node.callee.object);
};

const isSingleIteratorSpreadArray = node =>
	node.elements.length === 1
	&& node.elements[0]?.type === 'SpreadElement'
	&& getIteratorExpressionFixType(node.elements[0].argument);

const isIterableAcceptingParent = node => {
	const {parent} = node;

	return (
		(parent.type === 'ForOfStatement' && parent.right === node)
		|| (parent.type === 'YieldExpression' && parent.delegate && parent.argument === node)
		|| (
			(
				isNewExpression(parent, {names: collectionConstructors, argumentsLength: 1})
				|| isNewExpression(parent, {names: typedArray, minimumArguments: 1})
				|| isMethodCall(parent, {
					object: 'Promise',
					methods: ['all', 'allSettled', 'any', 'race'],
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				|| isMethodCall(parent, {
					objects: ['Array', ...typedArray],
					method: 'from',
					minimumArguments: 1,
					optionalCall: false,
					optionalMember: false,
				})
				|| isMethodCall(parent, {
					object: 'Object',
					method: 'fromEntries',
					minimumArguments: 1,
					optionalCall: false,
					optionalMember: false,
				})
			)
			&& parent.arguments[0] === node
		)
	);
};

const hasCommentsOutsideArgument = (arrayExpression, spreadElement, context) => {
	const {sourceCode} = context;
	const [argumentStart, argumentEnd] = getParenthesizedRange(spreadElement.argument, context);

	return sourceCode.getCommentsInside(arrayExpression).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);

		return commentStart < argumentStart || commentEnd > argumentEnd;
	});
};

const getReplacementText = (arrayExpression, context) =>
	`${getParenthesizedText(arrayExpression.elements[0].argument, context)}.toArray()`;

const getFix = (arrayExpression, context) => {
	const [spreadElement] = arrayExpression.elements;
	if (hasCommentsOutsideArgument(arrayExpression, spreadElement, context)) {
		return;
	}

	return function * (fixer) {
		yield fixer.replaceText(arrayExpression, getReplacementText(arrayExpression, context));
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ArrayExpression', node => {
		if (
			!isSingleIteratorSpreadArray(node)
			|| isIterableAcceptingParent(node)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};
		const fix = getFix(node, context);
		if (!fix) {
			return problem;
		}

		if (getIteratorExpressionFixType(node.elements[0].argument) === 'suggestion') {
			return {
				...problem,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix,
					},
				],
			};
		}

		return {
			...problem,
			fix,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Iterator#toArray()` over temporary arrays from iterator spreads.',
			recommended: false,
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
