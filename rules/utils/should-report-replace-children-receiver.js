import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isUnknownType,
} from './types.js';

const hasZeroArgumentReplaceChildrenCallSignature = (type, checker) =>
	checker.getTypeOfPropertyOfType(type, 'replaceChildren')
		?.getCallSignatures()
		.some(signature => signature.minArgumentCount === 0) ?? false;

const hasInnerHTMLProperty = (type, checker) =>
	Boolean(checker.getTypeOfPropertyOfType(type, 'innerHTML'));

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

const shouldReportReplaceChildrenReceiver = (context, node, options) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return true;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		return shouldReportReplaceChildrenReceiverType(parserServices.getTypeAtLocation(node), checker, options);
	} catch {
		return true;
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
		return false;
	}

	try {
		return mayBeHtmlTemplateElementType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
			parserServices.program,
		);
	} catch {
		return false;
	}
};

export {
	mayBeHtmlTemplateElement,
};

export default shouldReportReplaceChildrenReceiver;
