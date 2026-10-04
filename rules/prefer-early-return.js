import getShortBodyProblem from './shared/short-body-conditional.js';
import {canRewriteToEarlyExit, getConsequentStatementCount, getEarlyExitReplacementText} from './shared/early-exit.js';

const MESSAGE_ID = 'prefer-early-return';
const SUGGESTION_MESSAGE_ID = 'prefer-early-return/suggestion';
const SHORT_BODY_MESSAGE_ID = 'prefer-early-return/short-body';
const messages = {
	[SHORT_BODY_MESSAGE_ID]: 'Prefer conditional wrapping over an early return for a short body.',
	[MESSAGE_ID]: 'Prefer an early return over wrapping the remainder of the function body in an `if` statement.',
	[SUGGESTION_MESSAGE_ID]: 'Rewrite to an early return.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			maximumStatements: {
				type: 'integer',
				minimum: 0,
				description: 'Maximum number of statements allowed in a conditional wrapping the remainder of the function body.',
			},
			checkShortBodies: {
				type: 'boolean',
				description: 'Enforce conditional wrapping when the body after a guard, or its else body, has between one and maximumStatements statements.',
			},
		},
	},
];

const getFix = (ifStatement, context) => {
	if (
		!canRewriteToEarlyExit(ifStatement, context)
		|| context.sourceCode.getCommentsAfter(ifStatement).length > 0
	) {
		return;
	}

	return fixer => fixer.replaceText(
		ifStatement,
		getEarlyExitReplacementText(ifStatement, 'return', context),
	);
};

const getSuggestion = (ifStatement, context) => {
	if (!canRewriteToEarlyExit(ifStatement, context)) {
		return;
	}

	return [
		{
			messageId: SUGGESTION_MESSAGE_ID,
			fix: fixer => fixer.replaceText(ifStatement, getEarlyExitReplacementText(ifStatement, 'return', context)),
		},
	];
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {maximumStatements} = context.options[0];

	context.on(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'], node => {
		if (node.body.type !== 'BlockStatement') {
			return;
		}

		const {body} = node.body;
		const statement = body.at(-1);
		if (
			statement?.type !== 'IfStatement'
			|| statement.alternate
			|| getConsequentStatementCount(statement) <= maximumStatements
		) {
			// Checked after the wrapper so a guard before a long wrapper becomes a guard chain instead of nested `if` statements.
			const shortBodyProblem = getShortBodyProblem(node.body, context, 'ReturnStatement');
			return shortBodyProblem && {...shortBodyProblem, messageId: SHORT_BODY_MESSAGE_ID};
		}

		const fix = getFix(statement, context);
		const suggest = fix ? undefined : getSuggestion(statement, context);

		return {
			node: statement,
			messageId: MESSAGE_ID,
			...(fix && {fix}),
			...(suggest && {suggest}),
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
			description: 'Prefer early returns over conditionals wrapping the remainder of the function body.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{maximumStatements: 1, checkShortBodies: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
