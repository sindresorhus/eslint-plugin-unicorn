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

const getStatementTokenValues = (node, sourceCode) => {
	const tokenValues = sourceCode.getTokens(node).map(token => token.value);

	if (tokenValues.at(-1) === ';') {
		tokenValues.pop();
	}

	return tokenValues;
};

const areSameBranchBodies = (left, right, sourceCode) => {
	if (left.length !== right.length) {
		return false;
	}

	const leftTokenValues = left.map(node => getStatementTokenValues(node, sourceCode));
	const rightTokenValues = right.map(node => getStatementTokenValues(node, sourceCode));

	return leftTokenValues.some(tokenValues => tokenValues.length > 0)
		&& leftTokenValues.every((tokenValues, index) =>
			tokenValues.length === rightTokenValues[index].length
			&& tokenValues.every((tokenValue, tokenIndex) => tokenValue === rightTokenValues[index][tokenIndex]),
		);
};

/**
@param {ESTree.IfStatement} ifStatement
@returns {Array<{node: ESTree.Statement, statements: ESTree.Statement[]}>}
*/
function getBranches(ifStatement) {
	const branches = [];
	let node = ifStatement;

	while (node) {
		branches.push({
			node: node.consequent,
			statements: getBranchStatements(node.consequent),
		});

		if (node.alternate?.type !== 'IfStatement') {
			if (node.alternate) {
				branches.push({
					node: node.alternate,
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
				node: branch.node,
				messageId: MESSAGE_ID,
				data: {
					line: String(sourceCode.getLoc(previousBranch.node).start.line),
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
