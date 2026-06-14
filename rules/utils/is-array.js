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

const knownNonArrayTypeNames = new Set([
	...typedArray,
	'Map',
	'ReadonlyMap',
	'WeakMap',
	'Set',
	'ReadonlySet',
	'WeakSet',
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

const {
	isTarget: isArray,
	isKnownNonTarget: isKnownNonArray,
} = createTypeCheckers({
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
});

export {
	isKnownNonArray,
};

export default isArray;
