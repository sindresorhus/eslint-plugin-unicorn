import {
	isEmptyArrayExpression,
	isEmptyStringLiteral,
} from './ast/index.js';
import {getStaticValueIfNoSideEffects} from './utils/index.js';

const MESSAGE_ID = 'consistent-empty-array-spread';
const messages = {
	[MESSAGE_ID]: 'Prefer using empty {{replacementDescription}} since the {{anotherNodePosition}} is {{anotherNodeDescription}}.',
};

const isString = (node, context) => {
	const staticValueResult = getStaticValueIfNoSideEffects(node, context);
	return typeof staticValueResult?.value === 'string';
};

const isArray = (node, context) => {
	if (node.type === 'ArrayExpression') {
		return true;
	}

	const staticValueResult = getStaticValueIfNoSideEffects(node, context);
	return Array.isArray(staticValueResult?.value);
};

const cases = [
	{
		oneSidePredicate: isEmptyStringLiteral,
		anotherSidePredicate: isArray,
		anotherNodeDescription: 'an array',
		replacementDescription: 'array',
		replacementCode: '[]',
	},
	{
		oneSidePredicate: isEmptyArrayExpression,
		anotherSidePredicate: isString,
		anotherNodeDescription: 'a string',
		replacementDescription: 'string',
		replacementCode: '\'\'',
	},
];

function createProblem({
	problemNode,
	anotherNodePosition,
	anotherNodeDescription,
	replacementDescription,
	replacementCode,
	context,
}) {
	const problem = {
		node: problemNode,
		messageId: MESSAGE_ID,
		data: {
			replacementDescription,
			anotherNodePosition,
			anotherNodeDescription,
		},
	};

	// The replacement is a plain string, so a comment inside the empty array would be lost
	if (context.sourceCode.getCommentsInside(problemNode).length === 0) {
		problem.fix = fixer => fixer.replaceText(problemNode, replacementCode);
	}

	return problem;
}

function getProblem(conditionalExpression, context) {
	const {
		consequent,
		alternate,
	} = conditionalExpression;

	for (const problemCase of cases) {
		const {
			oneSidePredicate,
			anotherSidePredicate,
		} = problemCase;

		if (oneSidePredicate(consequent, context) && anotherSidePredicate(alternate, context)) {
			return createProblem({
				...problemCase,
				context,
				problemNode: consequent,
				anotherNodePosition: 'alternate',
			});
		}

		if (oneSidePredicate(alternate, context) && anotherSidePredicate(consequent, context)) {
			return createProblem({
				...problemCase,
				context,
				problemNode: alternate,
				anotherNodePosition: 'consequent',
			});
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('ArrayExpression', function * (arrayExpression) {
		for (const element of arrayExpression.elements) {
			if (
				element?.type !== 'SpreadElement'
				|| element.argument.type !== 'ConditionalExpression'
			) {
				continue;
			}

			yield getProblem(element.argument, context);
		}
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
			description: 'Prefer consistent types when spreading a ternary in an array literal.',
			recommended: true,
		},
		fixable: 'code',

		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
