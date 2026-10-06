import {isElseIfStatement} from './ast/index.js';
import {isSameStatement} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-duplicate-if-branches';
const messages = {
	[MESSAGE_ID]: 'This branch has the same body as the branch on line {{line}}.',
};

// Empty statements do nothing, so they are ignored when comparing branches
const getBranchStatements = node =>
	(node.type === 'BlockStatement' ? node.body : [node])
		.filter(statement => statement.type !== 'EmptyStatement');

const areSameBranchBodies = (leftStatements, rightStatements, context) =>
	leftStatements.length > 0
	&& leftStatements.length === rightStatements.length
	&& leftStatements.every((statement, index) => isSameStatement(statement, rightStatements[index], context));

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

		if (areSameBranchBodies(branch.statements, previousBranch.statements, context)) {
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

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('IfStatement', ifStatement => getProblems(ifStatement, context));
};

/**
@type {ESLint.Rule.RuleModule}
*/
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
