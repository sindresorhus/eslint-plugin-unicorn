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
	isLogicalExpression,
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
		* fix(fixer, {methodNode}) {
			yield fixer.replaceText(methodNode, 'test');
		},
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

const isReduxToolkitSliceActionMatcher = ({stringNode}) =>
	isMemberExpression(stringNode, {optional: false, computed: false})
	&& isMemberExpression(stringNode.object, {property: 'actions', optional: false, computed: false});

const getStaticRegExp = (node, scope) => {
	const staticResult = getStaticValue(node, scope);

	if (!staticResult) {
		return;
	}

	const {value} = staticResult;
	if (Object.prototype.toString.call(value) === '[object RegExp]') {
		return value;
	}
};

const unwrapChainExpression = node => node.type === 'ChainExpression' ? node.expression : node;

const isLengthMemberExpression = (node, object) =>
	isMemberExpression(node, {property: 'length'})
	&& node.object === object;

const isNegated = node =>
	node.parent.type === 'UnaryExpression'
	&& node.parent.operator === '!'
	&& node.parent.argument === node;

const isBooleanCall = node =>
	node?.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Boolean'
	&& node.arguments.length === 1;

const getBooleanExpressionAncestor = node => {
	while (true) {
		if (isLogicalExpression(node.parent)) {
			node = node.parent;
			continue;
		}

		if (isBooleanCall(node.parent) && node.parent.arguments[0] === node) {
			node = node.parent;
			continue;
		}

		break;
	}

	return node;
};

const isNegatedBooleanValue = node => isNegated(getBooleanExpressionAncestor(node));

const hasCommentsInRange = (sourceCode, [start, end]) =>
	sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});

const getLengthWrapperRemovalRanges = (lengthCheck, context) => {
	const {sourceCode} = context;
	const ranges = [[
		getParenthesizedRange(lengthCheck.lengthNode.object, context)[1],
		sourceCode.getRange(lengthCheck.lengthNode)[1],
	]];

	if (lengthCheck.comparisonLeftNode) {
		ranges.push([
			getParenthesizedRange(lengthCheck.comparisonLeftNode, context)[1],
			sourceCode.getRange(lengthCheck.node)[1],
		]);
	}

	return ranges;
};

const canSuggestLengthCheck = (lengthCheck, context) =>
	!getLengthWrapperRemovalRanges(lengthCheck, context)
		.some(range => hasCommentsInRange(context.sourceCode, range));

const getLengthCheck = node => {
	const lengthNode = unwrapChainExpression(node.parent);
	if (!isLengthMemberExpression(lengthNode, node)) {
		return;
	}

	const lengthCheckNode = lengthNode.parent.type === 'ChainExpression'
		? lengthNode.parent
		: lengthNode;

	if (isNegatedBooleanValue(lengthCheckNode)) {
		return;
	}

	if (isBooleanExpression(lengthCheckNode) || isControlFlowTest(lengthCheckNode)) {
		return {lengthNode, node: lengthCheckNode};
	}

	const {parent} = lengthCheckNode;
	if (
		parent?.type === 'BinaryExpression'
		&& parent.left === lengthCheckNode
		&& parent.operator === '>'
		&& isLiteral(parent.right, 0)
		&& !isNegatedBooleanValue(parent)
		&& (isBooleanExpression(parent) || isControlFlowTest(parent))
	) {
		return {lengthNode, node: parent, comparisonLeftNode: lengthCheckNode};
	}
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

			const regexpScope = context.sourceCode.getScope(regexpNode);
			const staticRegExp = getStaticRegExp(regexpNode, regexpScope);
			const isRegExp = isRegExpNode(regexpNode);
			const isKnownRegExp = isRegExp || staticRegExp !== undefined;

			if (
				type === STRING_MATCH
				&& !isKnownRegExp
				&& isReduxToolkitSliceActionMatcher(nodes)
			) {
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

				for (const fixResult of fix(fixer, nodes, context)) {
					yield fixResult;
				}
			};

			if (lengthCheck) {
				if (canSuggestLengthCheck(lengthCheck, context)) {
					problem.suggest = [
						{
							messageId: SUGGESTION,
							fix: fixFunction,
						},
					];
				}
			} else if (
				isRegExp
				|| staticRegExp?.global === false
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
