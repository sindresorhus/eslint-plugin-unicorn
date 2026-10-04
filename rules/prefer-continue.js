import getShortBodyProblem from './shared/short-body-conditional.js';
import {canRewriteToEarlyExit, getConsequentStatementCount, getEarlyExitReplacementText} from './shared/early-exit.js';
import {loopTypes} from './ast/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-continue';
const SHORT_BODY_MESSAGE_ID = 'prefer-continue/short-body';
const messages = {
	[SHORT_BODY_MESSAGE_ID]: 'Prefer conditional wrapping over an early continue for a short body.',
	[MESSAGE_ID]: 'Prefer an early continue over wrapping the remainder of the loop body in an `if` statement.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			maximumStatements: {
				type: 'integer',
				minimum: 0,
				description: 'Maximum number of statements allowed in a conditional wrapping the remainder of the loop body.',
			},
			checkShortBodies: {
				type: 'boolean',
				description: 'Enforce conditional wrapping when the body after a guard, or its else body, has between one and maximumStatements statements.',
			},
		},
	},
];

const loopExitStatementTypes = new Set([
	'ReturnStatement',
	'BreakStatement',
	'ContinueStatement',
	'ThrowStatement',
]);

const getNonEmptyBlockStatements = blockStatement => blockStatement.body.filter(({type}) => type !== 'EmptyStatement');

// The continue-guard rewrite is pointless when the `if` body unconditionally exits the iteration, so there is no remaining loop body to flatten.
const consequentExitsLoop = consequent => {
	const lastStatement = consequent.type === 'BlockStatement'
		? getNonEmptyBlockStatements(consequent).at(-1)
		: consequent;
	return loopExitStatementTypes.has(lastStatement?.type);
};

const getFix = (ifStatement, context) => {
	if (
		!canRewriteToEarlyExit(ifStatement, context)
		|| context.sourceCode.getCommentsAfter(ifStatement).length > 0
	) {
		return;
	}

	return fixer => fixer.replaceText(
		ifStatement,
		getEarlyExitReplacementText(ifStatement, 'continue', context),
	);
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {maximumStatements} = context.options[0];

	context.on(loopTypes, loop => {
		if (loop.body.type !== 'BlockStatement') {
			return;
		}

		const statement = loop.body.body.at(-1);
		if (
			statement?.type !== 'IfStatement'
			|| statement.alternate
			|| getConsequentStatementCount(statement) <= maximumStatements
			|| consequentExitsLoop(statement.consequent)
		) {
			// Checked after the wrapper so a guard before a long wrapper becomes a guard chain instead of nested `if` statements.
			const shortBodyProblem = getShortBodyProblem(loop.body, context, 'ContinueStatement');
			return shortBodyProblem && {...shortBodyProblem, messageId: SHORT_BODY_MESSAGE_ID};
		}

		const fix = getFix(statement, context);

		return {
			node: statement,
			messageId: MESSAGE_ID,
			...(fix && {fix}),
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer early continues over conditionals wrapping the remainder of the loop body.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{maximumStatements: 1, checkShortBodies: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
