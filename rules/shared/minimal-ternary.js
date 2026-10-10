import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {isFunction} from '../ast/index.js';
import {
	containsNode,
	getConditionalExpressionChildText,
	getParenthesizedText,
	getTokenStore,
	getVisitorChildNodes,
	hasOptionalChainElement,
	hasSameTypeArguments,
	isConstEnumReference,
	isParenthesized,
	isSameTokens,
	isTypeScriptFile,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from '../utils/index.js';

const safeSharedExpressionTypes = new Set([
	'Identifier',
	'Literal',
	'Super',
	'ThisExpression',
]);

function getExpressionTokens(node, context) {
	// JSX text entities and literal whitespace can produce different rendered text even when their decoded token values match.
	const tokens = getTokenStore(context, node).getTokens(node).map(token => token.type === 'JSXText'
		? {...token, value: context.sourceCode.getText(token)}
		: token);
	if (node.type === 'ObjectExpression' && tokens.at(-2)?.value === ',') {
		return [...tokens.slice(0, -2), tokens.at(-1)];
	}

	return tokens;
}

function isSameExpression(left, right, context) {
	const {sourceCode} = context;
	if (sourceCode.getText(left) === sourceCode.getText(right)) {
		return true;
	}

	const isFunctionOrClass = node => isFunction(node) || node.type === 'ClassExpression';
	// Line breaks can change behavior inside statement bodies through automatic semicolon insertion.
	return isSameTokens(getExpressionTokens(left, context), getExpressionTokens(right, context))
		&& !containsNode(left, context, isFunctionOrClass)
		&& !containsNode(right, context, isFunctionOrClass);
}

function isSafeSharedExpression(node) {
	return safeSharedExpressionTypes.has(node.type);
}

function isSafeSharedCallee(node) {
	return isSafeSharedExpression(node)
		|| (node.type === 'MemberExpression'
			&& isSafeSharedExpression(node.object)
			&& (!node.computed || node.property.type === 'Literal'));
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
	if (
		left.type !== 'MemberExpression'
		|| right.type !== 'MemberExpression'
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| !isSafeSharedExpression(left.object)
		|| !isSameExpression(left.object, right.object, context)
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
		&& !isSameExpression(left.object, right.object, context);
}

function hasMinimalCalleeDifference(left, right, context, {checkVaryingBase, checkComputedMemberAccess}) {
	// All callee-varying call cases push the ternary in front of the call (`(test ? a : b)()`), hiding the call site, so they are opt-in. `checkVaryingBase` covers plain identifiers and member access with a varying receiver and static property; `checkComputedMemberAccess` additionally produces computed member access (`obj[test ? 'a' : 'b'](…)`).
	return (checkVaryingBase && isDifferentIdentifier(left, right))
		|| (checkComputedMemberAccess && hasSameObjectWithDifferentStaticProperty(left, right, context))
		|| (checkVaryingBase && hasSameStaticPropertyWithDifferentObject(left, right, context));
}

function getMinimalDifferentItemIndex(leftItems, rightItems, context) {
	if (leftItems.length !== rightItems.length) {
		return;
	}

	let differentIndex;

	for (const [index, leftItem] of leftItems.entries()) {
		const rightItem = rightItems[index];

		if (isSameExpression(leftItem, rightItem, context)) {
			continue;
		}

		if (
			differentIndex !== undefined
			|| leftItem.type === 'ConditionalExpression'
			|| rightItem.type === 'ConditionalExpression'
		) {
			return;
		}

		differentIndex = index;
	}

	return differentIndex;
}

function hasSameItems(leftItems, rightItems, context) {
	return leftItems.length === rightItems.length
		&& leftItems.every((leftItem, index) => isSameExpression(leftItem, rightItems[index], context));
}

function hasOneMinimalValueDifference(leftItems, rightItems, context) {
	const differentIndex = getMinimalDifferentItemIndex(leftItems, rightItems, context);

	// Only shared values before the varying value move ahead of the condition.
	return differentIndex !== undefined
		&& leftItems.slice(0, differentIndex).every(item => isSafeSharedExpression(item));
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
			context,
		);
}

function isMinimalArrayExpression(left, right, context) {
	return left.type === 'ArrayExpression'
		&& right.type === 'ArrayExpression'
		&& left.elements.every(element => element && element.type !== 'SpreadElement')
		&& right.elements.every(element => element && element.type !== 'SpreadElement')
		&& hasOneMinimalValueDifference(left.elements, right.elements, context);
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

	return hasSameTypeArguments(left, right, context)
		&& hasOneMinimalValueDifference(left.arguments, right.arguments, context);
}

function isMinimalCallExpression(left, right, context, options) {
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
		isSameExpression(left.callee, right.callee, context)
		&& isSafeSharedCallee(left.callee)
		&& getMinimalDifferentItemIndex(left.arguments, right.arguments, context) !== undefined
	) {
		return true;
	}

	return hasSameItems(left.arguments, right.arguments, context)
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

	const isLeftSame = isSameExpression(left.left, right.left, context);
	const isRightSame = isSameExpression(left.right, right.right, context);

	if (isLeftSame === isRightSame) {
		return false;
	}

	return isRightSame || isSafeSharedExpression(left.left);
}

