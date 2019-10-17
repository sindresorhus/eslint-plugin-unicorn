'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');

const methods = new Map([
	// Method, argument indexes
	['slice', [0, 1]],
	['splice', [0]]
]);

const checkPrototypeObject = new Set([
	'Array',
	'String'
	// 'Blob'
]);

const OPERATOR_MINUS = '-';

const isPropertiesSame = (node1, node2) => properties => {
	return properties.every(property => isSame(node1[property], node2[property]));
};

function isSame(node1, node2) {
	if (node1 === node2) {
		return true;
	}

	const compare = isPropertiesSame(node1, node2);

	if (!compare(['type'])) {
		return false;
	}

	const {type} = node1;

	/* eslint-disable no-case-declarations */
	switch (type) {
		case 'Identifier':
			return compare(['name', 'computed']);
		case 'Literal':
			return compare(['value', 'raw']);
		case 'TemplateLiteral':
			const {quasis: quasis1} = node1;
			const {quasis: quasis2} = node2;
			return (quasis1.length === quasis2.length) &&
				quasis1.every((templateElement, index) => isSame(templateElement, quasis2[index]));
		case 'TemplateElement':
			const compareValue = isPropertiesSame(node1.value, node2.value);
			return node1.value &&
				node2.value &&
				compare(['tail']) &&
				compareValue(['cooked', 'raw']);
		case 'BinaryExpression':
			return compare(['operator', 'left', 'right']);
		case 'MemberExpression':
			return compare(['object', 'property']);
		default:
			return false;
	}
	/* eslint-enable no-case-declarations */
}

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

	if (lengthMemberExpression && isSame(target, lengthMemberExpression.object)) {
		return lengthMemberExpression;
	}
};

const getRemovalRange = (node, sourceCode) => {
	let before = sourceCode.getTokenBefore(node);
	let after = sourceCode.getTokenAfter(node);

	let [start] = node.range;
	let [, end] = node.range;

	let hasParentheses = true;

	while (hasParentheses) {
		hasParentheses =
			(before.type === 'Punctuator' && before.value === '(') &&
			(after.type === 'Punctuator' && after.value === ')');
		if (hasParentheses) {
			before = sourceCode.getTokenBefore(before);
			after = sourceCode.getTokenAfter(after);
			[, start] = before.range;
			[end] = after.range;
		}
	}

	const [nextStart] = after.range;
	const textBetween = sourceCode.text.slice(end, nextStart);

	if (/^\s+$/.test(textBetween)) {
		end = nextStart;
	} else {
		end += textBetween.match(/\S|$/).index;
	}

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
	const {callee, arguments: orignalArguments} = node;

	let method = callee.property.name;
	let target = callee.object;
	let argumentsNodes = orignalArguments;

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

	const parentCallee = callee.object.object;

	if (
		// [].{slice,splice}
		(
			parentCallee.type === 'ArrayExpression' &&
			parentCallee.elements.length === 0
		) ||
		// ''.{slice,splice}
		(
			isLiteralValue(parentCallee, '')
		) ||
		// {Array,String}.prototype.{slice,splice}
		(
			getMemberName(parentCallee) === 'prototype' &&
			parentCallee.object.type === 'Identifier' &&
			checkPrototypeObject.has(parentCallee.object.name)
		)
	) {
		[target] = orignalArguments;

		if (isApply) {
			const [, secondArgument] = orignalArguments;
			if (secondArgument.type !== 'ArrayExpression') {
				return;
			}

			argumentsNodes = secondArgument.elements;
		} else {
			argumentsNodes = orignalArguments.slice(1);
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

		const argumentsIndexes = methods.get(method);
		const removeAbleNodes = argumentsIndexes
			.map(index => getRemoveAbleNode(target, argumentsNodes[index]))
			.filter(Boolean);

		if (removeAbleNodes.length === 0) {
			return;
		}

		context.report({
			node,
			message: `Prefer \`-n\` over \`.length - n\` for \`${method}\``,
			fix(fixer) {
				const sourceCode = context.getSourceCode();
				return removeAbleNodes.map(
					node => fixer.removeRange(
						getRemovalRange(node, sourceCode)
					)
				);
			}
		});
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
