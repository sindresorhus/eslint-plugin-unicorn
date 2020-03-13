'use strict';

const enforceNew = [
	'Object',
	'Array',
	'ArrayBuffer',
	'BigInt64Array',
	'BigUint64Array',
	'DataView',
	'Date',
	'Error',
	'Float32Array',
	'Float64Array',
	'Function',
	'Int8Array',
	'Int16Array',
	'Int32Array',
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
	'Promise',
	'RegExp',
	'Uint8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8ClampedArray'
];

const disallowNew = [
	'BigInt',
	'Boolean',
	'Number',
	'String',
	'Symbol'
];

module.exports = {
	enforceNew,
	disallowNew
};
