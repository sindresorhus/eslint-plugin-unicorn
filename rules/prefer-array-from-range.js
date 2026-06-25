import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	wouldRemoveComments,
} from './utils/index.js';
import {getArrayRangeLength} from './shared/array-range.js';

const MESSAGE_ID = 'prefer-array-from-range';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array.from({length}, …)` when creating range arrays.',
};

const isArrayFromCall = (node, context) => (
	isMethodCall(node, {
		object: 'Array',
		method: 'from',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& context.sourceCode.isGlobalReference(node.callee.object)
);

const getSpreadRange = (node, context) => {
	if (
		node.elements.length !== 1
		|| node.elements[0]?.type !== 'SpreadElement'
	) {
		return;
	}

	return getArrayRangeLength(node.elements[0].argument, context);
};

const getArrayFromRange = (node, context) => {
	if (!isArrayFromCall(node, context)) {
		return;
	}

	return getArrayRangeLength(node.arguments[0], context);
};

const getLengthPropertyText = (node, context) => {
	if (
		node.type === 'Identifier'
		&& node.name === 'length'
	) {
		return 'length';
	}

	return `length: ${getParenthesizedText(node, context)}`;
};

const getFixedText = (length, context) => `Array.from({${getLengthPropertyText(length, context)}}, (_, index) => index)`;

const getProblem = (node, context) => {
	const length = node.type === 'ArrayExpression'
		? getSpreadRange(node, context)
		: getArrayFromRange(node, context);

	if (!length) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		...(!wouldRemoveComments(context, node, [length]) && {
			fix: fixer => fixer.replaceText(node, getFixedText(length, context)),
		}),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ArrayExpression', node => getProblem(node, context));
	context.on('CallExpression', node => getProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array.from({length}, …)` when creating range arrays.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
