import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-duplicate-loops';
const messages = {
	[MESSAGE_ID]: 'Do not use `.{{method}}()` directly in a `{{loopKind}}` loop header. It creates an intermediate array before the loop.',
};

const duplicateIterationMethods = [
	'filter',
	'map',
];

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

const iteratorStaticMethods = [
	'concat',
	'from',
	'zip',
	'zipKeyed',
];

const isGlobalIteratorReference = (node, sourceCode) => {
	if (node.type === 'Identifier') {
		return node.name === 'Iterator' && sourceCode.isGlobalReference(node);
	}

	return (
		node.type === 'MemberExpression'
		&& !node.optional
		&& !node.computed
		&& node.property.type === 'Identifier'
		&& node.property.name === 'Iterator'
		&& node.object.type === 'Identifier'
		&& node.object.name === 'globalThis'
		&& sourceCode.isGlobalReference(node.object)
	);
};

const isGlobalIteratorMethodCall = (node, sourceCode) =>
	isMethodCall(node, {
		methods: iteratorStaticMethods,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	&& isGlobalIteratorReference(node.callee.object, sourceCode);

const isIteratorMethodCall = node =>
	isMethodCall(node, {
		methods: iteratorMethods,
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	|| isMethodCall(node, {
		method: 'matchAll',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	});

const isLazyIteratorHelperCall = (node, sourceCode) =>
	isMethodCall(node, {
		methods: iteratorHelperMethods,
		minimumArguments: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	&& isIteratorExpression(node.callee.object, sourceCode);

function isIteratorExpression(node, sourceCode) {
	return (
		isGlobalIteratorMethodCall(node, sourceCode)
		|| isIteratorMethodCall(node)
		|| isLazyIteratorHelperCall(node, sourceCode)
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ForOfStatement', node => {
		const {right} = node;

		if (!isMethodCall(right, {
			methods: duplicateIterationMethods,
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		if (isIteratorExpression(right.callee.object, context.sourceCode)) {
			return;
		}

		return {
			node: right.callee.property,
			messageId: MESSAGE_ID,
			data: {
				loopKind: node.await ? 'for await…of' : 'for…of',
				method: right.callee.property.name,
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
			description: 'Disallow `.map()` and `.filter()` in `for…of` and `for await…of` loop headers.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
