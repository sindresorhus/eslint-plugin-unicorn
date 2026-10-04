import {
	getBaseTypes,
	getTypeSymbol,
	isUnknownType,
	withTypeInformation,
} from './types.js';
import {createTypeCheckers} from './type-helpers.js';
import isGlobalIdentifier from './is-global-identifier.js';

const hasZeroArgumentReplaceChildrenCallSignature = (type, checker) =>
	checker.getTypeOfPropertyOfType(type, 'replaceChildren')
		?.getCallSignatures()
		.some(signature => signature.minArgumentCount === 0) ?? false;

const hasInnerHTMLProperty = (type, checker) =>
	Boolean(checker.getTypeOfPropertyOfType(type, 'innerHTML'));

const isKnownNonReplaceChildrenReceiverType = (type, options) => {
	const typeName = getTypeSymbol(type)?.getName();
	return (options.checkInnerHTML ? nonInnerHtmlParentNodeTypeNames : nonParentNodeTypeNames).has(typeName);
};

// Do not unwrap with `checker.getNonNullableType()` here: for a type parameter `T`, it returns `T & {}`, which recurses back into `T` forever.
const isUnknownOrAllUnknownTypes = (type, checker) => {
	if (isUnknownType(type)) {
		return true;
	}

	if (type.isUnion() || type.isIntersection()) {
		return type.types.every(type => isUnknownOrAllUnknownTypes(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	return constraint && constraint !== type
		? isUnknownOrAllUnknownTypes(constraint, checker)
		: false;
};

// `window` and `self` are a `Window` in a browser, it does not implement `ParentNode`
const windowGlobalNames = new Set(['globalThis', 'self', 'window']);
const isWindowGlobal = (node, context) =>
	node.type === 'Identifier'
	&& windowGlobalNames.has(node.name)
	&& isGlobalIdentifier(node, context);

const receiverSyntaxOptions = {
	allowNullishInMixedUnion: true,
	treatMixedUnionAsNonTarget: true,
};
const htmlTemplateElementSyntaxOptions = {
	allowNullishInMixedUnion: true,
	treatMixedUnionAsTarget: true,
};
const nonParentNodeTypeNames = new Set([
	'Attr',
	'CDATASection',
	'CharacterData',
	'ChildNode',
	'Comment',
	'DocumentType',
	'Node',
	'Text',
	// `Window` does not implement `ParentNode`
	'Window',
	'WindowProxy',
]);
const nonInnerHtmlParentNodeTypeNames = new Set([
	...nonParentNodeTypeNames,
	'Document',
	'DocumentFragment',
	'ParentNode',
]);
const {
	isKnownNonTarget: isKnownNonReplaceChildrenReceiver,
} = createTypeCheckers({
	checkClassSyntax: true,
	targetTypeNames: new Set([
		'Document',
		'DocumentFragment',
		'Element',
		'HTMLDocument',
		'HTMLElement',
		'ParentNode',
		'SVGElement',
		'ShadowRoot',
	]),
	nonTargetTypeNames: nonParentNodeTypeNames,
	isNonTargetNode: isWindowGlobal,
});
const {
	isKnownNonTarget: isKnownNonInnerHtmlReplaceChildrenReceiver,
} = createTypeCheckers({
	checkClassSyntax: true,
	targetTypeNames: new Set([
		'Element',
		'HTMLElement',
		'SVGElement',
		'ShadowRoot',
	]),
	nonTargetTypeNames: nonInnerHtmlParentNodeTypeNames,
	isNonTargetNode: isWindowGlobal,
});
const {
	isTarget: isHtmlTemplateElementFromSyntax,
} = createTypeCheckers({
	checkClassSyntax: true,
	targetTypeNames: new Set([
		'HTMLTemplateElement',
	]),
});

const shouldReportReplaceChildrenReceiverType = (type, checker, options = {}) => {
	type = checker.getNonNullableType(type);

	if (isUnknownType(type)) {
		return true;
	}

	if (type.isUnion()) {
		return type.types.every(type => shouldReportReplaceChildrenReceiverType(type, checker, options));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return shouldReportReplaceChildrenReceiverType(constraint, checker, options);
	}

	if (isKnownNonReplaceChildrenReceiverType(type, options)) {
		return false;
	}

	if (type.isIntersection()) {
		const hasCompatibleReplaceChildren = hasZeroArgumentReplaceChildrenCallSignature(type, checker)
			&& (!options.checkInnerHTML || hasInnerHTMLProperty(type, checker));

		return hasCompatibleReplaceChildren
			|| type.types.some(type => shouldReportReplaceChildrenReceiverType(type, checker, options));
	}

	return hasZeroArgumentReplaceChildrenCallSignature(type, checker)
		&& (!options.checkInnerHTML || hasInnerHTMLProperty(type, checker));
};

const shouldReportReplaceChildrenReceiverFromSyntax = (context, node, options = {}) => {
	const isKnownNonReceiver = options.checkInnerHTML
		? isKnownNonInnerHtmlReplaceChildrenReceiver
		: isKnownNonReplaceChildrenReceiver;

	return !isKnownNonReceiver(node, context, receiverSyntaxOptions);
};

const shouldReportReplaceChildrenReceiver = (context, node, options) => {
	const shouldReportFromSyntax = shouldReportReplaceChildrenReceiverFromSyntax(context, node, options);
	return withTypeInformation(node, context, ({type, checker}) => {
		if (
			!shouldReportFromSyntax
			&& isUnknownOrAllUnknownTypes(type, checker)
		) {
			return false;
		}

		return shouldReportReplaceChildrenReceiverType(type, checker, options);
	}) ?? shouldReportFromSyntax;
};

// Like `isUnknownOrAllUnknownTypes()`, this must not unwrap with `checker.getNonNullableType()`. A nullish union member is never a template element anyway.
const mayBeHtmlTemplateElementType = (type, checker) => {
	if (isUnknownType(type)) {
		return false;
	}

	if (type.isUnion() || type.isIntersection()) {
		return type.types.some(type => mayBeHtmlTemplateElementType(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return mayBeHtmlTemplateElementType(constraint, checker);
	}

	const symbol = getTypeSymbol(type);
	if (symbol?.getName() === 'HTMLTemplateElement') {
		return true;
	}

	return getBaseTypes(type, checker).some(type => mayBeHtmlTemplateElementType(type, checker));
};

const mayBeHtmlTemplateElement = (context, node) => {
	if (isHtmlTemplateElementFromSyntax(node, context, htmlTemplateElementSyntaxOptions)) {
		return true;
	}

	return withTypeInformation(node, context, ({type, checker}) => mayBeHtmlTemplateElementType(type, checker)) ?? false;
};

export {
	mayBeHtmlTemplateElement,
};

export default shouldReportReplaceChildrenReceiver;
