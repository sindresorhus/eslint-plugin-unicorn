import {getBuiltinRule} from './utils/index.js';

const baseRule = getBuiltinRule('logical-assignment-operators');

const MESSAGE_ID_IF = 'if';
const MESSAGE_ID_CONVERT_IF = 'convertIf';
const LOGICAL_OR_ASSIGNMENT_OPERATOR = '||=';
const LOGICAL_OR_OPERATOR = '||';
const NULLISH_COALESCING_ASSIGNMENT_OPERATOR = '??=';
const NULLISH_COALESCING_OPERATOR = '??';

const getFix = problem => problem.fix ?? problem.suggest?.[0]?.fix;

const shouldAddNullishSuggestion = problem =>
	problem.messageId === MESSAGE_ID_IF
	&& problem.data?.operator === LOGICAL_OR_ASSIGNMENT_OPERATOR
	&& typeof getFix(problem) === 'function';

function createNullishFix(fix) {
	return fixer => fix(new Proxy(fixer, {
		get(target, property, receiver) {
			if (property !== 'insertTextBefore') {
				return Reflect.get(target, property, receiver);
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

	if (sourceCode.getCommentsInside(problem.node).length > 0) {
		return withoutFixes(problem);
	}

	const fix = getFix(problem);

	return {
		...withoutFixes(problem),
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
			recommended: false,
		},
		fixable: baseRule.meta.fixable,
		hasSuggestions: baseRule.meta.hasSuggestions,
		schema: baseRule.meta.schema,
		defaultOptions: [
			baseRule.meta.defaultOptions[0],
		],
		messages: baseRule.meta.messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
