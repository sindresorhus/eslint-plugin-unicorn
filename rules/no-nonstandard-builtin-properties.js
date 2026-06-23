import {
	isRegexLiteral,
	isStringLiteral,
} from './ast/index.js';
import {isGlobalIdentifier} from './utils/index.js';

const MESSAGE_ID_NONSTANDARD = 'no-nonstandard-builtin-properties/nonstandard';
const MESSAGE_ID_NONCALLABLE = 'no-nonstandard-builtin-properties/noncallable';
const MESSAGE_ID_NONCONSTRUCTIBLE = 'no-nonstandard-builtin-properties/nonconstructible';

const messages = {
	[MESSAGE_ID_NONSTANDARD]: '`{{property}}` is not a standard property of `{{receiver}}`.',
	[MESSAGE_ID_NONCALLABLE]: '`{{property}}` is not a callable property of `{{receiver}}`.',
	[MESSAGE_ID_NONCONSTRUCTIBLE]: '`{{property}}` is not a constructible property of `{{receiver}}`.',
};

const expressionWrapperTypes = new Set([
	'ChainExpression',
	'ParenthesizedExpression',
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const globalObjectNames = new Set([
	'globalThis',
	'global',
	'self',
	'window',
]);

const typedArrayTypeNamesExceptUint8Array = [
	'Int8Array',
	'Uint8ClampedArray',
	'Int16Array',
	'Uint16Array',
	'Int32Array',
	'Uint32Array',
	'Float16Array',
	'Float32Array',
	'Float64Array',
	'BigInt64Array',
	'BigUint64Array',
];

const typedArrayInstanceTypeNames = new Set([
	'Uint8Array',
	...typedArrayTypeNamesExceptUint8Array,
]);

const objectPrototypeProperties = [
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'__proto__',
	'constructor',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'toString',
	'valueOf',
];

const objectPrototypeMethods = objectPrototypeProperties.filter(propertyName => (
	propertyName !== '__proto__'
	&& propertyName !== 'constructor'
));

const functionPrototypeProperties = [
	...objectPrototypeProperties,
	'apply',
	'arguments',
	'bind',
	'call',
	'caller',
	'length',
	'name',
];

const functionPrototypeMethods = [
	...objectPrototypeMethods,
	'apply',
	'bind',
	'call',
];

const createPropertyInfo = ({
	properties = [],
	methods = [],
	inheritedProperties = objectPrototypeProperties,
	inheritedMethods = objectPrototypeMethods,
} = {}) => ({
	all: new Set([
		...inheritedProperties,
		...properties,
		...methods,
	]),
	callable: new Set([
		...inheritedMethods,
		...methods,
	]),
});

const createFunctionPropertyInfo = ({properties = [], methods = []} = {}) => createPropertyInfo({
	inheritedProperties: functionPrototypeProperties,
	inheritedMethods: functionPrototypeMethods,
	properties,
	methods,
});

const createConstructorPropertyInfo = ({properties = [], methods = []} = {}) => createFunctionPropertyInfo({
	properties: [
		'prototype',
		...properties,
	],
	methods,
});

const extendPropertyInfo = (propertyInfo, {properties = [], methods = []}) => ({
	all: new Set([
		...propertyInfo.all,
		...properties,
		...methods,
	]),
	callable: new Set([
		...propertyInfo.callable,
		...methods,
	]),
});

const arrayPrototype = createPropertyInfo({
	properties: ['length'],
	methods: [
		'at',
		'concat',
		'copyWithin',
		'entries',
		'every',
		'fill',
		'filter',
		'find',
		'findIndex',
		'findLast',
		'findLastIndex',
		'flat',
		'flatMap',
		'forEach',
		'includes',
		'indexOf',
		'join',
		'keys',
		'lastIndexOf',
		'map',
		'pop',
		'push',
		'reduce',
		'reduceRight',
		'reverse',
		'shift',
		'slice',
		'some',
		'sort',
		'splice',
		'toReversed',
		'toSorted',
		'toSpliced',
		'unshift',
		'values',
		'with',
	],
});

const arrayBufferPrototype = createPropertyInfo({
	properties: [
		'byteLength',
		'detached',
		'maxByteLength',
		'resizable',
	],
	methods: [
		'resize',
		'slice',
		'transfer',
		'transferToFixedLength',
	],
});

const dataViewPrototype = createPropertyInfo({
	properties: [
		'buffer',
		'byteLength',
		'byteOffset',
	],
	methods: [
		'getBigInt64',
		'getBigUint64',
		'getFloat16',
		'getFloat32',
		'getFloat64',
		'getInt16',
		'getInt32',
		'getInt8',
		'getUint16',
		'getUint32',
		'getUint8',
		'setBigInt64',
		'setBigUint64',
		'setFloat16',
		'setFloat32',
		'setFloat64',
		'setInt16',
		'setInt32',
		'setInt8',
		'setUint16',
		'setUint32',
		'setUint8',
	],
});

const datePrototype = createPropertyInfo({
	methods: [
		'getDate',
		'getDay',
		'getFullYear',
		'getHours',
		'getMilliseconds',
		'getMinutes',
		'getMonth',
		'getSeconds',
		'getTime',
		'getTimezoneOffset',
		'getUTCDate',
		'getUTCDay',
		'getUTCFullYear',
		'getUTCHours',
		'getUTCMilliseconds',
		'getUTCMinutes',
		'getUTCMonth',
		'getUTCSeconds',
		'getYear',
		'setDate',
		'setFullYear',
		'setHours',
		'setMilliseconds',
		'setMinutes',
		'setMonth',
		'setSeconds',
		'setTime',
		'setUTCDate',
		'setUTCFullYear',
		'setUTCHours',
		'setUTCMilliseconds',
		'setUTCMinutes',
		'setUTCMonth',
		'setUTCSeconds',
		'setYear',
		'toDateString',
		'toGMTString',
		'toISOString',
		'toJSON',
		'toLocaleDateString',
		'toLocaleTimeString',
		'toTimeString',
		'toUTCString',
	],
});

const functionPrototype = createPropertyInfo({
	inheritedProperties: functionPrototypeProperties,
	inheritedMethods: functionPrototypeMethods,
});

const functionInstance = createPropertyInfo({
	inheritedProperties: functionPrototypeProperties,
	inheritedMethods: functionPrototypeMethods,
	properties: ['prototype'],
});

const errorPrototype = createPropertyInfo({
	properties: [
		'message',
		'name',
		// Deliberate exception to the published-spec-only boundary below: `stack` is a stage-3 proposal (https://github.com/tc39/proposal-error-stack-accessor) that is universally implemented across engines.
		'stack',
	],
	methods: [
		'toString',
	],
});

const errorInstance = createPropertyInfo({
	inheritedProperties: errorPrototype.all,
	inheritedMethods: errorPrototype.callable,
	properties: [
		'cause',
		'message',
	],
});

const aggregateErrorInstance = extendPropertyInfo(errorInstance, {
	properties: ['errors'],
});

const errorStatic = createConstructorPropertyInfo({
	methods: ['isError'],
});

const objectPrototypePropertyInfo = createPropertyInfo();

const finalizationRegistryPrototype = createPropertyInfo({
	methods: [
		'register',
		'unregister',
	],
});

const iteratorPrototype = createPropertyInfo({
	methods: [
		'drop',
		'every',
		'filter',
		'find',
		'flatMap',
		'forEach',
		'map',
		'reduce',
		'some',
		'take',
		'toArray',
	],
});

const mapPrototype = createPropertyInfo({
	properties: ['size'],
	methods: [
		'clear',
		'delete',
		'entries',
		'forEach',
		'get',
		'getOrInsert',
		'getOrInsertComputed',
		'has',
		'keys',
		'set',
		'values',
	],
});

const numberPrototype = createPropertyInfo({
	methods: [
		'toExponential',
		'toFixed',
		'toPrecision',
	],
});

const objectStatic = createConstructorPropertyInfo({
	methods: [
		'assign',
		'create',
		'defineProperties',
		'defineProperty',
		'entries',
		'freeze',
		'fromEntries',
		'getOwnPropertyDescriptor',
		'getOwnPropertyDescriptors',
		'getOwnPropertyNames',
		'getOwnPropertySymbols',
		'getPrototypeOf',
		'groupBy',
		'hasOwn',
		'is',
		'isExtensible',
		'isFrozen',
		'isSealed',
		'keys',
		'preventExtensions',
		'seal',
		'setPrototypeOf',
		'values',
	],
});

const promisePrototype = createPropertyInfo({
	methods: [
		'catch',
		'finally',
		'then',
	],
});

const regexpProperties = [
	'dotAll',
	'flags',
	'global',
	'hasIndices',
	'ignoreCase',
	'multiline',
	'source',
	'sticky',
	'unicode',
	'unicodeSets',
];

const regexpMethods = [
	'compile',
	'exec',
	'test',
];

const regexpPrototype = createPropertyInfo({
	properties: regexpProperties,
	methods: [
		...regexpMethods,
	],
});

const regexpInstance = createPropertyInfo({
	properties: [
		...regexpProperties,
		'lastIndex',
	],
	methods: [
		...regexpMethods,
	],
});

const setPrototype = createPropertyInfo({
	properties: ['size'],
	methods: [
		'add',
		'clear',
		'delete',
		'difference',
		'entries',
		'forEach',
		'has',
		'intersection',
		'isDisjointFrom',
		'isSubsetOf',
		'isSupersetOf',
		'keys',
		'symmetricDifference',
		'union',
		'values',
	],
});

const sharedArrayBufferPrototype = createPropertyInfo({
	properties: [
		'byteLength',
		'growable',
		'maxByteLength',
	],
	methods: [
		'grow',
		'slice',
	],
});

const stringPrototype = createPropertyInfo({
	properties: ['length'],
	methods: [
		'at',
		'anchor',
		'big',
		'blink',
		'bold',
		'charAt',
		'charCodeAt',
		'codePointAt',
		'concat',
		'endsWith',
		'fixed',
		'fontcolor',
		'fontsize',
		'includes',
		'indexOf',
		'isWellFormed',
		'italics',
		'lastIndexOf',
		'link',
		'localeCompare',
		'match',
		'matchAll',
		'normalize',
		'padEnd',
		'padStart',
		'repeat',
		'replace',
		'replaceAll',
		'search',
		'slice',
		'small',
		'split',
		'startsWith',
		'strike',
		'sub',
		'substr',
		'substring',
		'sup',
		'toLocaleLowerCase',
		'toLocaleUpperCase',
		'toLowerCase',
		'toUpperCase',
		'toWellFormed',
		'trim',
		'trimEnd',
		'trimLeft',
		'trimRight',
		'trimStart',
	],
});

const symbolPrototype = createPropertyInfo({
	properties: ['description'],
});

const typedArrayPrototype = createPropertyInfo({
	properties: [
		'BYTES_PER_ELEMENT',
		'buffer',
		'byteLength',
		'byteOffset',
		'length',
	],
	methods: [
		'at',
		'copyWithin',
		'entries',
		'every',
		'fill',
		'filter',
		'find',
		'findIndex',
		'findLast',
		'findLastIndex',
		'forEach',
		'includes',
		'indexOf',
		'join',
		'keys',
		'lastIndexOf',
		'map',
		'reduce',
		'reduceRight',
		'reverse',
		'set',
		'slice',
		'some',
		'sort',
		'subarray',
		'toReversed',
		'toSorted',
		'values',
		'with',
	],
});

const urlPrototype = createPropertyInfo({
	properties: [
		'hash',
		'host',
		'hostname',
		'href',
		'origin',
		'password',
		'pathname',
		'port',
		'protocol',
		'search',
		'searchParams',
		'username',
	],
	methods: [
		'toJSON',
	],
});

const urlSearchParametersPrototype = createPropertyInfo({
	properties: ['size'],
	methods: [
		'append',
		'delete',
		'entries',
		'forEach',
		'get',
		'getAll',
		'has',
		'keys',
		'set',
		'sort',
		'values',
	],
});

const weakMapPrototype = createPropertyInfo({
	methods: [
		'delete',
		'get',
		'getOrInsert',
		'getOrInsertComputed',
		'has',
		'set',
	],
});

const weakSetPrototype = createPropertyInfo({
	methods: [
		'add',
		'delete',
		'has',
	],
});

const weakReferencePrototype = createPropertyInfo({
	methods: ['deref'],
});

const typedArrayStatic = createConstructorPropertyInfo({
	properties: ['BYTES_PER_ELEMENT'],
	methods: [
		'from',
		'of',
	],
});

const uint8ArrayPrototype = extendPropertyInfo(typedArrayPrototype, {
	methods: [
		'setFromBase64',
		'setFromHex',
		'toBase64',
		'toHex',
	],
});

const uint8ArrayStatic = extendPropertyInfo(typedArrayStatic, {
	methods: [
		'fromBase64',
		'fromHex',
	],
});

const typedArrayObjects = Object.fromEntries(typedArrayTypeNamesExceptUint8Array.map(typeName => [
	typeName,
	{
		instance: typedArrayPrototype,
		prototype: typedArrayPrototype,
		static: typedArrayStatic,
	},
]));

// Boundary: Latest published ECMAScript edition plus selected web-standard built-ins only; no proposal, next-edition, or runtime-specific properties until a deliberate baseline bump.
const nativeObjects = new Map(Object.entries({
	AggregateError: {
		instance: aggregateErrorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	Atomics: {
		static: createPropertyInfo({
			methods: [
				'add',
				'and',
				'compareExchange',
				'exchange',
				'isLockFree',
				'load',
				'notify',
				'or',
				'store',
				'sub',
				'wait',
				'waitAsync',
				'xor',
			],
		}),
	},
	Array: {
		instance: arrayPrototype,
		prototype: arrayPrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'from',
				'fromAsync',
				'isArray',
				'of',
			],
		}),
	},
	ArrayBuffer: {
		instance: arrayBufferPrototype,
		prototype: arrayBufferPrototype,
		static: createConstructorPropertyInfo({
			methods: ['isView'],
		}),
	},
	BigInt: {
		instance: objectPrototypePropertyInfo,
		prototype: objectPrototypePropertyInfo,
		static: createConstructorPropertyInfo({
			methods: [
				'asIntN',
				'asUintN',
			],
		}),
	},
	Boolean: {
		instance: objectPrototypePropertyInfo,
		prototype: objectPrototypePropertyInfo,
		static: createConstructorPropertyInfo(),
	},
	DataView: {
		instance: dataViewPrototype,
		prototype: dataViewPrototype,
		static: createConstructorPropertyInfo(),
	},
	Error: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	EvalError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	FinalizationRegistry: {
		instance: finalizationRegistryPrototype,
		prototype: finalizationRegistryPrototype,
		static: createConstructorPropertyInfo(),
	},
	Date: {
		instance: datePrototype,
		prototype: datePrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'now',
				'parse',
				'UTC',
			],
		}),
	},
	Function: {
		instance: functionInstance,
		prototype: functionPrototype,
		static: createConstructorPropertyInfo(),
	},
	Map: {
		instance: mapPrototype,
		prototype: mapPrototype,
		static: createConstructorPropertyInfo({
			methods: ['groupBy'],
		}),
	},
	Iterator: {
		instance: iteratorPrototype,
		prototype: iteratorPrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'concat',
				'from',
			],
		}),
	},
	Number: {
		instance: numberPrototype,
		prototype: numberPrototype,
		static: createConstructorPropertyInfo({
			properties: [
				'EPSILON',
				'MAX_SAFE_INTEGER',
				'MAX_VALUE',
				'MIN_SAFE_INTEGER',
				'MIN_VALUE',
				'NaN',
				'NEGATIVE_INFINITY',
				'POSITIVE_INFINITY',
			],
			methods: [
				'isFinite',
				'isInteger',
				'isNaN',
				'isSafeInteger',
				'parseFloat',
				'parseInt',
			],
		}),
	},
	Object: {
		instance: objectPrototypePropertyInfo,
		prototype: objectPrototypePropertyInfo,
		static: objectStatic,
	},
	Promise: {
		instance: promisePrototype,
		prototype: promisePrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'all',
				'allSettled',
				'any',
				'race',
				'reject',
				'resolve',
				'try',
				'withResolvers',
			],
		}),
	},
	RangeError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	ReferenceError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	Proxy: {
		static: createFunctionPropertyInfo({
			methods: ['revocable'],
		}),
	},
	RegExp: {
		instance: regexpInstance,
		prototype: regexpPrototype,
		static: createConstructorPropertyInfo({
			methods: ['escape'],
		}),
	},
	Set: {
		instance: setPrototype,
		prototype: setPrototype,
		static: createConstructorPropertyInfo(),
	},
	SharedArrayBuffer: {
		instance: sharedArrayBufferPrototype,
		prototype: sharedArrayBufferPrototype,
		static: createConstructorPropertyInfo(),
	},
	String: {
		instance: stringPrototype,
		prototype: stringPrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'fromCharCode',
				'fromCodePoint',
				'raw',
			],
		}),
	},
	SyntaxError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	Symbol: {
		instance: symbolPrototype,
		prototype: symbolPrototype,
		static: createConstructorPropertyInfo({
			properties: [
				'asyncIterator',
				'hasInstance',
				'isConcatSpreadable',
				'iterator',
				'match',
				'matchAll',
				'replace',
				'search',
				'species',
				'split',
				'toPrimitive',
				'toStringTag',
				'unscopables',
			],
			methods: [
				'for',
				'keyFor',
			],
		}),
	},
	URL: {
		instance: urlPrototype,
		prototype: urlPrototype,
		static: createConstructorPropertyInfo({
			methods: [
				'canParse',
				'createObjectURL',
				'parse',
				'revokeObjectURL',
			],
		}),
	},
	URLSearchParams: {
		instance: urlSearchParametersPrototype,
		prototype: urlSearchParametersPrototype,
		static: createConstructorPropertyInfo(),
	},
	TypeError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	URIError: {
		instance: errorInstance,
		prototype: errorPrototype,
		static: errorStatic,
	},
	WeakMap: {
		instance: weakMapPrototype,
		prototype: weakMapPrototype,
		static: createConstructorPropertyInfo(),
	},
	WeakSet: {
		instance: weakSetPrototype,
		prototype: weakSetPrototype,
		static: createConstructorPropertyInfo(),
	},
	WeakRef: {
		instance: weakReferencePrototype,
		prototype: weakReferencePrototype,
		static: createConstructorPropertyInfo(),
	},
	...typedArrayObjects,
	Uint8Array: {
		instance: uint8ArrayPrototype,
		prototype: uint8ArrayPrototype,
		static: uint8ArrayStatic,
	},
	JSON: {
		static: createPropertyInfo({
			methods: [
				'isRawJSON',
				'parse',
				'rawJSON',
				'stringify',
			],
		}),
	},
	Math: {
		static: createPropertyInfo({
			properties: [
				'E',
				'LN10',
				'LN2',
				'LOG10E',
				'LOG2E',
				'PI',
				'SQRT1_2',
				'SQRT2',
			],
			methods: [
				'abs',
				'acos',
				'acosh',
				'asin',
				'asinh',
				'atan',
				'atan2',
				'atanh',
				'cbrt',
				'ceil',
				'clz32',
				'cos',
				'cosh',
				'exp',
				'expm1',
				'f16round',
				'floor',
				'fround',
				'hypot',
				'imul',
				'log',
				'log10',
				'log1p',
				'log2',
				'max',
				'min',
				'pow',
				'random',
				'round',
				'sign',
				'sin',
				'sinh',
				'sqrt',
				'sumPrecise',
				'tan',
				'tanh',
				'trunc',
			],
		}),
	},
	Reflect: {
		static: createPropertyInfo({
			methods: [
				'apply',
				'construct',
				'defineProperty',
				'deleteProperty',
				'get',
				'getOwnPropertyDescriptor',
				'getPrototypeOf',
				'has',
				'isExtensible',
				'ownKeys',
				'preventExtensions',
				'set',
				'setPrototypeOf',
			],
		}),
	},
}));

