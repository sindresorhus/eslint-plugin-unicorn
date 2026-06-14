import {getPropertyName} from '@eslint-community/eslint-utils';
import {hasOptionalChainElement} from './utils/index.js';

const MESSAGE_ID = 'prefer-minimal-ternary';
const messages = {
	[MESSAGE_ID]: 'Move the ternary into the varying part of the expression.',
};

const ignoredExpressionTypes = new Set([
	'ChainExpression',
	'LogicalExpression',
	'NewExpression',
	'SequenceExpression',
	'TaggedTemplateExpression',
]);

const safeSharedExpressionTypes = new Set([
	'Identifier',
	'Literal',
	'Super',
	'ThisExpression',
]);

function isIgnoredExpression(node) {
	return ignoredExpressionTypes.has(node.type);
}

function isSameSourceText(left, right, sourceCode) {
	return sourceCode.getText(left) === sourceCode.getText(right);
}

function isSafeSharedExpression(node) {
	return safeSharedExpressionTypes.has(node.type);
}

function getStaticPropertyName(node, context) {
	const propertyName = getPropertyName(node, context.sourceCode.getScope(node));

	return propertyName === null ? undefined : propertyName;
}

function isDifferentIdentifier(left, right) {
	return left.type === 'Identifier'
		&& right.type === 'Identifier'
		&& left.name !== right.name;
}

function hasSameObjectWithDifferentStaticProperty(left, right, context) {
	const {sourceCode} = context;

	if (
		left.type !== 'MemberExpression'
		|| right.type !== 'MemberExpression'
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| !isSafeSharedExpression(left.object)
		|| !isSameSourceText(left.object, right.object, sourceCode)
	) {
		return false;
	}

	const leftPropertyName = getStaticPropertyName(left, context);
	const rightPropertyName = getStaticPropertyName(right, context);

	return leftPropertyName !== undefined
		&& rightPropertyName !== undefined
		&& leftPropertyName !== rightPropertyName;
}

function hasSameStaticPropertyWithDifferentObject(left, right, context) {
	const {sourceCode} = context;

	if (
		left.type !== 'MemberExpression'
		|| right.type !== 'MemberExpression'
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| left.object.type === 'Super'
		|| right.object.type === 'Super'
	) {
		return false;
	}

	const leftPropertyName = getStaticPropertyName(left, context);
	const rightPropertyName = getStaticPropertyName(right, context);

	return leftPropertyName !== undefined
		&& leftPropertyName === rightPropertyName
		&& !isSameSourceText(left.object, right.object, sourceCode);
}

function hasMinimalCalleeDifference(left, right, context) {
	return isDifferentIdentifier(left, right)
		|| hasSameObjectWithDifferentStaticProperty(left, right, context)
		|| hasSameStaticPropertyWithDifferentObject(left, right, context);
}

function hasOneMinimalItemDifference(leftItems, rightItems, sourceCode) {
	if (leftItems.length !== rightItems.length) {
		return false;
	}

	let differentItems = 0;

	for (const [index, leftItem] of leftItems.entries()) {
		const rightItem = rightItems[index];

		if (isSameSourceText(leftItem, rightItem, sourceCode)) {
			continue;
		}

		if (leftItem.type === 'ConditionalExpression' || rightItem.type === 'ConditionalExpression') {
			return false;
		}

		differentItems++;
	}

	return differentItems === 1;
}

function hasSameItems(leftItems, rightItems, sourceCode) {
	return leftItems.length === rightItems.length
		&& leftItems.every((leftItem, index) => isSameSourceText(leftItem, rightItems[index], sourceCode));
}

function isMinimalCallExpression(left, right, context) {
	const {sourceCode} = context;

	if (
		left.type !== 'CallExpression'
		|| right.type !== 'CallExpression'
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| left.arguments.some(argument => argument.type === 'SpreadElement')
		|| right.arguments.some(argument => argument.type === 'SpreadElement')
	) {
		return false;
	}

	if (
		isSameSourceText(left.callee, right.callee, sourceCode)
		&& isSafeSharedExpression(left.callee)
		&& hasOneMinimalItemDifference(left.arguments, right.arguments, sourceCode)
	) {
		return true;
	}

	return hasSameItems(left.arguments, right.arguments, sourceCode)
		&& hasMinimalCalleeDifference(left.callee, right.callee, context);
}

function isPrivateBrandCheck(node) {
	return node.operator === 'in' && node.left.type === 'PrivateIdentifier';
}

function isMinimalBinaryExpression(left, right, context) {
	if (
		left.type !== 'BinaryExpression'
		|| right.type !== 'BinaryExpression'
		|| left.operator !== right.operator
		|| isPrivateBrandCheck(left)
		|| isPrivateBrandCheck(right)
	) {
		return false;
	}

	const leftSidesAreSame = isSameSourceText(left.left, right.left, context.sourceCode);
	const rightSidesAreSame = isSameSourceText(left.right, right.right, context.sourceCode);

	if (leftSidesAreSame === rightSidesAreSame) {
		return false;
	}

	return rightSidesAreSame || isSafeSharedExpression(left.left);
}

function isMinimalMemberExpression(left, right, context) {
	return hasSameObjectWithDifferentStaticProperty(left, right, context)
		|| hasSameStaticPropertyWithDifferentObject(left, right, context);
}

function isMinimalTernary(consequent, alternate, context) {
	if (
		consequent.type !== alternate.type
		|| isIgnoredExpression(consequent)
		|| isIgnoredExpression(alternate)
	) {
		return false;
	}

	return isMinimalCallExpression(consequent, alternate, context)
		|| isMinimalBinaryExpression(consequent, alternate, context)
		|| isMinimalMemberExpression(consequent, alternate, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ConditionalExpression', node => {
		if (!isMinimalTernary(node.consequent, node.alternate, context)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving ternaries into the minimal varying part of an expression.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
