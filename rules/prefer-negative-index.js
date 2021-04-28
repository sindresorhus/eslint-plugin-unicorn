'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');
const isSameReference = require('./utils/is-same-reference');

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

const OPERATOR_MINUS = '-';
const isLengthMemberExpression = node => node &&
	node.type === 'MemberExpression' &&
	node.property &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length' &&
	node.object;

const isLiteralPositiveValue = node =>
	node &&
	node.type === 'Literal' &&
	typeof node.value === 'number' &&
	node.value > 0;

const getLengthMemberExpression = node => {
	if (!node) {
		return;
	}

	const {type, operator, left, right} = node;

	if (
		type !== 'BinaryExpression' ||
		operator !== OPERATOR_MINUS ||
		!left ||
		!isLiteralPositiveValue(right)
	) {
		return;
	}

	if (isLengthMemberExpression(left)) {
		return left;
	}

	// Nested BinaryExpression
	return getLengthMemberExpression(left);
};

const getRemoveAbleNode = (target, argument) => {
	const lengthMemberExpression = getLengthMemberExpression(argument);

	if (
		lengthMemberExpression &&
		isSameReference(target, lengthMemberExpression.object)
	) {
		return lengthMemberExpression;
	}
};

const getRemovalRange = (node, sourceCode) => {
	let before = sourceCode.getTokenBefore(node);
	let after = sourceCode.getTokenAfter(node);

	let [start, end] = node.range;

	let hasParentheses = true;

	while (hasParentheses) {
		hasParentheses =
			before.type === 'Punctuator' &&
			before.value === '(' &&
			after.type === 'Punctuator' &&
			after.value === ')';
		if (hasParentheses) {
			before = sourceCode.getTokenBefore(before);
			after = sourceCode.getTokenAfter(after);
			start = before.range[1];
			end = after.range[0];
		}
	}

	const [nextStart] = after.range;
	const textBetween = sourceCode.text.slice(end, nextStart);

	end += textBetween.match(/\S|$/).index;

	return [start, end];
};

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
	CallExpression: node => {
		if (node.callee.type !== 'MemberExpression') {
			return;
		}

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
			.map(index => getRemoveAbleNode(target, argumentsNodes[index]))
			.filter(Boolean);

		if (removableNodes.length === 0) {
			return;
		}

		context.report({
			node,
			messageId: MESSAGE_ID,
			data: {method},
			* fix(fixer) {
				const sourceCode = context.getSourceCode();
				for (const node of removableNodes) {
					yield fixer.removeRange(
						getRemovalRange(node, sourceCode)
					);
				}
			}
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()`, `Array#splice()` and `Array#at()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
