import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isUnknownType,
} from './types.js';
import {createTypeCheckers} from './type-helpers.js';

const hasZeroArgumentReplaceChildrenCallSignature = (type, checker) =>
	checker.getTypeOfPropertyOfType(type, 'replaceChildren')
		?.getCallSignatures()
		.some(signature => signature.minArgumentCount === 0) ?? false;

const hasInnerHTMLProperty = (type, checker) =>
	Boolean(checker.getTypeOfPropertyOfType(type, 'innerHTML'));

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
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return shouldReportReplaceChildrenReceiverFromSyntax(context, node, options);
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		return shouldReportReplaceChildrenReceiverType(parserServices.getTypeAtLocation(node), checker, options);
	} catch {
		return shouldReportReplaceChildrenReceiverFromSyntax(context, node, options);
	}
};

const mayBeHtmlTemplateElementType = (type, checker, program) => {
	type = checker.getNonNullableType(type);

	if (isUnknownType(type)) {
		return false;
	}

	if (type.isUnion() || type.isIntersection()) {
		return type.types.some(type => mayBeHtmlTemplateElementType(type, checker, program));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return mayBeHtmlTemplateElementType(constraint, checker, program);
	}

	const symbol = getTypeSymbol(type);
	if (
		symbol?.getName() === 'HTMLTemplateElement'
		&& isDefaultLibrarySymbol(symbol, program)
	) {
		return true;
	}

	return getBaseTypes(type, checker).some(type => mayBeHtmlTemplateElementType(type, checker, program));
};

const mayBeHtmlTemplateElement = (context, node) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return isHtmlTemplateElementFromSyntax(node, context, htmlTemplateElementSyntaxOptions);
	}

	try {
		return mayBeHtmlTemplateElementType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
			parserServices.program,
		);
	} catch {
		return isHtmlTemplateElementFromSyntax(node, context, htmlTemplateElementSyntaxOptions);
	}
};

export {
	mayBeHtmlTemplateElement,
};

export default shouldReportReplaceChildrenReceiver;
