import {
	getBaseTypes,
	getTypeSymbol,
	isUnknownType,
} from './types.js';
import {createTypeCheckers} from './type-helpers.js';

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

const isUnknownOrAllUnknownTypes = (type, checker) => {
	type = checker.getNonNullableType(type);

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
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return shouldReportFromSyntax;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		const type = parserServices.getTypeAtLocation(node);
		if (
			!shouldReportFromSyntax
			&& isUnknownOrAllUnknownTypes(type, checker)
		) {
			return false;
		}

		return shouldReportReplaceChildrenReceiverType(type, checker, options);
	} catch {
		return shouldReportReplaceChildrenReceiverFromSyntax(context, node, options);
	}
};

const mayBeHtmlTemplateElementType = (type, checker) => {
	type = checker.getNonNullableType(type);

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

	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		return mayBeHtmlTemplateElementType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		return isHtmlTemplateElementFromSyntax(node, context, htmlTemplateElementSyntaxOptions);
	}
};

export {
	mayBeHtmlTemplateElement,
};

export default shouldReportReplaceChildrenReceiver;
