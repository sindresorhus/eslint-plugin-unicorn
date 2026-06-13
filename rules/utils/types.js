const unknownTypeNames = new Set(['any', 'error', 'unknown']);
const nullishTypeNames = new Set(['null', 'undefined']);

const getTypeSymbol = type => type.getSymbol() ?? type.aliasSymbol;

const isDefaultLibrarySymbol = (symbol, program) =>
	symbol?.declarations?.some(declaration => program.isSourceFileDefaultLibrary(declaration.getSourceFile())) ?? false;

const isUnknownType = type => unknownTypeNames.has(type.intrinsicName);

const isNullishType = type => nullishTypeNames.has(type.intrinsicName);

function getBaseTypes(type, checker) {
	try {
		return checker.getBaseTypes(type) ?? type.getBaseTypes?.() ?? [];
	} catch {
		return [];
	}
}

export {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	isUnknownType,
};
