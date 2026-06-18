/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-duplicate-if-branches';
const messages = {
	[MESSAGE_ID]: 'This branch has the same body as the branch on line {{line}}.',
};

const isElseIfStatement = node =>
	node.parent.type === 'IfStatement'
	&& node.parent.alternate === node;

const getBranchStatements = node => node.type === 'BlockStatement' ? node.body : [node];

const getStatementTokens = (node, sourceCode) => {
	const tokens = sourceCode.getTokens(node);
	const lastToken = tokens.at(-1);

	if (lastToken?.type === 'Punctuator' && lastToken.value === ';') {
		return tokens.slice(0, -1);
	}

	return tokens;
};

const areSameTokens = (left, right) =>
	left.type === right.type
	&& left.value === right.value;

const areSameBranchBodies = (leftStatements, rightStatements, sourceCode) => {
	if (leftStatements.length !== rightStatements.length) {
		return false;
	}

	let hasTokens = false;

	for (const [statementIndex, leftStatement] of leftStatements.entries()) {
		const leftTokens = getStatementTokens(leftStatement, sourceCode);
		const rightTokens = getStatementTokens(rightStatements[statementIndex], sourceCode);

		if (leftTokens.length > 0) {
			hasTokens = true;
		}

		if (leftTokens.length !== rightTokens.length) {
			return false;
		}

		for (const [tokenIndex, leftToken] of leftTokens.entries()) {
			if (!areSameTokens(leftToken, rightTokens[tokenIndex])) {
				return false;
			}
		}
	}

	return hasTokens;
};

/**
@param {ESTree.IfStatement} ifStatement
@returns {Array<{body: ESTree.Statement, statements: ESTree.Statement[]}>}
*/
function getBranches(ifStatement) {
	const branches = [];
	let node = ifStatement;

	while (node) {
		branches.push({
			body: node.consequent,
			statements: getBranchStatements(node.consequent),
		});

		if (node.alternate?.type !== 'IfStatement') {
			if (node.alternate) {
				branches.push({
					body: node.alternate,
					statements: getBranchStatements(node.alternate),
				});
			}

			break;
		}

		node = node.alternate;
	}

	return branches;
}

/**
@param {ESTree.IfStatement} ifStatement
@param {ESLint.Rule.RuleContext} context
@returns {Generator<ESLint.Rule.ReportDescriptor>}
*/
function * getProblems(ifStatement, context) {
	if (isElseIfStatement(ifStatement)) {
		return;
	}

	const {sourceCode} = context;
	const branches = getBranches(ifStatement);

	for (let index = 1; index < branches.length; index++) {
		const branch = branches[index];
		const previousBranch = branches[index - 1];

		if (areSameBranchBodies(branch.statements, previousBranch.statements, sourceCode)) {
			yield {
				node: branch.body,
				messageId: MESSAGE_ID,
				data: {
					line: String(sourceCode.getLoc(previousBranch.body).start.line),
				},
			};
		}
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', ifStatement => getProblems(ifStatement, context));
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow duplicate adjacent branches in if chains.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
