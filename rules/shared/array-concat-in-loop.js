import {findVariable} from '@eslint-community/eslint-utils';
import {
	isEmptyArrayExpression,
	isFunction,
	isLoop,
	isMethodCall,
} from '../ast/index.js';
import {
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from '../utils/index.js';

function unwrapExpression(node) {
	while (true) {
		const unwrappedNode = unwrapTypeScriptExpression(node);

		if (unwrappedNode !== node) {
			node = unwrappedNode;
			continue;
		}

		if (node?.type !== 'ParenthesizedExpression') {
			return node;
		}

		node = node.expression;
	}
}

function getIdentifier(node) {
	node = unwrapExpression(node);

	return node?.type === 'Identifier' ? node : undefined;
}

function getVariable(identifier, context) {
	return findVariable(context.sourceCode.getScope(identifier), identifier);
}

function isReassignableEmptyArrayVariable(variable) {
	const [definition] = variable?.defs ?? [];

	if (
		!definition
		|| variable.defs.length !== 1
		|| variable.scope.type === 'global'
		|| definition.type !== 'Variable'
		|| definition.node.id.type !== 'Identifier'
		|| (definition.parent.kind !== 'let' && definition.parent.kind !== 'var')
	) {
		return false;
	}

	const init = definition.node.init && unwrapExpression(definition.node.init);

	return Boolean(init && isEmptyArrayExpression(init));
}

function getNearestLoop(node, context) {
	for (const ancestor of context.sourceCode.getAncestors(node).toReversed()) {
		if (isFunction(ancestor)) {
			return;
		}

		if (isLoop(ancestor)) {
			return ancestor;
		}
	}
}

function isNodeInside(node, ancestor, context) {
	const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);
	const [ancestorStart, ancestorEnd] = context.sourceCode.getRange(ancestor);

	return nodeStart >= ancestorStart && nodeEnd <= ancestorEnd;
}

export function getArrayConcatInLoop(assignmentExpression, context) {
	if (assignmentExpression.operator !== '=') {
		return;
	}

	const left = assignmentExpression.left.type === 'Identifier' ? assignmentExpression.left : undefined;
	const callExpression = unwrapExpression(assignmentExpression.right);

	if (
		!left
		|| !isMethodCall(callExpression, {
			method: 'concat',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
	) {
		return;
	}

	const receiver = getIdentifier(callExpression.callee.object);
	const variable = getVariable(left, context);

	if (
		!receiver
		|| !variable
		|| variable !== getVariable(receiver, context)
		|| !isReassignableEmptyArrayVariable(variable)
	) {
		return;
	}

	const loop = getNearestLoop(assignmentExpression, context);
	const [definition] = variable.defs;
	if (
		!loop
		|| isNodeInside(definition.node, loop.body, context)
	) {
		return;
	}

	return {
		callExpression,
		property: callExpression.callee.property,
	};
}

function getParentAssignmentExpression(node) {
	let child = node;
	let {parent} = child;

	while (
		parent
		&& (
			parent.type === 'ParenthesizedExpression'
			|| isTypeScriptExpressionWrapper(parent)
		)
	) {
		child = parent;
		parent = child.parent;
	}

	return parent?.type === 'AssignmentExpression' && parent.right === child ? parent : undefined;
}

export function isArrayConcatInLoopCall(callExpression, context) {
	const assignmentExpression = getParentAssignmentExpression(callExpression);

	return Boolean(
		assignmentExpression
		&& getArrayConcatInLoop(assignmentExpression, context)?.callExpression === callExpression,
	);
}
