import {isMethodCall} from '../ast/index.js';
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

const keyedCollectionTypeNames = new Set([
	'Map',
	'ReadonlyMap',
	'WeakMap',
	'Set',
	'ReadonlySet',
	'WeakSet',
]);

const bigIntTypedArrayTypeNames = new Set([
	'BigInt64Array',
	'BigUint64Array',
]);

const isBigIntTypedArrayNode = node => isMethodCall(node, {
	objects: [...bigIntTypedArrayTypeNames],
	methods: ['from', 'of'],
	optionalCall: false,
	optionalMember: false,
});

const knownNonArrayTypeNames = new Set([
	...typedArray,
	...keyedCollectionTypeNames,
]);

const isArrayTypeAnnotation = node =>
	node?.type === 'TSArrayType'
	|| node?.type === 'TSTupleType';

const isArrayNode = node =>
	node.type === 'ArrayExpression'
	|| isMethodCall(node, {
		object: 'Array',
		methods: ['from', 'of'],
		optionalCall: false,
		optionalMember: false,
	});

const isNonArrayNode = node =>
	node.type === 'NewExpression'
	|| nonArrayExpressionTypes.has(node.type);

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
	isKnownNonTarget: isKnownNonIndexedCollection,
} = createTypeCheckers({
	...arrayTypeCheckerOptions,
	targetTypeNames: new Set([
		...arrayTypeCheckerOptions.targetTypeNames,
		...typedArray,
	]),
	nonTargetTypeNames: keyedCollectionTypeNames,
	targetConstructorNames: ['Array', ...typedArray],
});

const {isTarget: isKnownBigIntTypedArray} = createTypeCheckers({
	treatMixedUnionAsTarget: true,
	targetTypeNames: bigIntTypedArrayTypeNames,
	targetConstructorNames: [...bigIntTypedArrayTypeNames],
	isTargetNode: isBigIntTypedArrayNode,
});

export {
	isKnownNonArray,
	isKnownNonIndexedCollection,
	isKnownBigIntTypedArray,
};

export default isArray;
