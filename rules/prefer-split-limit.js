import {getStaticValue} from '@eslint-community/eslint-utils';
import {isLeftHandSide} from './utils/index.js';
import {appendArgument} from './fix/index.js';
import {
	isStringLiteral,
	isRegexLiteral,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';

const MESSAGE_ID = 'prefer-split-limit';
const MAXIMUM_SPLIT_LIMIT = (2 ** 32) - 1;
const messages = {
	[MESSAGE_ID]: 'Prefer `String#split()` with a limit.',
};

const isBuiltInSeparator = node =>
	(isStringLiteral(node) && node.value !== '')
	|| isRegexLiteral(node);

const getNonNegativeIntegerValue = (node, sourceCode) => {
	const staticValue = getStaticValue(node, sourceCode.getScope(node));

	if (
		!staticValue
		|| !Number.isSafeInteger(staticValue.value)
		|| staticValue.value < 0
		|| staticValue.value >= MAXIMUM_SPLIT_LIMIT
	) {
		return;
	}

	return staticValue.value;
};

const isSplitCallWithoutLimit = node =>
	isMethodCall(node, {
		method: 'split',
		argumentsLength: 1,
	})
	&& isBuiltInSeparator(node.arguments[0]);

const createProblem = (node, splitCall, limit, context) => ({
	node,
	messageId: MESSAGE_ID,
	fix: fixer => appendArgument(fixer, splitCall, String(limit), context),
});

const getDestructuringProblem = (pattern, splitCall, context) => {
	const {elements} = pattern;
	const unwrappedSplitCall = splitCall?.type === 'ChainExpression' ? splitCall.expression : splitCall;
	if (
		elements.length === 0
		|| elements.at(-1)?.type === 'RestElement'
		|| !isSplitCallWithoutLimit(unwrappedSplitCall)
	) {
		return;
	}

	return createProblem(pattern, unwrappedSplitCall, elements.length, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (
			!node.computed
			|| !isSplitCallWithoutLimit(node.object)
			|| isLeftHandSide(node)
		) {
			return;
		}

		const index = getNonNegativeIntegerValue(node.property, sourceCode);
		if (index === undefined) {
			return;
		}

		return createProblem(node, node.object, index + 1, context);
	});

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'at',
			argumentsLength: 1,
		})) {
			return;
		}

		const {object: splitCall} = node.callee;
		if (
			!isMemberExpression(node.callee)
			|| !isSplitCallWithoutLimit(splitCall)
		) {
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
		if (node.left.type !== 'ArrayPattern') {
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
