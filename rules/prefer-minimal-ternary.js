import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getParenthesizedText,
	hasOptionalChainElement,
	isConstEnumReference,
	isParenthesized,
	needsSemicolon,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-minimal-ternary';
const messages = {
	[MESSAGE_ID]: 'Move the ternary into the varying part of the expression.',
};

const ignoredExpressionTypes = new Set([
	'ChainExpression',
	'LogicalExpression',
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
		// Computed access to a `const enum` member requires a string literal (TS2476).
		|| isConstEnumReference(left.object, context)
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
	// All callee-varying call cases push the ternary in front of the call (`(test ? a : b)()`), hiding the call site, so they are opt-in. `checkVaryingBase` covers plain identifiers and member access with a varying receiver and static property; `checkComputedMemberAccess` additionally produces computed member access (`obj[test ? 'a' : 'b'](…)`).
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

function hasOneMinimalValueDifference(leftItems, rightItems, sourceCode) {
	if (!hasOneMinimalItemDifference(leftItems, rightItems, sourceCode)) {
		return false;
	}

	const differentIndex = leftItems.findIndex((leftItem, index) => !isSameSourceText(leftItem, rightItems[index], sourceCode));

	// Only shared values before the varying value move ahead of the condition.
	return leftItems.slice(0, differentIndex).every(item => isSafeSharedExpression(item));
}

function isMinimalObjectExpression(left, right, context) {
	if (left.type !== 'ObjectExpression' || right.type !== 'ObjectExpression') {
		return false;
	}

	const isOrdinaryProperty = property => property.type === 'Property'
		&& !property.computed
		&& !property.method
		&& property.kind === 'init'
		&& (property.shorthand || getStaticPropertyName(property, context) !== '__proto__');

	return left.properties.length === right.properties.length
		&& left.properties.every(property => isOrdinaryProperty(property))
		&& right.properties.every(property => isOrdinaryProperty(property))
		&& left.properties.every((property, index) => getStaticPropertyName(property, context) === getStaticPropertyName(right.properties[index], context))
		&& hasOneMinimalValueDifference(
			left.properties.map(property => property.value),
			right.properties.map(property => property.value),
			context.sourceCode,
		);
}

function isMinimalArrayExpression(left, right, context) {
	return left.type === 'ArrayExpression'
		&& right.type === 'ArrayExpression'
		&& left.elements.every(element => element && element.type !== 'SpreadElement')
		&& right.elements.every(element => element && element.type !== 'SpreadElement')
		&& hasOneMinimalValueDifference(left.elements, right.elements, context.sourceCode);
}

function isMinimalNewExpression(left, right, context) {
	if (
		left.type !== 'NewExpression'
		|| right.type !== 'NewExpression'
		|| left.callee.type !== 'Identifier'
		|| right.callee.type !== 'Identifier'
		|| left.callee.name !== right.callee.name
		|| left.arguments.some(argument => argument.type === 'SpreadElement')
		|| right.arguments.some(argument => argument.type === 'SpreadElement')
	) {
		return false;
	}

	const {sourceCode} = context;

	return getTypeArgumentsText(left, sourceCode) === getTypeArgumentsText(right, sourceCode)
		&& hasOneMinimalValueDifference(left.arguments, right.arguments, sourceCode);
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

function isMinimalMemberExpression(left, right, context, {checkVaryingBase, checkComputedMemberAccess}) {
	// Dynamic computed-key swaps (`obj[a] : obj[b]`) are always reported: the access is already computed, so `obj[test ? a : b]` removes the duplication with no regression. Object swaps (`a.foo : b.foo`) are opt-in via `checkVaryingBase`: minimizing them moves the ternary into the base (`(test ? a : b).foo`), which wraps the receiver in a conditional and breaks TypeScript `const enum` access. Static property swaps (`obj.a : obj.b`) are opt-in via `checkComputedMemberAccess`, since minimizing them forces computed access in place of clearer property access.
	return hasSameObjectWithDifferentDynamicKey(left, right, context)
		|| (checkComputedMemberAccess && hasSameObjectWithDifferentStaticProperty(left, right, context))
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
		|| isMinimalMemberExpression(consequent, alternate, context, options)
		|| isMinimalObjectExpression(consequent, alternate, context)
		|| isMinimalArrayExpression(consequent, alternate, context)
		|| isMinimalNewExpression(consequent, alternate, context);
}

// Only known expression forms may move before the condition, since `hasSideEffect` does not detect every implicit call.
function isSafeToReorderExpression(node) {
	node = unwrapTypeScriptExpression(node);
	if (isSafeSharedExpression(node)) {
		return true;
	}

	switch (node.type) {
		case 'MemberExpression': {
			return isSafeToReorderExpression(node.object)
				&& (!node.computed || isSafeToReorderExpression(node.property));
		}

		case 'ChainExpression': {
			return isSafeToReorderExpression(node.expression);
		}

		case 'UnaryExpression': {
			return ['!', 'typeof', 'void'].includes(node.operator)
				&& isSafeToReorderExpression(node.argument);
		}

		case 'BinaryExpression': {
			return ['===', '!=='].includes(node.operator)
				&& isSafeToReorderExpression(node.left)
				&& isSafeToReorderExpression(node.right);
		}

		case 'LogicalExpression': {
			return isSafeToReorderExpression(node.left) && isSafeToReorderExpression(node.right);
		}

		case 'ConditionalExpression': {
			return isSafeToReorderExpression(node.test)
				&& isSafeToReorderExpression(node.consequent)
				&& isSafeToReorderExpression(node.alternate);
		}

		default: {
			return false;
		}
	}
}

function canMoveBeforeCondition(node, context) {
	return isSafeToReorderExpression(node)
		&& !hasSideEffect(node, context.sourceCode, {considerImplicitTypeConversion: true});
}

function getExpressionItems(node) {
	return node.type === 'ObjectExpression' ? node.properties.map(property => property.value) : node.elements ?? node.arguments;
}

function getTypeArgumentsText(node, sourceCode) {
	const typeArguments = node.typeArguments ?? node.typeParameters;
	return typeArguments ? sourceCode.getText(typeArguments) : '';
}

function getMinimalExpressionText(left, right, {condition, context, abort}) {
	const {sourceCode} = context;
	const getText = node => {
		const text = getParenthesizedText(node, context);
		return node.type === 'SequenceExpression' && !isParenthesized(node, context) ? `(${text})` : text;
	};

	const conditionText = getText(condition);
	const getConditionalText = (consequent, alternate) => `${conditionText} ? ${getText(consequent)} : ${getText(alternate)}`;

	if (left.type === 'Identifier') {
		if (left.name === 'eval' || right.name === 'eval') {
			abort();
		}

		return `(${getConditionalText(left, right)})`;
	}

	const replace = (node, text) => {
		const [start, end] = sourceCode.getRange(node);
		const [expressionStart, expressionEnd] = sourceCode.getRange(left);
		return sourceCode.text.slice(expressionStart, start) + text + sourceCode.text.slice(end, expressionEnd);
	};

	const requireSafeExpressions = expressions => {
		// Literal values cannot be changed by the condition.
		if (expressions.some(expression => expression.type !== 'Literal') && (
			!canMoveBeforeCondition(condition, context)
			|| expressions.some(expression => !canMoveBeforeCondition(expression, context))
		)) {
			abort();
		}
	};

	if (left.type === 'MemberExpression') {
		if (!isSameSourceText(left.object, right.object, sourceCode)) {
			if ([left, right].some(member => member.computed && member.property.type !== 'Literal')) {
				abort();
			}

			return replace(left.object, `(${getConditionalText(left.object, right.object)})`);
		}

		// A statement starting with `let[…]` is parsed as a declaration in scripts.
		if (left.object.type === 'Identifier' && left.object.name === 'let') {
			abort();
		}

		requireSafeExpressions([left.object]);
		const getKeyText = member => member.computed ? getText(member.property) : JSON.stringify(member.property.name);
		return `${getText(left.object)}[${conditionText} ? ${getKeyText(left)} : ${getKeyText(right)}]`;
	}

	if (left.type === 'BinaryExpression') {
		const isLeftSame = isSameSourceText(left.left, right.left, sourceCode);
		if (isLeftSame) {
			requireSafeExpressions([left.left]);
		}

		const key = isLeftSame ? 'right' : 'left';
		return replace(left[key], `(${getConditionalText(left[key], right[key])})`);
	}

	if (left.type === 'CallExpression' || left.type === 'NewExpression') {
		if (getTypeArgumentsText(left, sourceCode) !== getTypeArgumentsText(right, sourceCode)) {
			abort();
		}

		if (!isSameSourceText(left.callee, right.callee, sourceCode)) {
			return replace(left.callee, getMinimalExpressionText(left.callee, right.callee, {condition, context, abort}));
		}

		requireSafeExpressions([left.callee]);
	}

	const leftItems = getExpressionItems(left);
	const rightItems = getExpressionItems(right);
	const differentIndex = leftItems.findIndex((item, index) => !isSameSourceText(item, rightItems[index], sourceCode));
	requireSafeExpressions(leftItems.slice(0, differentIndex));
	if (
		left.type === 'ObjectExpression'
		&& [leftItems[differentIndex], rightItems[differentIndex]].some(item => {
			const {type} = unwrapTypeScriptExpression(item);
			return type.startsWith('TS') || ['ArrowFunctionExpression', 'FunctionExpression', 'ClassExpression'].includes(type);
		})
	) {
		abort();
	}

	const conditionalText = getConditionalText(leftItems[differentIndex], rightItems[differentIndex]);

	if (left.type === 'ObjectExpression' && left.properties[differentIndex].shorthand) {
		const property = left.properties[differentIndex];
		return replace(property, `${sourceCode.getText(property.key)}: ${conditionalText}`);
	}

	return replace(leftItems[differentIndex], conditionalText);
}

function fixMinimalTernary(node, context, fixer, abort) {
	const {sourceCode} = context;
	if (
		sourceCode.getCommentsInside(node).length > 0
		// A conditional produces a value, while member access produces a reference.
		|| (node.consequent.type === 'MemberExpression' && (
			node.parent.type.startsWith('TS')
			|| (node.parent.type === 'CallExpression' && node.parent.callee === node)
			|| (node.parent.type === 'TaggedTemplateExpression' && node.parent.tag === node)
			|| (node.parent.type === 'UnaryExpression' && node.parent.operator === 'delete')
		))
	) {
		abort();
	}

	let text = getMinimalExpressionText(node.consequent, node.alternate, {condition: node.test, context, abort});
	if (
		node.consequent.type === 'ObjectExpression'
		|| (node.consequent.type === 'BinaryExpression' && node.consequent.operator === 'in')
	) {
		text = `(${text})`;
	}

	if (!isParenthesized(node, context) && needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(node, text);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0];

	context.on('ConditionalExpression', node => {
		if (!isMinimalTernary(node.consequent, node.alternate, context, options)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer, {abort}) {
				yield fixMinimalTernary(node, context, fixer, abort);
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving ternaries into the minimal varying part of an expression.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
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
						description: 'Also report property reads and method calls sharing a simple receiver when only the static property or method name differs, requiring computed member access.',
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
