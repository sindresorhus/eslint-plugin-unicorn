import {hasSideEffect} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isNewExpression,
} from './ast/index.js';
import {
	getParenthesizedText,
	isBuiltinSet,
	isGlobalIdentifier,
	isParenthesized,
	isSameReference,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_UNION = 'prefer-set-methods/union';
const MESSAGE_ID_INTERSECTION = 'prefer-set-methods/intersection';
const MESSAGE_ID_INTERSECTION_SUGGESTION = 'prefer-set-methods/intersection-suggestion';

const messages = {
	[MESSAGE_ID_UNION]: 'Use `Set#union()` instead of spreading Sets into a new Set.',
	[MESSAGE_ID_INTERSECTION]: 'Use `Set#intersection()` instead of filtering by `Set#has()`.',
	[MESSAGE_ID_INTERSECTION_SUGGESTION]: 'Use `Set#intersection()`.',
};

const isGlobalSetConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'Set',
		argumentsLength: 1,
	})
	&& isGlobalIdentifier(node.callee, context);

const getMemberObjectText = (node, context) => {
	const text = getParenthesizedText(node, context);
	return shouldAddParenthesesToMemberExpressionObject(node, context) && !isParenthesized(node, context) ? `(${text})` : text;
};

const isFirstTokenOfExpressionStatement = (node, context) => {
	let currentNode = node;

	while (currentNode.parent) {
		if (currentNode.parent.type === 'ExpressionStatement') {
			return context.sourceCode.getRange(context.sourceCode.getFirstToken(currentNode.parent.expression))[0] === context.sourceCode.getRange(context.sourceCode.getFirstToken(node))[0];
		}

		currentNode = currentNode.parent;
	}

	return false;
};

const addSemicolonIfNeeded = (node, text, context) =>
	isFirstTokenOfExpressionStatement(node, context) && needsSemicolon(context.sourceCode.getTokenBefore(node), context, text) ? `;${text}` : text;

const isMemberObjectAfterTransparentWrappers = node => {
	while (node.parent) {
		const {parent} = node;

		if (
			parent.type === 'ParenthesizedExpression'
			|| unwrapTypeScriptExpression(parent) === node
		) {
			node = parent;
			continue;
		}

		return parent.type === 'MemberExpression' && parent.object === node;
	}

	return false;
};

const isInsideTypeScriptExpressionWrapper = node =>
	node.parent && unwrapTypeScriptExpression(node.parent) === node;

const isSetSpreadElement = (node, context) =>
	node?.type === 'SpreadElement'
	&& isBuiltinSet(node.argument, context);

const isSafeUnionOperand = (node, context) =>
	(
		isNewExpression(node, {name: 'Set', argumentsLength: 0})
		&& isGlobalIdentifier(node.callee, context)
	)
	|| !hasSideEffect(node, context.sourceCode, {considerGetters: true});

const isSetSpreadArray = (node, context) =>
	node.type === 'ArrayExpression'
	&& node.elements.length >= 2
	&& node.elements.every(element =>
		isSetSpreadElement(element, context)
		&& isSafeUnionOperand(element.argument, context),
	);

const getUnionReplacement = (arrayExpression, context) => {
	const spreadArguments = arrayExpression.elements.map(element => element.argument);
	const [firstArgument, ...remainingArguments] = spreadArguments;
	let text = getMemberObjectText(firstArgument, context);

	for (const argument of remainingArguments) {
		text += `.union(${getParenthesizedText(argument, context)})`;
	}

	return text;
};

const getUnionProblem = (node, context) => {
	if (
		!isGlobalSetConstructor(node, context)
		|| context.sourceCode.getCommentsInside(node).length > 0
	) {
		return;
	}

	const [argument] = node.arguments;
	if (!isSetSpreadArray(argument, context)) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_UNION,
		fix: fixer => fixer.replaceText(node, addSemicolonIfNeeded(node, getUnionReplacement(argument, context), context)),
	};
};

const getSingleSpreadSetArgument = (node, context) => {
	if (
		node.type !== 'ArrayExpression'
		|| node.elements.length !== 1
		|| !isSetSpreadElement(node.elements[0], context)
	) {
		return;
	}

	return node.elements[0].argument;
};

const getSetHasCallObject = (node, parameter, context) => {
	if (
		!isMethodCall(node, {
			method: 'has',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isSameReference(node.arguments[0], parameter)
		|| isSameReference(node.callee.object, parameter)
		|| !isBuiltinSet(node.callee.object, context)
	) {
		return;
	}

	return node.callee.object;
};

const getIntersectionReplacement = (filterCall, context) => {
	if (
		!isMethodCall(filterCall, {
			method: 'filter',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| context.sourceCode.getCommentsInside(filterCall).length > 0
	) {
		return;
	}

	const set = getSingleSpreadSetArgument(filterCall.callee.object, context);
	if (!set) {
		return;
	}

	const [callback] = filterCall.arguments;
	if (
		callback.type !== 'ArrowFunctionExpression'
		|| callback.async
		|| callback.params.length !== 1
		|| callback.params[0].type !== 'Identifier'
	) {
		return;
	}

	const otherSet = getSetHasCallObject(callback.body, callback.params[0], context);
	if (
		!otherSet
		|| hasSideEffect(otherSet, context.sourceCode, {considerGetters: true})
	) {
		return;
	}

	return `${getMemberObjectText(set, context)}.intersection(${getParenthesizedText(otherSet, context)})`;
};

const getIntersectionProblem = (node, replacementNode, context) => {
	if (
		context.sourceCode.getCommentsInside(replacementNode).length > 0
		|| isMemberObjectAfterTransparentWrappers(node)
		|| isInsideTypeScriptExpressionWrapper(node)
	) {
		return;
	}

	const replacement = getIntersectionReplacement(node, context);
	if (!replacement) {
		return;
	}

	return {
		node: replacementNode,
		messageId: MESSAGE_ID_INTERSECTION,
		suggest: [
			{
				messageId: MESSAGE_ID_INTERSECTION_SUGGESTION,
				fix: fixer => fixer.replaceText(replacementNode, addSemicolonIfNeeded(replacementNode, replacement, context)),
			},
		],
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('NewExpression', node => {
		const unionProblem = getUnionProblem(node, context);
		if (unionProblem) {
			return unionProblem;
		}

		if (!isGlobalSetConstructor(node, context)) {
			return;
		}

		const [argument] = node.arguments;
		return getIntersectionProblem(argument, node, context);
	});

	context.on('CallExpression', node => {
		if (
			node.parent.type === 'NewExpression'
			&& node.parent.arguments[0] === node
			&& isGlobalSetConstructor(node.parent, context)
		) {
			return;
		}

		return getIntersectionProblem(node, node, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Set` methods for Set operations.',
			recommended: true,
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
