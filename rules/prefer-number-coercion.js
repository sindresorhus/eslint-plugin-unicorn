import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';

const MESSAGE_ID_PARSE_FLOAT = 'parse-float';
const MESSAGE_ID_PARSE_INT = 'parse-int';
const MESSAGE_ID_SUGGESTION_NUMBER = 'suggestion-number';
const MESSAGE_ID_SUGGESTION_TRUNC = 'suggestion-trunc';
const messages = {
	[MESSAGE_ID_PARSE_FLOAT]: 'Prefer `Number()` over `{{method}}()`.',
	[MESSAGE_ID_PARSE_INT]: 'Prefer `Number()` with explicit integer conversion over `{{method}}()` with radix `10`.',
	[MESSAGE_ID_SUGGESTION_NUMBER]: 'Use `Number()` when the whole value should be numeric.',
	[MESSAGE_ID_SUGGESTION_TRUNC]: 'Replace `{{method}}()` with `Math.trunc(Number())`.',
};

const isComputedMemberCall = node =>
	node.callee.type === 'MemberExpression'
	&& node.callee.computed;

const isOptionalCall = node =>
	node.optional
	|| (node.callee.type === 'MemberExpression' && node.callee.optional);

const hasOnlySpreadArguments = node =>
	node.arguments.every(argument => argument.type === 'SpreadElement');

function getStaticNumberValue(node, context) {
	if (!node || node.type === 'SpreadElement') {
		return;
	}

	return getStaticValue(node, context.sourceCode.getScope(node))?.value;
}

const isDecimalRadix = (node, context) => getStaticNumberValue(node, context) === 10;

function getMathTruncText(node, sourceCode) {
	let text = sourceCode.getText(node);
	if (node.type === 'SequenceExpression') {
		text = `(${text})`;
	}

	return `Math.trunc(Number(${text}))`;
}

function getParseFloatProblem(callExpression, method, context) {
	if (callExpression.arguments.length === 0) {
		return;
	}

	const problem = {
		node: callExpression.callee,
		messageId: MESSAGE_ID_PARSE_FLOAT,
		data: {method},
	};

	if (
		isOptionalCall(callExpression)
		|| hasOnlySpreadArguments(callExpression)
		|| context.sourceCode.getCommentsInside(callExpression.callee).length > 0
	) {
		return problem;
	}

	problem.suggest = [
		{
			messageId: MESSAGE_ID_SUGGESTION_NUMBER,
			data: {method},
			fix: fixer => fixer.replaceText(callExpression.callee, 'Number'),
		},
	];

	return problem;
}

function getParseIntProblem(callExpression, method, context) {
	if (!isDecimalRadix(callExpression.arguments[1], context)) {
		return;
	}

	const problem = {
		node: callExpression.callee,
		messageId: MESSAGE_ID_PARSE_INT,
		data: {method},
	};

	const [firstArgument, radixArgument] = callExpression.arguments;
	if (
		callExpression.arguments.length !== 2
		|| firstArgument?.type === 'SpreadElement'
		|| hasSideEffect(radixArgument, context.sourceCode)
		|| isOptionalCall(callExpression)
		|| context.sourceCode.getCommentsInside(callExpression).length > 0
	) {
		return problem;
	}

	problem.suggest = [
		{
			messageId: MESSAGE_ID_SUGGESTION_TRUNC,
			data: {method},
			fix: fixer => fixer.replaceText(callExpression, getMathTruncText(firstArgument, context.sourceCode)),
		},
	];

	return problem;
}

function getCallProblem({node, path}, context) {
	if (isComputedMemberCall(node)) {
		return;
	}

	const method = path.join('.');

	if (path.at(-1) === 'parseFloat') {
		return getParseFloatProblem(node, method, context);
	}

	return getParseIntProblem(node, method, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	for (const object of [
		'parseFloat',
		'Number.parseFloat',
		'parseInt',
		'Number.parseInt',
	]) {
		const tracker = new GlobalReferenceTracker({
			object,
			type: GlobalReferenceTracker.CALL,
			context,
			handle: getCallProblem,
		});
		tracker.listen();
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number()` over `parseFloat()` and base-10 `parseInt()`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
