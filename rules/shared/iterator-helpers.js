import {isMethodCall} from '../ast/index.js';
import {
	isArray,
	isTypeScriptExpressionWrapper,
} from '../utils/index.js';
import {createTypeCheckers} from '../utils/type-helpers.js';

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

const iteratorTypeNames = new Set([
	'ArrayIterator',
	'Generator',
	'IterableIterator',
	'Iterator',
	'IteratorObject',
	'MapIterator',
	'RegExpStringIterator',
	'SetIterator',
]);

const {
	isTarget: isIteratorType,
} = createTypeCheckers({
	checkClassHeritage: false,
	preferTypeReferenceDefinitions: true,
	targetTypeNames: iteratorTypeNames,
});

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

const hasLocalIteratorTypeName = (node, context) => {
	for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
		for (const typeName of iteratorTypeNames) {
			if (scope.set.get(typeName)?.defs.length > 0) {
				return true;
			}
		}
	}

	return false;
};

const isKnownIteratorTypeExpression = (node, context) => (
	!hasLocalIteratorTypeName(node, context)
	&& !isArray(node, context)
	&& isIteratorType(node, context)
);

export function isIteratorExpression(node, context) {
	node = unwrapExpression(node);

	return (
		isGlobalIteratorMethodCall(node, context)
		|| isIteratorMethodCall(node)
		|| isLazyIteratorHelperCall(node, context)
		|| isKnownIteratorTypeExpression(node, context)
	);
}
