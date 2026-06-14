import {findVariable} from '@eslint-community/eslint-utils';
import isLogicalExpression from './is-logical-expression.js';

const isLogicNot = node => node?.type === 'UnaryExpression' && node.operator === '!';
const isLogicNotArgument = node => isLogicNot(node.parent) && node.parent.argument === node;
const isBooleanCallArgument = (node, context) => isGlobalBooleanCall(node.parent, context) && node.parent.arguments[0] === node;
const isGlobalReference = (node, context) => {
	const {sourceCode} = context;
	if (sourceCode.isGlobalReference(node)) {
		return true;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	return !variable || variable.defs.length === 0;
};

export const isGlobalBooleanCall = (node, context) =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Boolean'
	&& node.arguments.length === 1
	&& node.arguments[0].type !== 'SpreadElement'
	&& isGlobalReference(node.callee, context);
const isVueBooleanAttributeValue = node =>
	node?.type === 'VExpressionContainer'
	&& node.parent.type === 'VAttribute'
	&& node.parent.directive
	&& node.parent.value === node
	&& node.parent.key.type === 'VDirectiveKey'
	&& node.parent.key.name.type === 'VIdentifier'
	&& [
		'if',
		'else-if',
		'show',
	].includes(node.parent.key.name.rawName);
const isDirectControlFlowTest = node =>
	[
		'IfStatement',
		'ConditionalExpression',
		'WhileStatement',
		'DoWhileStatement',
		'ForStatement',
	].includes(node.parent.type)
	&& node.parent.test === node;
const isDirectBooleanExpression = (node, context) =>
	isLogicNot(node)
	|| isLogicNotArgument(node)
	|| isGlobalBooleanCall(node, context)
	|| isBooleanCallArgument(node, context);

/**
Check if the expression value of `node` is a `boolean`.

@param {Node} node
@param {RuleContext} context
@returns {boolean}
*/
export function isBooleanExpression(node, context) {
	if (isDirectBooleanExpression(node, context)) {
		return true;
	}

	if (isLogicalExpression(node.parent)) {
		return isBooleanExpression(node.parent, context);
	}

	return false;
}

/**
Check if `node` is used as a control-flow test.

@param {Node} node
@returns {boolean}
*/
export function isControlFlowTest(node) {
	if (isVueBooleanAttributeValue(node.parent) || isDirectControlFlowTest(node)) {
		return true;
	}

	if (isLogicalExpression(node.parent)) {
		return isControlFlowTest(node.parent);
	}

	return false;
}

/**
Get the boolean type-casting ancestor.

@typedef {{ node: Node, isNegative: boolean }} Result

@param {Node} node
@param {RuleContext} context
@returns {Result}
*/
export function getBooleanAncestor(node, context) {
	let isNegative = false;

	while (true) {
		if (isLogicNotArgument(node)) {
			isNegative = !isNegative;
			node = node.parent;
		} else if (isBooleanCallArgument(node, context)) {
			node = node.parent;
		} else {
			break;
		}
	}

	return {node, isNegative};
}
