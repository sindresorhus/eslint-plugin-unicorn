import {getStaticValue} from '@eslint-community/eslint-utils';
import {isLeftHandSide, isValueNotUsable} from './utils/index.js';
import {appendArgument} from './fix/index.js';
import {
	isStringLiteral,
	isRegexLiteral,
	isMethodCall,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-split-limit';
const MAXIMUM_SPLIT_LIMIT = (2 ** 32) - 1;
const messages = {
	[MESSAGE_ID]: 'Prefer `String#split()` with a limit.',
};

const isSupportedSeparator = node =>
	(isStringLiteral(node) && node.value !== '')
	|| isRegexLiteral(node);

const getNonNegativeIntegerValue = (node, sourceCode) => {
	const staticValue = getStaticValue(node, sourceCode.getScope(node));

	if (
		!staticValue
		|| !Number.isSafeInteger(staticValue.value)
		|| staticValue.value < 0
		|| staticValue.value >= MAXIMUM_SPLIT_LIMIT - 1
	) {
		return;
	}

	return staticValue.value;
};

const getSplitCallWithoutLimit = node => {
	const splitCall = node?.type === 'ChainExpression' ? node.expression : node;

	if (
		!isMethodCall(splitCall, {
			method: 'split',
			argumentsLength: 1,
		})
		|| !isSupportedSeparator(splitCall.arguments[0])
	) {
		return;
	}

	return splitCall;
};

const createProblem = (node, splitCall, limit, context) => ({
	node,
	messageId: MESSAGE_ID,
	fix: fixer => appendArgument(fixer, splitCall, String(limit), context),
});

const getDestructuringProblem = (pattern, splitCall, context) => {
	const {elements} = pattern;
	const directSplitCall = getSplitCallWithoutLimit(splitCall);
	if (
		elements.length === 0
		|| elements.at(-1)?.type === 'RestElement'
		|| !directSplitCall
	) {
		return;
	}

	return createProblem(pattern, directSplitCall, elements.length, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (
			!node.computed
			|| isLeftHandSide(node)
		) {
			return;
		}

		const splitCall = getSplitCallWithoutLimit(node.object);
		if (!splitCall) {
			return;
		}

		const index = getNonNegativeIntegerValue(node.property, sourceCode);
		if (index === undefined) {
			return;
		}

		return createProblem(node, splitCall, index + 1, context);
	});

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'at',
			argumentsLength: 1,
		})) {
			return;
		}

		const splitCall = getSplitCallWithoutLimit(node.callee.object);
		if (!splitCall) {
			return;
		}

		const index = getNonNegativeIntegerValue(node.arguments[0], sourceCode);
		if (index === undefined) {
			return;
		}

		return createProblem(node, splitCall, index + 1, context);
	});

	context.on('VariableDeclarator', node => {
		if (node.id.type !== 'ArrayPattern') {
			return;
		}

		return getDestructuringProblem(node.id, node.init, context);
	});

	context.on('AssignmentExpression', node => {
		if (
			node.left.type !== 'ArrayPattern'
			|| !isValueNotUsable(node)
		) {
			return;
		}

		return getDestructuringProblem(node.left, node.right, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#split()` with a limit.',
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