const unwrapExpression = node => {
	while (expressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const getOutermostExpression = node => {
	while (
		expressionWrapperTypes.has(node.parent.type)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
};

const getStaticPropertyName = node => {
	const {property} = node;

	if (!node.computed) {
		return property.type === 'Identifier' ? property.name : undefined;
	}

	if (isStringLiteral(property)) {
		return property.value;
	}

	if (
		property.type === 'TemplateLiteral'
		&& property.expressions.length === 0
	) {
		return property.quasis[0].value.cooked;
	}
};

const maximumArrayIndex = (2 ** 32) - 2;

const isArrayIndexString = string => /^(?:0|[1-9]\d*)$/.test(string) && Number(string) <= maximumArrayIndex;

const isCanonicalNumericIndexString = string => string === '-0' || String(Number(string)) === string;

const isIndexedAccess = ({typeName, usage}, propertyName) => {
	if (usage !== 'instance') {
		return false;
	}

	if (
		typeName === 'Array'
		|| typeName === 'String'
	) {
		return isArrayIndexString(propertyName);
	}

	return typedArrayInstanceTypeNames.has(typeName)
		&& isCanonicalNumericIndexString(propertyName);
};

const isGlobalObjectReference = (node, context) => {
	node = unwrapExpression(node);

	return node.type === 'Identifier'
		&& globalObjectNames.has(node.name)
		&& isGlobalIdentifier(node, context);
};

const getNativeTypeNameFromReference = (node, context) => {
	node = unwrapExpression(node);

	if (
		node.type === 'Identifier'
		&& nativeObjects.has(node.name)
		&& isGlobalIdentifier(node, context)
	) {
		return node.name;
	}

	if (node.type !== 'MemberExpression') {
		return;
	}

	const propertyName = getStaticPropertyName(node);
	if (!nativeObjects.has(propertyName)) {
		return;
	}

	return isGlobalObjectReference(node.object, context)
		? propertyName
		: undefined;
};

const resolveStaticReference = (node, context) => {
	const typeName = getNativeTypeNameFromReference(node, context);
	if (!typeName) {
		return;
	}

	return {
		typeName,
		usage: 'static',
	};
};

const resolveLiteralReference = node => {
	if (isRegexLiteral(node)) {
		return {
			typeName: 'RegExp',
			usage: 'instance',
		};
	}

	if (typeof node.value === 'boolean') {
		return {
			typeName: 'Boolean',
			usage: 'instance',
		};
	}

	if (typeof node.value === 'number') {
		return {
			typeName: 'Number',
			usage: 'instance',
		};
	}

	if (typeof node.value === 'string') {
		return {
			typeName: 'String',
			usage: 'instance',
		};
	}

	if (
		typeof node.value === 'bigint'
		|| typeof node.bigint === 'string'
	) {
		return {
			typeName: 'BigInt',
			usage: 'instance',
		};
	}
};

const resolveUnaryExpressionReference = node => {
	if (
		node.operator !== '+'
		&& node.operator !== '-'
	) {
		return;
	}

	const argument = unwrapExpression(node.argument);
	if (argument.type !== 'Literal') {
		return;
	}

	const literalReference = resolveLiteralReference(argument);
	if (
		literalReference?.typeName === 'Number'
		|| literalReference?.typeName === 'BigInt'
	) {
		return literalReference;
	}
};

const resolvePrototypeReference = (node, context) => {
	if (getStaticPropertyName(node) !== 'prototype') {
		return;
	}

	const typeName = getNativeTypeNameFromReference(node.object, context);
	if (!typeName) {
		return;
	}

	return {
		typeName,
		usage: 'prototype',
	};
};

const resolveNewExpressionReference = (node, context) => {
	const typeName = getNativeTypeNameFromReference(node.callee, context);
	if (!typeName) {
		return;
	}

	return {
		typeName,
		usage: 'instance',
	};
};

function resolveNativeObjectReference(node, context) {
	node = unwrapExpression(node);

	if (node.type === 'MemberExpression') {
		return resolvePrototypeReference(node, context)
			?? resolveStaticReference(node, context);
	}

	if (node.type === 'Literal') {
		return resolveLiteralReference(node);
	}

	if (node.type === 'Identifier') {
		return resolveStaticReference(node, context);
	}

	if (node.type === 'NewExpression') {
		return resolveNewExpressionReference(node, context);
	}

	if (node.type === 'UnaryExpression') {
		return resolveUnaryExpressionReference(node);
	}

	switch (node.type) {
		case 'ArrayExpression': {
			return {
				typeName: 'Array',
				usage: 'instance',
			};
		}

		case 'TemplateLiteral': {
			return {
				typeName: 'String',
				usage: 'instance',
			};
		}

		// No default
	}
}

const getCallKind = node => {
	node = getOutermostExpression(node);

	if (
		node.parent.type === 'CallExpression'
		&& node.parent.callee === node
	) {
		return 'call';
	}

	if (
		node.parent.type === 'NewExpression'
		&& node.parent.callee === node
	) {
		return 'construct';
	}

	if (
		(
			node.parent.type === 'ClassDeclaration'
			|| node.parent.type === 'ClassExpression'
		)
		&& node.parent.superClass === node
	) {
		return 'construct';
	}

	if (
		node.parent.type === 'TaggedTemplateExpression'
		&& node.parent.tag === node
	) {
		return 'call';
	}
};

const getReceiverName = ({typeName, usage}) => {
	if (usage === 'static') {
		return typeName;
	}

	if (usage === 'prototype') {
		return `${typeName}.prototype`;
	}

	return `${typeName} instances`;
};

const getProblem = (node, nativeObjectReference, propertyName, messageId) => ({
	node,
	messageId,
	data: {
		property: propertyName,
		receiver: getReceiverName(nativeObjectReference),
	},
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		const propertyName = getStaticPropertyName(node);
		if (propertyName === undefined) {
			return;
		}

		const nativeObjectReference = resolveNativeObjectReference(node.object, context);
		if (!nativeObjectReference) {
			return;
		}

		const propertyInfo = nativeObjects.get(nativeObjectReference.typeName)?.[nativeObjectReference.usage];
		if (!propertyInfo) {
			return;
		}

		if (isIndexedAccess(nativeObjectReference, propertyName)) {
			return;
		}

		if (!propertyInfo.all.has(propertyName)) {
			return getProblem(node, nativeObjectReference, propertyName, MESSAGE_ID_NONSTANDARD);
		}

		if (propertyName === 'constructor') {
			return;
		}

		const callKind = getCallKind(node);
		if (
			callKind === undefined
			|| (
				callKind === 'call'
				&& propertyInfo.callable.has(propertyName)
			)
		) {
			return;
		}

		return getProblem(
			node,
			nativeObjectReference,
			propertyName,
			callKind === 'construct' ? MESSAGE_ID_NONCONSTRUCTIBLE : MESSAGE_ID_NONCALLABLE,
		);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-standard properties on built-in objects.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
