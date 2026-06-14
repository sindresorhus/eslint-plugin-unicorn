import {isMethodCall} from '../ast/index.js';
import {isTypeScriptExpressionWrapper} from '../utils/index.js';

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

export const unwrapExpression = node => {
	while (
		isTypeScriptExpressionWrapper(node)
		|| node.type === 'ChainExpression'
		|| node.type === 'ParenthesizedExpression'
	) {
		node = node.expression;
	}

	return node;
};

const isGlobalIteratorReference = (node, context) => {
	node = unwrapExpression(node);

	if (node.type === 'Identifier') {
		return node.name === 'Iterator' && context.sourceCode.isGlobalReference(node);
	}

	if (
		node.type !== 'MemberExpression'
		|| node.optional
		|| node.computed
		|| node.property.type !== 'Identifier'
		|| node.property.name !== 'Iterator'
	) {
		return false;
	}

	const object = unwrapExpression(node.object);

	return object.type === 'Identifier'
		&& object.name === 'globalThis'
		&& context.sourceCode.isGlobalReference(object);
};

const isGlobalIteratorMethodCall = (node, context) =>
	isMethodCall(node, {
		methods: iteratorStaticMethods,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	&& isGlobalIteratorReference(node.callee.object, context);

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

export const isLazyIteratorHelperCall = (node, context) =>
	isMethodCall(node, {
		methods: iteratorHelperMethods,
		minimumArguments: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})
	&& isIteratorExpression(node.callee.object, context);

export function isIteratorExpression(node, context) {
	node = unwrapExpression(node);

	return (
		isGlobalIteratorMethodCall(node, context)
		|| isIteratorMethodCall(node)
		|| isLazyIteratorHelperCall(node, context)
	);
}
