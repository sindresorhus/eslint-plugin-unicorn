import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isSameReference,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-string-pad-start-end';
const MESSAGE_ID_SUGGESTION = 'suggest-padding-method';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#{{method}}()` over manual string padding.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `String#{{method}}()`.',
};

const isLengthMemberExpression = node => (
	node?.type === 'MemberExpression'
	&& node.computed === false
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
);

const getStaticString = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));

	if (typeof result?.value === 'string') {
		return result.value;
	}
};

const isStaticNonString = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));

	return result && typeof result.value !== 'string';
};

const clearlyNonStringTargetTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'ObjectExpression',
]);

const getIdentifierValueNode = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definitionNode = variable?.defs[0]?.node;

	if (
		definitionNode?.type === 'FunctionDeclaration'
		|| definitionNode?.type === 'ClassDeclaration'
	) {
		return definitionNode;
	}

	if (definitionNode?.type === 'VariableDeclarator') {
		return definitionNode.init;
	}
};

const isClearlyNonStringTarget = (node, context) => {
	const valueNode = getIdentifierValueNode(node, context);

	return (
		isStaticNonString(node, context)
		|| clearlyNonStringTargetTypes.has(node.type)
		|| clearlyNonStringTargetTypes.has(valueNode?.type)
		|| valueNode?.type === 'FunctionDeclaration'
		|| valueNode?.type === 'ClassDeclaration'
	);
};

const hasCommentsInside = (node, context) => context.sourceCode.getCommentsInside(node).length > 0;

const isSimpleTarget = node => node.type === 'Identifier';

const isNumericLiteral = node => (
	node.type === 'Literal'
	&& typeof node.value === 'number'
);

const isZeroLiteral = node => (
	isNumericLiteral(node)
	&& node.value === 0
);

const isSafePaddingNode = node => (
	(
		node.type === 'Literal'
		&& typeof node.value === 'string'
	)
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	)
);

const canAutofixRepeatCall = ({targetNode, targetLengthNode, paddingNode}) => (
	isSimpleTarget(targetNode)
	&& isNumericLiteral(targetLengthNode)
	&& isSafePaddingNode(paddingNode)
);

const getPaddingText = ({paddingNode, paddingString}, context) => {
	if (paddingString === ' ') {
		return '';
	}

	return `, ${getParenthesizedText(paddingNode, context)}`;
};

const getRepeatCall = (node, context) => {
	if (!isMethodCall(node, {
		method: 'repeat',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const paddingNode = node.callee.object;
	const paddingString = getStaticString(paddingNode, context);

	if (paddingString?.length !== 1) {
		return;
	}

	return {
		paddingNode,
		paddingString,
		widthNode: node.arguments[0],
	};
};

const getRepeatLengthCall = (node, context) => {
	const repeatCall = getRepeatCall(node, context);

	if (!repeatCall) {
		return;
	}

	const {widthNode} = repeatCall;

	if (
		widthNode.type !== 'BinaryExpression'
		|| widthNode.operator !== '-'
		|| !isLengthMemberExpression(widthNode.right)
	) {
		return;
	}

	return {
		...repeatCall,
		targetLengthNode: widthNode.left,
		targetNode: widthNode.right.object,
	};
};

const getReplacement = ({method, targetNode, targetLengthNode, paddingNode, paddingString}, context) => {
	const targetText = getParenthesizedText(targetNode, context);
	const targetLengthText = getParenthesizedText(targetLengthNode, context);
	const paddingText = getPaddingText({paddingNode, paddingString}, context);

	return `${targetText}.${method}(${targetLengthText}${paddingText})`;
};

const getProblem = ({node, method, replacement, context, canFix}) => {
	const problem = {
		node,
		messageId: MESSAGE_ID,
		data: {method},
	};

	if (
		canFix
		&& !hasCommentsInside(node, context)
	) {
		problem.fix = function (fixer) {
			const tokenBefore = context.sourceCode.getTokenBefore(node);
			const semicolon = needsSemicolon(tokenBefore, context, replacement) ? ';' : '';

			return fixer.replaceText(node, `${semicolon}${replacement}`);
		};
	}

	return problem;
};

const getSuggestionProblem = ({node, method, replacement, context, canSuggest}) => {
	const problem = {
		node,
		messageId: MESSAGE_ID,
		data: {method},
	};

	if (
		canSuggest
		&& !hasCommentsInside(node, context)
	) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {method},
				fix: fixer => fixer.replaceText(node, replacement),
			},
		];
	}

	return problem;
};

