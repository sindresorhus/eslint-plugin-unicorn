import {getNegativeIndexLengthNode, removeLengthNode} from './shared/negative-index.js';
import typedArray from './shared/typed-array.js';
import {isEmptyArrayExpression, isLiteral} from './ast/index.js';
import {getParentheses} from './utils/index.js';

const MESSAGE_ID = 'prefer-negative-index';
const messages = {
	[MESSAGE_ID]: 'Prefer negative index over length minus index for `{{method}}`.',
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
				...typedArray,
				// `{Blob,File}#slice()` are not generally used
				// 'Blob'
				// 'File'
			]),
		},
	],
	[
		'subarray',
		{
			argumentsIndexes: [0, 1],
			supportObjects: new Set(typedArray),
		},
	],
	[
		'splice',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
			]),
		},
	],
	[
		'toSpliced',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
			]),
		},
	],
	[
		'at',
		{
			argumentsIndexes: [0],
			supportObjects: new Set([
				'Array',
				'String',
				...typedArray,
			]),
		},
	],
]);

const getMemberName = node => {
	const {type, property} = node;

	if (
		type === 'MemberExpression'
		&& property.type === 'Identifier'
	) {
		return property.name;
	}
};

const isMethodOwner = (node, method) =>
	// `[].{slice,splice,toSpliced,at,with}`
	isEmptyArrayExpression(node)
	// `''.slice`
	|| (
		method === 'slice'
		&& isLiteral(node, '')
	)
	// {Array,String...}.prototype.slice
	// Array.prototype.splice
	|| (
		getMemberName(node) === 'prototype'
		&& node.object.type === 'Identifier'
		&& methods.get(method).supportObjects.has(node.object.name)
	);

function parse(node) {
	const {callee, arguments: originalArguments} = node;

	if (methods.has(callee.property.name)) {
		return {
			method: callee.property.name,
			target: callee.object,
			argumentsNodes: originalArguments,
		};
	}

	if (callee.property.name !== 'call' && callee.property.name !== 'apply') {
		return;
	}

	const method = getMemberName(callee.object);

	if (
		!methods.has(method)
		|| !isMethodOwner(callee.object.object, method)
	) {
		return;
	}

	const [target, secondArgument] = originalArguments;

	if (callee.property.name === 'call') {
		return {
			method,
			target,
			argumentsNodes: originalArguments.slice(1),
		};
	}

	if (secondArgument?.type !== 'ArrayExpression') {
		return;
	}

	return {
		method,
		target,
		argumentsNodes: secondArgument.elements,
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
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
			argumentsNodes,
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
			* fix(fixer, {abort}) {
				for (const node of removableNodes) {
					const fix = removeLengthNode(node, fixer, context);
					if (!fix) {
						return abort();
					}

					yield fix;

					// `removeLengthNode()` stops at the operator, so `foo.length - 1` would be left as `- 1` instead of `-1`
					const lastToken = getParentheses(node, context).at(-1) ?? sourceCode.getLastToken(node);
					const operatorToken = sourceCode.getTokenAfter(lastToken);
					const numberToken = sourceCode.getTokenAfter(operatorToken);
					if (
						operatorToken?.type === 'Punctuator'
						&& operatorToken.value === '-'
						&& numberToken?.type === 'Numeric'
						&& /^\s+$/u.test(sourceCode.text.slice(
							sourceCode.getRange(operatorToken)[1],
							sourceCode.getRange(numberToken)[0],
						))
					) {
						yield fixer.removeRange([
							sourceCode.getRange(operatorToken)[1],
							sourceCode.getRange(numberToken)[0],
						]);
					}
				}
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer negative index over `.length - index` when possible.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
