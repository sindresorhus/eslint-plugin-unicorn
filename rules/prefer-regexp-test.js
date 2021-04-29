'use strict';
const {isParenthesized, getStaticValue} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {isBooleanNode} = require('./utils/boolean');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');

const REGEXP_EXEC = 'regexp-exec';
const STRING_MATCH = 'string-match';
const messages = {
	[REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.'
};

const cases = [
	{
		type: REGEXP_EXEC,
		selector: methodSelector({
			name: 'exec',
			length: 1
		}),
		getNodes: node => ({
			stringNode: node.arguments[0],
			methodNode: node.callee.property,
			regexpNode: node.callee.object
		}),
		fix: (fixer, {methodNode}) => fixer.replaceText(methodNode, 'test')
	},
	{
		type: STRING_MATCH,
		selector: methodSelector({
			name: 'match',
			length: 1
		}),
		getNodes: node => ({
			stringNode: node.callee.object,
			methodNode: node.callee.property,
			regexpNode: node.arguments[0]
		}),
		* fix(fixer, {stringNode, methodNode, regexpNode}, sourceCode) {
			yield fixer.replaceText(methodNode, 'test');

			let stringText = sourceCode.getText(stringNode);
			if (
				!isParenthesized(regexpNode, sourceCode) &&
				// Only `SequenceExpression` need add parentheses
				stringNode.type === 'SequenceExpression'
			) {
				stringText = `(${stringText})`;
			}

			yield fixer.replaceText(regexpNode, stringText);

			let regexpText = sourceCode.getText(regexpNode);
			if (
				!isParenthesized(stringNode, sourceCode) &&
				shouldAddParenthesesToMemberExpressionObject(regexpNode, sourceCode)
			) {
				regexpText = `(${regexpText})`;
			}

			// The nodes that pass `isBooleanNode` cannot have an ASI problem.

			yield fixer.replaceText(stringNode, regexpText);
		}
	}
];

const isRegExpNode = node => {
	if (node.type === 'Literal' && node.regex) {
		return true;
	}

	if (
		node.type === 'NewExpression' &&
		node.callee.type === 'Identifier' &&
		node.callee.name === 'RegExp'
	) {
		return true;
	}

	return false;
};

function getProblem(node, checkCase, context) {
	if (!isBooleanNode(node)) {
		return;
	}

	const {type, getNodes, fix} = checkCase;
	const nodes = getNodes(node);
	const {methodNode, regexpNode} = nodes;
	const problem = {
		node: type === REGEXP_EXEC ? methodNode : node,
		messageId: type
	};

	if (regexpNode.type === 'Literal' && !regexpNode.regex) {
		return;
	}

	if (!isRegExpNode(regexpNode)) {
		const staticResult = getStaticValue(regexpNode, context.getScope());
		if (staticResult) {
			const {value} = staticResult;
			if (
				Object.prototype.toString.call(value) !== '[object RegExp]' ||
				value.flags.includes('g')
			) {
				return problem;
			}
		}
	}

	problem.fix = fixer => fix(fixer, nodes, context.getSourceCode());
	return problem;
}

const create = context => Object.fromEntries(
	cases.map(checkCase => [
		checkCase.selector,
		node => {
			const problem = getProblem(node, checkCase, context);
			if (problem) {
				context.report(problem);
			}
		}
	])
);

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