const getPaddingMethodProblem = (node, context) => {
	if (node.operator !== '+') {
		return;
	}

	const startPaddingCall = getRepeatLengthCall(node.left, context);
	if (
		startPaddingCall
		&& isSameReference(node.right, startPaddingCall.targetNode)
		&& !isClearlyNonStringTarget(node.right, context)
	) {
		const canFix = canAutofixRepeatCall({
			targetNode: node.right,
			targetLengthNode: startPaddingCall.targetLengthNode,
			paddingNode: startPaddingCall.paddingNode,
		});

		return getProblem({
			node,
			method: 'padStart',
			replacement: canFix && getReplacement({
				method: 'padStart',
				targetNode: node.right,
				...startPaddingCall,
			}, context),
			context,
			canFix,
		});
	}

	const endPaddingCall = getRepeatLengthCall(node.right, context);
	if (
		endPaddingCall
		&& isSameReference(node.left, endPaddingCall.targetNode)
		&& !isClearlyNonStringTarget(node.left, context)
	) {
		const canFix = canAutofixRepeatCall({
			targetNode: node.left,
			targetLengthNode: endPaddingCall.targetLengthNode,
			paddingNode: endPaddingCall.paddingNode,
		});

		return getProblem({
			node,
			method: 'padEnd',
			replacement: canFix && getReplacement({
				method: 'padEnd',
				targetNode: node.left,
				...endPaddingCall,
			}, context),
			context,
			canFix,
		});
	}
};

const getNegativeArgument = node => {
	if (
		node?.type === 'UnaryExpression'
		&& node.operator === '-'
	) {
		return node.argument;
	}
};

const getSlicePaddingSuggestion = (node, context) => {
	if (
		!isMethodCall(node, {
			method: 'slice',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})
		|| node.callee.object.type !== 'BinaryExpression'
		|| node.callee.object.operator !== '+'
	) {
		return;
	}

	const {object} = node.callee;
	const [firstArgument, secondArgument] = node.arguments;
	const startPaddingCall = getRepeatCall(object.left, context);
	const startWidthNode = getNegativeArgument(firstArgument);

	if (
		node.arguments.length === 1
		&& startPaddingCall
		&& startWidthNode
		&& isNumericLiteral(startPaddingCall.widthNode)
		&& isSameReference(startPaddingCall.widthNode, startWidthNode)
		&& isSimpleTarget(object.right)
		&& !isClearlyNonStringTarget(object.right, context)
	) {
		const canSuggest = isSafePaddingNode(startPaddingCall.paddingNode);
		const replacement = getReplacement({
			method: 'padStart',
			targetNode: object.right,
			targetLengthNode: startPaddingCall.widthNode,
			...startPaddingCall,
		}, context);

		return getSuggestionProblem({
			node,
			method: 'padStart',
			replacement,
			context,
			canSuggest,
		});
	}

	const endPaddingCall = getRepeatCall(object.right, context);

	if (
		node.arguments.length === 2
		&& endPaddingCall
		&& isZeroLiteral(firstArgument)
		&& isNumericLiteral(endPaddingCall.widthNode)
		&& isSameReference(endPaddingCall.widthNode, secondArgument)
		&& isSimpleTarget(object.left)
		&& !isClearlyNonStringTarget(object.left, context)
	) {
		const canSuggest = isSafePaddingNode(endPaddingCall.paddingNode);
		const replacement = getReplacement({
			method: 'padEnd',
			targetNode: object.left,
			targetLengthNode: endPaddingCall.widthNode,
			...endPaddingCall,
		}, context);

		return getSuggestionProblem({
			node,
			method: 'padEnd',
			replacement,
			context,
			canSuggest,
		});
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('BinaryExpression', node => getPaddingMethodProblem(node, context));
	context.on('CallExpression', node => getSlicePaddingSuggestion(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#padStart()` and `String#padEnd()` over manual string padding.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