function hasSameObjectWithDifferentDynamicKey(left, right, context) {
	if (
		left.type !== 'MemberExpression'
		|| right.type !== 'MemberExpression'
		// Non-computed access can't be a dynamic key, and the `computed` guard also excludes private fields (`obj.#a`), which have no static name but can't be made computed.
		|| !left.computed
		|| !right.computed
		|| hasOptionalChainElement(left)
		|| hasOptionalChainElement(right)
		|| !isSafeSharedExpression(left.object)
		|| !isSameExpression(left.object, right.object, context)
	) {
		return false;
	}

	// A statically known key (`obj[0]`, `obj['a']`) is treated as a static property, not a dynamic key.
	return getStaticPropertyName(left, context) === undefined
		&& getStaticPropertyName(right, context) === undefined
		&& !isSameExpression(left.property, right.property, context);
}

function isMinimalMemberExpression(left, right, context, {checkVaryingBase, checkComputedMemberAccess}) {
	// Dynamic computed-key swaps (`obj[a] : obj[b]`) are always reported: the access is already computed, so `obj[test ? a : b]` removes the duplication with no regression. Object swaps (`a.foo : b.foo`) are opt-in via `checkVaryingBase`: minimizing them moves the ternary into the base (`(test ? a : b).foo`), which wraps the receiver in a conditional and breaks TypeScript `const enum` access. Static property swaps (`obj.a : obj.b`) are opt-in via `checkComputedMemberAccess`, since minimizing them forces computed access in place of clearer property access.
	return hasSameObjectWithDifferentDynamicKey(left, right, context)
		|| (checkComputedMemberAccess && hasSameObjectWithDifferentStaticProperty(left, right, context))
		|| (checkVaryingBase && hasSameStaticPropertyWithDifferentObject(left, right, context));
}

