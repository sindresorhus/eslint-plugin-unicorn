import typedArray from './shared/typed-array.js';
import {
	getParenthesizedText,
	isBuiltinSet,
	isGlobalIdentifier,
} from './utils/index.js';
import {
	isMethodCall,
	isNewExpression,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-iterator-concat';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-concat/suggestion';

const promiseMethods = [
	'all',
	'allSettled',
	'any',
	'race',
];

const messages = {
	[MESSAGE_ID]: 'Use `Iterator.concat(…)` instead of creating a temporary array from spreads.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Iterator.concat(…)`.',
};

const isSpreadArray = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length >= 2
	&& node.elements.every(element => element?.type === 'SpreadElement');

const isPromiseMethodCall = node => isMethodCall(node, {
	object: 'Promise',
	methods: promiseMethods,
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
});

const isFromCallWithMapper = node => isMethodCall(node, {
	objects: ['Array', ...typedArray],
	method: 'from',
	minimumArguments: 2,
	optionalCall: false,
	optionalMember: false,
});

const isIterableAcceptingCall = node =>
	isMethodCall(node, {
		objects: ['Array', ...typedArray],
		method: 'from',
		minimumArguments: 1,
		optionalCall: false,
		optionalMember: false,
	})
	|| isMethodCall(node, {
		object: 'Object',
		method: 'fromEntries',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	|| isPromiseMethodCall(node);

const isIterableAcceptingNewExpression = node =>
	isNewExpression(node, {names: ['Map', 'WeakMap', 'Set', 'WeakSet'], argumentsLength: 1})
	|| isNewExpression(node, {names: typedArray, argumentsLength: 1});

const isInIterableAcceptingParent = node => {
	const {parent} = node;

	return (
		(parent.type === 'ForOfStatement' && parent.right === node)
		|| (parent.type === 'YieldExpression' && parent.delegate && parent.argument === node)
		|| (
			(parent.type === 'CallExpression' || parent.type === 'NewExpression')
			&& parent.arguments[0] === node
			&& (
				isIterableAcceptingCall(parent)
				|| isIterableAcceptingNewExpression(parent)
			)
		)
	);
};

const isToArrayCall = node => isMethodCall(node, {
	method: 'toArray',
	argumentsLength: 0,
	optionalCall: false,
	optionalMember: false,
});

const hasToArraySpreadElement = arrayExpression =>
	arrayExpression.elements.some(element => isToArrayCall(element.argument));

const isKnownSetUnionCase = (arrayExpression, context) => {
	const {parent} = arrayExpression;

	return (
		isNewExpression(parent, {
			name: 'Set',
			argumentsLength: 1,
		})
		&& parent.arguments[0] === arrayExpression
		&& isGlobalIdentifier(parent.callee, context)
		&& context.sourceCode.getCommentsInside(parent).length === 0
		&& arrayExpression.elements.every(element => isBuiltinSet(element.argument, context))
	);
};

const isSuggestionOnlyParent = parent =>
	(parent.type === 'ForOfStatement' || (parent.type === 'YieldExpression' && parent.delegate))
	|| (
		parent.type === 'CallExpression'
		&& (isPromiseMethodCall(parent) || isFromCallWithMapper(parent))
	);

const getReplacementText = (arrayExpression, context) => {
	const argumentsText = arrayExpression.elements
		.map(element => getParenthesizedText(element.argument, context))
		.join(', ');

	return `Iterator.concat(${argumentsText})`;
};

const getFix = (arrayExpression, context) => {
	if (context.sourceCode.getCommentsInside(arrayExpression).length > 0) {
		return;
	}

	return fixer => fixer.replaceText(arrayExpression, getReplacementText(arrayExpression, context));
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ArrayExpression', node => {
		if (
			!isSpreadArray(node)
			|| !isInIterableAcceptingParent(node)
			|| hasToArraySpreadElement(node)
			|| isKnownSetUnionCase(node, context)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};
		const fix = getFix(node, context);

		if (isSuggestionOnlyParent(node.parent)) {
			if (!fix) {
				return problem;
			}

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

		if (!fix) {
			return problem;
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
			description: 'Prefer `Iterator.concat(…)` over temporary spread arrays.',
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
