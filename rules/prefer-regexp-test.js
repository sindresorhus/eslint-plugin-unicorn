import {isParenthesized, getStaticValue} from '@eslint-community/eslint-utils';
import {checkVueTemplate} from './utils/rule.js';
import {removeMemberExpressionProperty} from './fix/index.js';
import {
	isLiteral,
	isRegexLiteral,
	isNewExpression,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import {
	isBooleanExpression,
	isControlFlowTest,
	getParenthesizedRange,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const REGEXP_EXEC = 'regexp-exec';
const STRING_MATCH = 'string-match';
const SUGGESTION = 'suggestion';
const messages = {
	[REGEXP_EXEC]: 'Prefer `.test(…)` over `.exec(…)`.',
	[STRING_MATCH]: 'Prefer `RegExp#test(…)` over `String#match(…)`.',
	[SUGGESTION]: 'Switch to `RegExp#test(…)`.',
};

const cases = [
	{
		type: REGEXP_EXEC,
		test: node => isMethodCall(node, {
			method: 'exec',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}),
		getNodes: node => ({
			stringNode: node.arguments[0],
			methodNode: node.callee.property,
			regexpNode: node.callee.object,
		}),
		fix: (fixer, {methodNode}) => fixer.replaceText(methodNode, 'test'),
	},
	{
		type: STRING_MATCH,
		test: node => isMethodCall(node, {
			method: 'match',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}),
		getNodes: node => ({
			stringNode: node.callee.object,
			methodNode: node.callee.property,
			regexpNode: node.arguments[0],
		}),
		* fix(fixer, {stringNode, methodNode, regexpNode}, context) {
			const {sourceCode} = context;
			yield fixer.replaceText(methodNode, 'test');

			let stringText = sourceCode.getText(stringNode);
			if (
				!isParenthesized(regexpNode, sourceCode)
				// Only `SequenceExpression` need to add parentheses
				&& stringNode.type === 'SequenceExpression'
			) {
				stringText = `(${stringText})`;
			}

			yield fixer.replaceText(regexpNode, stringText);

			let regexpText = sourceCode.getText(regexpNode);
			if (
				!isParenthesized(stringNode, sourceCode)
				&& shouldAddParenthesesToMemberExpressionObject(regexpNode, context)
			) {
				regexpText = `(${regexpText})`;
			}

			// The nodes that pass control-flow test checks or explicit boolean expressions cannot have an ASI problem.

			yield fixer.replaceText(stringNode, regexpText);
		},
	},
];

const isRegExpNode = node => isRegexLiteral(node) || isNewExpression(node, {name: 'RegExp'});

const unwrapChainExpression = node => node.type === 'ChainExpression' ? node.expression : node;

const isLengthMemberExpression = (node, object) =>
	isMemberExpression(node, {property: 'length'})
	&& node.object === object;

const getLengthCheck = node => {
	const lengthNode = unwrapChainExpression(node.parent);
	if (!isLengthMemberExpression(lengthNode, node)) {
		return;
	}

	const lengthCheckNode = lengthNode.parent.type === 'ChainExpression'
		? lengthNode.parent
		: lengthNode;

	if (isBooleanExpression(lengthCheckNode) || isControlFlowTest(lengthCheckNode)) {
		return {lengthNode, node: lengthCheckNode};
	}

	const {parent} = lengthCheckNode;
	if (
		parent?.type === 'BinaryExpression'
		&& parent.left === lengthCheckNode
		&& parent.operator === '>'
		&& isLiteral(parent.right, 0)
		&& (isBooleanExpression(parent) || isControlFlowTest(parent))
	) {
		return {lengthNode, node: parent, comparisonLeftNode: lengthCheckNode};
	}
};

function * yieldFixResult(fixResult) {
	if (fixResult?.[Symbol.iterator]) {
		yield * fixResult;
		return;
	}

	yield fixResult;
}

const isRegExpWithoutGlobalFlag = (node, scope) => {
	if (isRegexLiteral(node)) {
		return !node.regex.flags.includes('g');
	}

	const staticResult = getStaticValue(node, scope);

	// Don't know if there is `g` flag
	if (!staticResult) {
		return false;
	}

	const {value} = staticResult;
	return (
		Object.prototype.toString.call(value) === '[object RegExp]'
		&& !value.global
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', function * (node) {
		const lengthCheck = getLengthCheck(node);
		if (!lengthCheck && !(isBooleanExpression(node) || isControlFlowTest(node))) {
			return;
		}

		for (const {type, test, getNodes, fix} of cases) {
			if (!test(node)) {
				continue;
			}

			const nodes = getNodes(node);
			const {methodNode, regexpNode} = nodes;

			if (regexpNode.type === 'Literal' && !regexpNode.regex) {
				continue;
			}

			const problem = {
				node: type === REGEXP_EXEC ? methodNode : node,
				messageId: type,
			};

			const fixFunction = function * (fixer) {
				if (lengthCheck) {
					yield removeMemberExpressionProperty(fixer, lengthCheck.lengthNode, context);

					if (lengthCheck.comparisonLeftNode) {
						yield fixer.removeRange([
							getParenthesizedRange(lengthCheck.comparisonLeftNode, context)[1],
							context.sourceCode.getRange(lengthCheck.node)[1],
						]);
					}
				}

				for (const fixResult of yieldFixResult(fix(fixer, nodes, context))) {
					yield fixResult;
				}
			};

			if (lengthCheck) {
				problem.suggest = [
					{
						messageId: SUGGESTION,
						fix: fixFunction,
					},
				];
			} else if (
				isRegExpNode(regexpNode)
				|| isRegExpWithoutGlobalFlag(regexpNode, context.sourceCode.getScope(regexpNode))
			) {
				problem.fix = fixFunction;
			} else {
				problem.suggest = [
					{
						messageId: SUGGESTION,
						fix: fixFunction,
					},
				];
			}

			yield problem;
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
