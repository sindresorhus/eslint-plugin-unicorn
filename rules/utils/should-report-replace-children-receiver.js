import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
} from './types.js';

const unknownTypeNames = new Set(['any', 'error', 'unknown']);

const hasZeroArgumentReplaceChildrenCallSignature = (type, checker) =>
	checker.getTypeOfPropertyOfType(type, 'replaceChildren')
		?.getCallSignatures()
		.some(signature => signature.minArgumentCount === 0) ?? false;

const shouldReportReplaceChildrenReceiverType = (type, checker) => {
	type = checker.getNonNullableType(type);

	if (unknownTypeNames.has(type.intrinsicName)) {
		return true;
	}

	if (type.isUnion()) {
		return type.types.every(type => shouldReportReplaceChildrenReceiverType(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return shouldReportReplaceChildrenReceiverType(constraint, checker);
	}

	if (type.isIntersection()) {
		return hasZeroArgumentReplaceChildrenCallSignature(type, checker)
			|| type.types.some(type => shouldReportReplaceChildrenReceiverType(type, checker));
	}

	return hasZeroArgumentReplaceChildrenCallSignature(type, checker);
};

const shouldReportReplaceChildrenReceiver = (context, node) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return true;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		return shouldReportReplaceChildrenReceiverType(parserServices.getTypeAtLocation(node), checker);
	} catch {
		return true;
	}
};

const mayBeHtmlTemplateElementType = (type, checker, program) => {
	type = checker.getNonNullableType(type);

	if (unknownTypeNames.has(type.intrinsicName)) {
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
