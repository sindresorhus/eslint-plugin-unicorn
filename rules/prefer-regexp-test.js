'use strict';
const {isParenthesized, getStaticValue} = require('eslint-utils');
const {methodCallSelector} = require('./selectors/index.js');
const {isBooleanNode} = require('./utils/boolean.js');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object.js');

const REGEXP_EXEC = 'regexp-exec';
const STRING_MATCH = 'string-match';
const messages = {
	[REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.'
};

const cases = [
	{
		type: REGEXP_EXEC,
		selector: methodCallSelector({
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
		selector: methodCallSelector({
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

const create = context => Object.fromEntries(
	cases.map(checkCase => [
		checkCase.selector,
		node => {
			if (!isBooleanNode(node)) {
				return;
			}

			const {type, getNodes, fix} = checkCase;
			const nodes = getNodes(node);
			const {methodNode, regexpNode} = nodes;

			if (regexpNode.type === 'Literal' && !regexpNode.regex) {
				return;
			}

			const problem = {
				node: type === REGEXP_EXEC ? methodNode : node,
				messageId: type
			};

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
	])
);

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.'
		},
		fixable: 'code',
		messages
	}
};
