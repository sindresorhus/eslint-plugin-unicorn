import {isMethodCall} from './ast/index.js';
import {isIteratorExpression, isLazyIteratorHelperCall, unwrapExpression} from './shared/iterator-helpers.js';

const MESSAGE_ID = 'no-unreadable-for-of-expression';
const messages = {
	[MESSAGE_ID]: 'Move the complex iterable expression out of the `{{loopKind}}` loop header.',
};

const arrayIterationMethods = [
	'filter',
	'map',
];

const isSimpleProperty = node =>
	node.type === 'Identifier'
	|| node.type === 'PrivateIdentifier';

function isSimpleMemberExpression(node) {
	if (
		node.type !== 'MemberExpression'
		|| node.optional
		|| node.computed
		|| !isSimpleProperty(node.property)
	) {
		return false;
	}

	return isSimpleIterableExpression(node.object);
}

function isSimpleArgumentExpression(node) {
	node = unwrapExpression(node);

	return (
		node.type === 'Identifier'
		|| node.type === 'ThisExpression'
		|| node.type === 'Super'
		|| node.type === 'Literal'
		|| node.type === 'TemplateLiteral'
		|| isSimpleMemberExpression(node)
		|| (
			node.type === 'CallExpression'
			&& !node.optional
			&& node.arguments.length === 0
			&& (
				node.callee.type === 'Identifier'
				|| isSimpleMemberExpression(node.callee)
			)
		)
	);
}

const isSimpleCallExpression = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& !shouldSkipDuplicateLoopCase(node)
	&& (
		node.callee.type === 'Identifier'
		|| isSimpleMemberExpression(node.callee)
	)
	&& node.arguments.every(argument => isSimpleArgumentExpression(argument));

function isSimpleIterableExpression(node) {
	node = unwrapExpression(node);

	return (
		node.type === 'Identifier'
		|| node.type === 'ThisExpression'
		|| node.type === 'Super'
		|| node.type === 'ArrayExpression'
		|| node.type === 'Literal'
		|| isSimpleMemberExpression(node)
		|| isSimpleCallExpression(node)
	);
}

const shouldSkipDuplicateLoopCase = node =>
	isMethodCall(node, {
		methods: arrayIterationMethods,
		minimumArguments: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	});

const isDuplicateLoopCase = (node, context) =>
	shouldSkipDuplicateLoopCase(node)
	&& !isIteratorExpression(node.callee.object, context);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ForOfStatement', node => {
		const right = unwrapExpression(node.right);

		if (
			!isLazyIteratorHelperCall(right, context)
			&& (
				isDuplicateLoopCase(right, context)
				|| isSimpleIterableExpression(right)
			)
		) {
			return;
		}

		return {
			node: node.right,
			messageId: MESSAGE_ID,
			data: {
				loopKind: node.await ? 'for await…of' : 'for…of',
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
			description: 'Disallow unreadable iterable expressions in `for…of` and `for await…of` loop headers.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
