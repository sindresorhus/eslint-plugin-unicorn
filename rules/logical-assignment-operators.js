import {getBuiltinRule} from './utils/index.js';

const baseRule = getBuiltinRule('logical-assignment-operators');

const MESSAGE_ID_IF = 'if';
const MESSAGE_ID_IF_NULLISH = 'ifNullish';
const MESSAGE_ID_CONVERT_IF = 'convertIf';
const LOGICAL_OR_ASSIGNMENT_OPERATOR = '||=';
const LOGICAL_OR_OPERATOR = '||';
const NULLISH_COALESCING_ASSIGNMENT_OPERATOR = '??=';
const NULLISH_COALESCING_OPERATOR = '??';

const messages = {
	...baseRule.meta.messages,
	// A falsy `if` assignment is offered as both `||=` and `??=`, so name both operators. The phrasing matches the base rule's `if` message, which renders the operator without backticks.
	[MESSAGE_ID_IF_NULLISH]: '\'if\' statement can be replaced with a logical operator assignment with operator ||= or ??=.',
};

const getFix = problem => problem.fix ?? problem.suggest?.[0]?.fix;

const shouldAddNullishSuggestion = problem =>
	problem.messageId === MESSAGE_ID_IF
	&& problem.data?.operator === LOGICAL_OR_ASSIGNMENT_OPERATOR
	&& typeof getFix(problem) === 'function';

function createNullishFix(fix) {
	return fixer => fix(new Proxy(fixer, {
		get(target, property) {
			if (property !== 'insertTextBefore') {
				const value = Reflect.get(target, property, target);

				return typeof value === 'function' ? value.bind(target) : value;
			}

			return (nodeOrToken, text) => target.insertTextBefore(
				nodeOrToken,
				text === LOGICAL_OR_OPERATOR ? NULLISH_COALESCING_OPERATOR : text,
			);
		},
	}));
}

function withoutFixes(problem) {
	const problemWithoutFixes = {...problem};
	delete problemWithoutFixes.fix;
	delete problemWithoutFixes.suggest;

	return problemWithoutFixes;
}

function getProblem(problem, sourceCode) {
	if (!shouldAddNullishSuggestion(problem)) {
		return problem;
	}

	// Both `||=` and `??=` apply here, so the message names both operators.
	const problemWithMessage = {
		...withoutFixes(problem),
		messageId: MESSAGE_ID_IF_NULLISH,
	};

	if (sourceCode.getCommentsInside(problem.node).length > 0) {
		return problemWithMessage;
	}

	const fix = getFix(problem);

	return {
		...problemWithMessage,
		suggest: [
			{
				messageId: MESSAGE_ID_CONVERT_IF,
				data: {operator: LOGICAL_OR_ASSIGNMENT_OPERATOR},
				fix,
			},
			{
				messageId: MESSAGE_ID_CONVERT_IF,
				data: {operator: NULLISH_COALESCING_ASSIGNMENT_OPERATOR},
				fix: createNullishFix(fix),
			},
		],
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const fakeContext = Object.create(context, {
		report: {
			value(problem) {
				context.report(getProblem(problem, sourceCode));
			},
		},
	});

	const listeners = baseRule.create(fakeContext);

	for (const [selector, listener] of Object.entries(listeners)) {
		context.on(selector, listener);
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: baseRule.meta.type,
		docs: {
			description: baseRule.meta.docs.description,
			recommended: true,
		},
		fixable: baseRule.meta.fixable,
		hasSuggestions: baseRule.meta.hasSuggestions,
		schema: baseRule.meta.schema,
		defaultOptions: [
			baseRule.meta.defaultOptions?.[0],
		],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