/**
Return whether the expressions share a supported shape with one varying part.
*/
export function isMinimalTernary(consequent, alternate, context, options) {
	if (consequent.type !== alternate.type) {
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

/**
Check whether factoring the branches preserves their types, using type information when available.
*/
export function isTypeSafeToMinimize(consequent, alternate, context) {
	const typeSafe = withTypeInformation(consequent, context, ({type, checker}) => {
		const {parserServices} = context.sourceCode;
		const areTypesCompatible = (left, right) => checker.isTypeAssignableTo(left, right)
			&& checker.isTypeAssignableTo(right, left);
		const hasCompatibleExpressionTypes = (left, right) => {
			if (!areTypesCompatible(parserServices.getTypeAtLocation(left), parserServices.getTypeAtLocation(right))) {
				return false;
			}

			const rightChildren = [...getVisitorChildNodes(right, context.sourceCode.visitorKeys)];
			return [...getVisitorChildNodes(left, context.sourceCode.visitorKeys)].every((child, index) => hasCompatibleExpressionTypes(child, rightChildren[index]));
		};

		const getExpressionParts = node => {
			if (node.type === 'BinaryExpression') {
				return [node.left, node.right];
			}

			return node.type === 'MemberExpression' ? [node.object] : getExpressionItems(node);
		};

		const alternateParts = getExpressionParts(alternate);
		// Shared expressions leave the branches, including descendants that may require narrowing even when their result types match.
		if (getExpressionParts(consequent).some((part, index) => isSameExpression(part, alternateParts[index], context) && !hasCompatibleExpressionTypes(part, alternateParts[index]))) {
			return false;
		}

		if (consequent.type === 'BinaryExpression') {
			return ['left', 'right'].every(key => {
				const consequentOperandType = checker.getBaseTypeOfLiteralType(parserServices.getTypeAtLocation(consequent[key]));
				const alternateOperandType = checker.getBaseTypeOfLiteralType(parserServices.getTypeAtLocation(alternate[key]));
				return areTypesCompatible(consequentOperandType, alternateOperandType);
			});
		}

		if (consequent.type === 'MemberExpression') {
			return true;
		}

		const hasCompatibleMemberReceivers = (left, right) => left.type !== 'MemberExpression'
			|| right.type !== 'MemberExpression'
			|| !isSameExpression(left.object, right.object, context)
			|| areTypesCompatible(parserServices.getTypeAtLocation(left.object), parserServices.getTypeAtLocation(right.object));

		if (consequent.type === 'CallExpression' && !hasCompatibleMemberReceivers(consequent.callee, alternate.callee)) {
			return false;
		}

		const alternateType = parserServices.getTypeAtLocation(alternate);
		// Combining distinct branch types can lose discriminant correlations and generic or tuple inference.
		if (!areTypesCompatible(type, alternateType)) {
			return false;
		}

		if (consequent.type === 'CallExpression' || consequent.type === 'NewExpression') {
			if (!isSameExpression(consequent.callee, alternate.callee, context)) {
				const consequentCalleeType = parserServices.getTypeAtLocation(consequent.callee);
				const alternateCalleeType = parserServices.getTypeAtLocation(alternate.callee);
				return areTypesCompatible(consequentCalleeType, alternateCalleeType);
			}

			// Separate overloads or generic instantiations can accept each branch while rejecting their combined arguments.
			const consequentNode = parserServices.esTreeNodeToTSNodeMap.get(consequent);
			const alternateNode = parserServices.esTreeNodeToTSNodeMap.get(alternate);
			const consequentSignature = checker.getResolvedSignature(consequentNode);
			const alternateSignature = checker.getResolvedSignature(alternateNode);
			if (
				!consequentSignature?.declaration
				|| consequentSignature.declaration !== alternateSignature?.declaration
				|| consequentSignature.parameters.length !== alternateSignature.parameters.length
				// Rest parameters can correlate argument types that lose their relationship when combined.
				|| consequentSignature.declaration.parameters.some(parameter => parameter.dotDotDotToken)
			) {
				return false;
			}

			return consequentSignature.parameters.every((parameter, index) => {
				const consequentParameterType = checker.getTypeOfSymbolAtLocation(parameter, consequentNode);
				const alternateParameterType = checker.getTypeOfSymbolAtLocation(alternateSignature.parameters[index], alternateNode);
				return areTypesCompatible(consequentParameterType, alternateParameterType);
			});
		}

		return true;
	});
	if (typeSafe !== undefined) {
		return typeSafe;
	}

	if (
		consequent.type !== 'ObjectExpression'
		|| (!context.sourceCode.parserServices?.esTreeNodeToTSNodeMap && !isTypeScriptFile(context.physicalFilename))
	) {
		return true;
	}

	const consequentItems = getExpressionItems(consequent);
	const differentIndex = getMinimalDifferentItemIndex(consequentItems, getExpressionItems(alternate), context);
	// Shared non-literal values can lose branch narrowing when moved outside the ternary.
	return consequentItems.every((item, index) => index === differentIndex || item.type === 'Literal');
}

/**
Build the minimal expression, or return undefined when its evaluation order or syntax would be unsafe.
*/
// eslint-disable-next-line complexity
export function getMinimalExpressionText(left, right, {condition, context}) {
	const {sourceCode} = context;
	const getText = node => {
		const text = getParenthesizedText(node, context);
		return node.type === 'SequenceExpression' && !isParenthesized(node, context) ? `(${text})` : text;
	};

	const conditionText = getConditionalExpressionChildText(condition, context);
	const getConditionalText = (consequent, alternate) => `${conditionText} ? ${getText(consequent)} : ${getText(alternate)}`;

	if (left.type === 'Identifier') {
		if (left.name === 'eval' || right.name === 'eval') {
			return;
		}

		return `(${getConditionalText(left, right)})`;
	}

	const replace = (node, text) => {
		const [start, end] = sourceCode.getRange(node);
		const [expressionStart, expressionEnd] = sourceCode.getRange(left);
		return sourceCode.text.slice(expressionStart, start) + text + sourceCode.text.slice(end, expressionEnd);
	};

	// Literal values cannot be changed by the condition.
	const canMoveBeforeTest = expressions => expressions.every(expression => expression.type === 'Literal')
		|| (canMoveBeforeCondition(condition, context) && expressions.every(expression => canMoveBeforeCondition(expression, context)));

	if (left.type === 'MemberExpression') {
		if (!isSameExpression(left.object, right.object, context)) {
			if ([left, right].some(member => member.computed && member.property.type !== 'Literal')) {
				return;
			}

			return replace(left.object, `(${getConditionalText(left.object, right.object)})`);
		}

		if (!canMoveBeforeTest([left.object])) {
			return;
		}

		const getKeyText = member => member.computed ? getText(member.property) : JSON.stringify(member.property.name);
		return `${getText(left.object)}[${conditionText} ? ${getKeyText(left)} : ${getKeyText(right)}]`;
	}

	if (left.type === 'BinaryExpression') {
		const isLeftSame = isSameExpression(left.left, right.left, context);
		if (isLeftSame && !canMoveBeforeTest([left.left])) {
			return;
		}

		const key = isLeftSame ? 'right' : 'left';
		return replace(left[key], `(${getConditionalText(left[key], right[key])})`);
	}

	if (left.type === 'CallExpression' || left.type === 'NewExpression') {
		if (!hasSameTypeArguments(left, right, context)) {
			return;
		}

		if (!isSameExpression(left.callee, right.callee, context)) {
			const calleeText = getMinimalExpressionText(left.callee, right.callee, {condition, context});
			return calleeText === undefined ? undefined : replace(left.callee, calleeText);
		}

		if (!canMoveBeforeTest([left.callee])) {
			return;
		}
	}

	const leftItems = getExpressionItems(left);
	const rightItems = getExpressionItems(right);
	const differentIndex = getMinimalDifferentItemIndex(leftItems, rightItems, context);
	if (!canMoveBeforeTest(leftItems.slice(0, differentIndex))) {
		return;
	}

	if (
		left.type === 'ObjectExpression'
		&& [leftItems[differentIndex], rightItems[differentIndex]].some(item => {
			const {type} = unwrapTypeScriptExpression(item);
			return type.startsWith('TS') || ['ArrowFunctionExpression', 'FunctionExpression', 'ClassExpression'].includes(type);
		})
	) {
		return;
	}

	const conditionalText = getConditionalText(leftItems[differentIndex], rightItems[differentIndex]);

	if (left.type === 'ObjectExpression' && left.properties[differentIndex].shorthand) {
		const property = left.properties[differentIndex];
		return replace(property, `${sourceCode.getText(property.key)}: ${conditionalText}`);
	}

	return replace(leftItems[differentIndex], conditionalText);
}

export const minimalTernaryOptionsSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		checkVaryingBase: {
			type: 'boolean',
			description: 'Also report expressions that differ only by the base of a call or member access, whose minimization moves the ternary into the base (`(test ? a : b).foo`).',
		},
		checkComputedMemberAccess: {
			type: 'boolean',
			description: 'Also report property reads and method calls sharing a simple receiver when only the static property or method name differs, requiring computed member access.',
		},
	},
};

export const minimalTernaryDefaultOptions = {checkVaryingBase: false, checkComputedMemberAccess: false};
