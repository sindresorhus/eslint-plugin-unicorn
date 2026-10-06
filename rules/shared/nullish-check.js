import {isNullLiteral, isUndefined} from '../ast/index.js';
import {isSameReference} from '../utils/index.js';

// Shared logic for `consistent-conditional-object-spread` and `prefer-logical-operator-over-ternary`.

const nullishOperators = new Set(['==', '===']);
const nonNullishOperators = new Set(['!=', '!==']);

/**
Check whether two expressions are the same reference or have the same text. Expressions that can change a value, like `foo++`, are never the same.

@param {import('estree').Node} left
@param {import('estree').Node} right
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export function isSameNode(left, right, context) {
	if (isSameReference(left, right)) {
		return true;
	}

	if (left.type !== right.type) {
		return false;
	}

	switch (left.type) {
		case 'AwaitExpression': {
			return isSameNode(left.argument, right.argument, context);
		}

		case 'LogicalExpression': {
			return (
				left.operator === right.operator
				&& isSameNode(left.left, right.left, context)
				&& isSameNode(left.right, right.right, context)
			);
		}

		case 'UnaryExpression': {
			return (
				left.operator === right.operator
				&& left.prefix === right.prefix
				&& isSameNode(left.argument, right.argument, context)
			);
		}

		case 'UpdateExpression': {
			return false;
		}

		// No default
	}

	return context.sourceCode.getText(left) === context.sourceCode.getText(right);
}

function getNullishKind(node) {
	if (isNullLiteral(node)) {
		return 'null';
	}

	if (isUndefined(node)) {
		return 'undefined';
	}
}

function getNullishBinaryCheck(node) {
	if (
		node.type !== 'BinaryExpression'
		|| (!nullishOperators.has(node.operator) && !nonNullishOperators.has(node.operator))
	) {
		return;
	}

	const leftKind = getNullishKind(node.left);
	const rightKind = getNullishKind(node.right);

	if (Boolean(leftKind) === Boolean(rightKind)) {
		return;
	}

	return {
		reference: leftKind ? node.right : node.left,
		kind: node.operator.length === 2 ? 'nullish' : (leftKind ?? rightKind),
		isTrueWhenNullish: nullishOperators.has(node.operator),
	};
}

const checksNullAndUndefined = (left, right) =>
	(left.kind === 'null' && right.kind === 'undefined')
	|| (left.kind === 'undefined' && right.kind === 'null');

/**
Get the checked reference of a nullish test, like `foo == null`, `foo != undefined`, or `foo === null || foo === undefined`.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {{reference: import('estree').Node, isTrueWhenNullish: boolean} | undefined}
*/
export function getNullishTest(node, context) {
	const binaryCheck = getNullishBinaryCheck(node);

	if (binaryCheck?.kind === 'nullish') {
		return binaryCheck;
	}

	if (node.type !== 'LogicalExpression') {
		return;
	}

	const left = getNullishBinaryCheck(node.left);
	const right = getNullishBinaryCheck(node.right);

	if (
		!left
		|| !right
		|| !isSameNode(left.reference, right.reference, context)
	) {
		return;
	}

	if (
		node.operator === '||'
		&& left.isTrueWhenNullish
		&& right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: true,
		};
	}

	if (
		node.operator === '&&'
		&& !left.isTrueWhenNullish
		&& !right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: false,
		};
	}
}
