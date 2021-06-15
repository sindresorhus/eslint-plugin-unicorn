'use strict';
const isLiteralValue = require('./utils/is-literal-value.js');
const {
	getNegativeIndexLengthNode,
	removeLengthNode
} = require('./shared/negative-index.js');

const MESSAGE_ID = 'prefer-negative-index';
const messages = {
	[MESSAGE_ID]: 'Prefer negative index over length minus index for `{{method}}`.'
};

const methods = new Map([
	[
		'slice',
		{
			argumentsIndexes: [0, 1],
			supportObjects: new Set([
				'Array',
				'String',
				'ArrayBuffer',
				'Int8Array',
				'Uint8Array',
				'Uint8ClampedArray',
				'Int16Array',
				'Uint16Array',
				'Int32Array',
				'Uint32Array',
				'Float32Array',
				'Float64Array',
				'BigInt64Array',
				'BigUint64Array'
				// `{Blob,File}#slice()` are not generally used
				// 'Blob'
				// 'File'
			])
		}
	],
	[
		'splice',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array'
			])
		}
	],
	[
		'at',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array'
			])
		}
	]
]);

const getMemberName = node => {
	const {type, property} = node;

	if (
		type === 'MemberExpression' &&
		property &&
		property.type === 'Identifier'
	) {
		return property.name;
	}
};

function parse(node) {
	const {callee, arguments: originalArguments} = node;

	let method = callee.property.name;
	let target = callee.object;
	let argumentsNodes = originalArguments;

	if (methods.has(method)) {
		return {
			method,
			target,
			argumentsNodes
		};
	}

	if (method !== 'call' && method !== 'apply') {
		return;
	}

	const isApply = method === 'apply';

	method = getMemberName(callee.object);

	if (!methods.has(method)) {
		return;
	}

	const {supportObjects} = methods.get(method);

	const parentCallee = callee.object.object;

	if (
		// [].{slice,splice}
		(
			parentCallee.type === 'ArrayExpression' &&
			parentCallee.elements.length === 0
		) ||
		// ''.slice
		(
			method === 'slice' &&
			isLiteralValue(parentCallee, '')
		) ||
		// {Array,String...}.prototype.slice
		// Array.prototype.splice
		(
			getMemberName(parentCallee) === 'prototype' &&
			parentCallee.object.type === 'Identifier' &&
			supportObjects.has(parentCallee.object.name)
		)
	) {
		[target] = originalArguments;

		if (isApply) {
			const [, secondArgument] = originalArguments;
			if (!secondArgument || secondArgument.type !== 'ArrayExpression') {
				return;
			}

			argumentsNodes = secondArgument.elements;
		} else {
			argumentsNodes = originalArguments.slice(1);
		}

		return {
			method,
			target,
			argumentsNodes
		};
	}
}

const create = context => ({
	'CallExpression[callee.type="MemberExpression"]': node => {
		const parsed = parse(node);

		if (!parsed) {
			return;
		}

		const {
			method,
			target,
			argumentsNodes
		} = parsed;

		const {argumentsIndexes} = methods.get(method);
		const removableNodes = argumentsIndexes
			.map(index => getNegativeIndexLengthNode(argumentsNodes[index], target))
			.filter(Boolean);

		if (removableNodes.length === 0) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {method},
			* fix(fixer) {
				const sourceCode = context.getSourceCode();
				for (const node of removableNodes) {
					yield removeLengthNode(node, fixer, sourceCode);
				}
			}
		};
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()`, `Array#splice()` and `Array#at()`.'
		},
		fixable: 'code',
		messages
	}
};
