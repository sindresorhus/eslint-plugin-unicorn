import {getNegativeIndexLengthNode, removeLengthNode} from './shared/negative-index.js';
import typedArray from './shared/typed-array.js';
import {isEmptyArrayExpression, isLiteral} from './ast/index.js';
import {getParentheses} from './utils/index.js';
import {isLengthMinusOneOf} from './utils/comparison.js';

const MESSAGE_ID = 'prefer-negative-index';
const SUGGESTION_ID = 'prefer-negative-index/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer negative index over length minus index for `{{method}}`.',
	[SUGGESTION_ID]: 'Use a negative index.',
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
		const lengthArguments = argumentsIndexes
			.map(index => argumentsNodes[index])
			.filter(argument => getNegativeIndexLengthNode(argument, target));

		if (lengthArguments.length === 0) {
			return;
		}

		const fix = function * (fixer, {abort}) {
			for (const argument of lengthArguments) {
				const node = getNegativeIndexLengthNode(argument, target);
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
		};

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {method},
		};

		// `length - 1` and `-1` agree for every length. Larger offsets differ when they exceed the receiver's length, for example `[1, 2, 3].slice(3 - 4)` is `[3]`, but `[1, 2, 3].slice(-4)` is the whole array.
		if (lengthArguments.every(argument => isLengthMinusOneOf(argument, target))) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: SUGGESTION_ID, fix}];
		}

		return problem;
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
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
