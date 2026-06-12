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

const createProblem = (node, splitCall, index, context) => ({
	node,
	messageId: MESSAGE_ID,
	fix: fixer => appendArgument(fixer, splitCall, String(index + 1), context),
});

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

		return createProblem(node, node.object, index, context);
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

		return createProblem(node, splitCall, index, context);
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
