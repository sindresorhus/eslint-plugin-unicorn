import {getPropertyName} from '@eslint-community/eslint-utils';
import {hasOptionalChainElement, isConstEnumReference} from './utils/index.js';

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
		// Wrapping either object in a ternary breaks `const enum` access (TS2475).
		|| isConstEnumReference(left.object, context)
		|| isConstEnumReference(right.object, context)
	) {
		return false;
	}

	const leftPropertyName = getStaticPropertyName(left, context);
	const rightPropertyName = getStaticPropertyName(right, context);

	return leftPropertyName !== undefined
		&& leftPropertyName === rightPropertyName
		&& !isSameSourceText(left.object, right.object, sourceCode);
}

function hasMinimalCalleeDifference(left, right, context, {checkVaryingBase, checkComputedMemberAccess}) {
	// All callee-varying call cases push the ternary in front of the call (`(test ? a : b)()`), hiding the call site, so they are opt-in. `checkVaryingBase` covers plain identifier and dot access; `checkComputedMemberAccess` additionally produces computed member access (`obj[test ? 'a' : 'b'](…)`).
	return (checkVaryingBase && isDifferentIdentifier(left, right))
		|| (checkComputedMemberAccess && hasSameObjectWithDifferentStaticProperty(left, right, context))
		|| (checkVaryingBase && hasSameStaticPropertyWithDifferentObject(left, right, context));
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

function isMinimalCallExpression(left, right, context, options) {
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
		&& hasMinimalCalleeDifference(left.callee, right.callee, context, options);
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

	const isLeftSidesAreSame = isSameSourceText(left.left, right.left, context.sourceCode);
	const isRightSidesAreSame = isSameSourceText(left.right, right.right, context.sourceCode);

	if (isLeftSidesAreSame === isRightSidesAreSame) {
		return false;
	}

	return isRightSidesAreSame || isSafeSharedExpression(left.left);
}

function hasSameObjectWithDifferentDynamicKey(left, right, context) {
	const {sourceCode} = context;

	if (
		left.type !== 'MemberExpression'
		|| right.type !== 'MemberExpression'
		// Non-computed access can't be a dynamic key, and the `computed` guard also excludes private fields (`obj.#a`), which have no static name but can't be made computed.
		|| !left.computed
		|| !right.computed
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| !isSafeSharedExpression(left.object)
		|| !isSameSourceText(left.object, right.object, sourceCode)
	) {
		return false;
	}

	// A statically known key (`obj[0]`, `obj['a']`) is treated as a static property, not a dynamic key.
	return getStaticPropertyName(left, context) === undefined
		&& getStaticPropertyName(right, context) === undefined
		&& !isSameSourceText(left.property, right.property, sourceCode);
}

function isMinimalMemberExpression(left, right, context, {checkVaryingBase}) {
	// Dynamic computed-key swaps (`obj[a] : obj[b]`) are always reported: the access is already computed, so `obj[test ? a : b]` removes the duplication with no regression. Object swaps (`a.foo : b.foo`) are opt-in via `checkVaryingBase`: minimizing them moves the ternary into the base (`(test ? a : b).foo`), which wraps the receiver in a conditional and breaks TypeScript `const enum` access. Static property swaps (`obj.a : obj.b`) are never reported, since minimizing them forces computed access in place of clearer property access.
	return hasSameObjectWithDifferentDynamicKey(left, right, context)
		|| (checkVaryingBase && hasSameStaticPropertyWithDifferentObject(left, right, context));
}

function isMinimalTernary(consequent, alternate, context, options) {
	if (
		consequent.type !== alternate.type
		|| isIgnoredExpression(consequent)
		|| isIgnoredExpression(alternate)
	) {
		return false;
	}

	return isMinimalCallExpression(consequent, alternate, context, options)
		|| isMinimalBinaryExpression(consequent, alternate, context)
		|| isMinimalMemberExpression(consequent, alternate, context, options);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0];

	context.on('ConditionalExpression', node => {
		if (!isMinimalTernary(node.consequent, node.alternate, context, options)) {
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
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					checkVaryingBase: {
						type: 'boolean',
						description: 'Also report ternaries that differ only by the base of a call or member access, whose minimization moves the ternary into the base (`(test ? a : b).foo`).',
					},
					checkComputedMemberAccess: {
						type: 'boolean',
						description: 'Also report method-call ternaries that differ only by the method name, whose minimization requires computed member access.',
					},
				},
			},
		],
		defaultOptions: [{checkVaryingBase: false, checkComputedMemberAccess: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
