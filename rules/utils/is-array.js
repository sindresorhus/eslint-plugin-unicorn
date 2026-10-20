import {findVariable} from '@eslint-community/eslint-utils';
import {isFunction, isMethodCall} from '../ast/index.js';
import typedArray from '../shared/typed-array.js';
import {
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
} from './type-helpers.js';

const nonArrayExpressionTypes = new Set([
	'ObjectExpression',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'TemplateLiteral',
]);

const knownNonIndexedCollectionTypeNames = new Set([
	'Map',
	'ReadonlyMap',
	'WeakMap',
	'Set',
	'ReadonlySet',
	'WeakSet',
	'CanvasRenderingContext2D',
	'OffscreenCanvasRenderingContext2D',
]);

const bigIntTypedArrayTypeNames = new Set([
	'BigInt64Array',
	'BigUint64Array',
]);

const isTypedArrayFactory = node => isMethodCall(node, {
	objects: typedArray,
	methods: ['from', 'of'],
	optionalCall: false,
	optionalMember: false,
});

const knownNonArrayTypeNames = new Set([
	...typedArray,
	...knownNonIndexedCollectionTypeNames,
]);

const isArrayTypeAnnotation = node =>
	node?.type === 'TSArrayType'
	|| node?.type === 'TSTupleType';

/**
Recognize simple rest bindings while they retain the array created by parameter collection.
*/
function isRestParameter(node, context) {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	const parameter = definition?.name?.parent;
	return definition?.type === 'Parameter'
		&& parameter?.type === 'RestElement'
		&& isFunction(definition.node)
		&& definition.node.params.includes(parameter)
		&& variable.references.every(reference => !reference.isWrite());
}

const isArrayNode = (node, context) =>
	node.type === 'ArrayExpression'
	|| isRestParameter(node, context)
	|| isMethodCall(node, {
		object: 'Array',
		methods: ['from', 'of'],
		optionalCall: false,
		optionalMember: false,
	});

const isNonArrayNode = node =>
	node.type === 'NewExpression'
	|| nonArrayExpressionTypes.has(node.type)
	|| isTypedArrayFactory(node);

const getStaticType = (value, node) => {
	if (Array.isArray(value)) {
		return target;
	}

	return node.type === 'Identifier' || node.type === 'MemberExpression'
		? unknown
		: nonTarget;
};

const arrayTypeCheckerOptions = {
	checkClassHeritage: false,
	preferTypeReferenceDefinitions: true,
	targetTypeNames: new Set([
		'Array',
		'ReadonlyArray',
	]),
	nonTargetTypeNames: knownNonArrayTypeNames,
	targetCallNames: ['Array'],
	targetConstructorNames: ['Array'],
	isTargetNode: isArrayNode,
	isNonTargetNode: isNonArrayNode,
	isTargetTypeAnnotation: isArrayTypeAnnotation,
	isTargetType: (type, checker) => checker.isArrayType(type) || checker.isTupleType(type),
	getStaticType,
};

const {
	isTarget: isArray,
	isKnownNonTarget: isKnownNonArray,
} = createTypeCheckers(arrayTypeCheckerOptions);

/*
The indexed collections, `Array` and the typed arrays. A typed array is not an array, but it carries most of `Array`'s method surface (`sort()`, `with()`, `forEach()`, `join()`, `reduce()`, `indexOf()`, and the iteration methods), so rules about those methods read correctly on a typed array receiver.

A typed array name must be a target in both of the ways it can be spelled, otherwise the two disagree: `targetTypeNames` covers the annotation `foo: Uint8Array` and the type-information symbol lookup, `targetConstructorNames` covers `new Uint8Array()`, which the blanket `NewExpression` rule in `isNonArrayNode` would otherwise claim.
*/
const {
	isTarget: isIndexedCollection,
	isKnownNonTarget: isKnownNonIndexedCollection,
} = createTypeCheckers({
	...arrayTypeCheckerOptions,
	targetTypeNames: new Set([
		...arrayTypeCheckerOptions.targetTypeNames,
		...typedArray,
	]),
	nonTargetTypeNames: knownNonIndexedCollectionTypeNames,
	targetConstructorNames: ['Array', ...typedArray],
	isTargetNode: (node, context) => isArrayNode(node, context) || isTypedArrayFactory(node),
});

const {isTarget: isKnownBigIntTypedArray} = createTypeCheckers({
	treatMixedUnionAsTarget: true,
	targetTypeNames: bigIntTypedArrayTypeNames,
	targetConstructorNames: [...bigIntTypedArrayTypeNames],
	isTargetNode: node => isTypedArrayFactory(node) && bigIntTypedArrayTypeNames.has(node.callee.object.name),
});

export {
	isIndexedCollection,
	isKnownNonArray,
	isKnownNonIndexedCollection,
	isKnownBigIntTypedArray,
};

export default isArray;
