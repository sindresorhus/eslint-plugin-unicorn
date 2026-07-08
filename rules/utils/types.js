const unknownTypeNames = new Set(['any', 'error', 'unknown']);
const nullishTypeNames = new Set(['null', 'undefined']);

// `TypeFlags` bit values from TypeScript.
const templateLiteralTypeFlag = 4_194_304; // TypeFlags.TemplateLiteral
const uniqueSymbolTypeFlag = 16_384; // TypeFlags.UniqueESSymbol
const stringMappingTypeFlag = 8_388_608; // TypeFlags.StringMapping
const typeParameterTypeFlag = 524_288; // TypeFlags.TypeParameter

// `SymbolFlags` bit values from TypeScript.
const constEnumSymbolFlag = 128; // SymbolFlags.ConstEnum
const aliasSymbolFlag = 2_097_152; // SymbolFlags.Alias

// Test a single flag bit. Uses modulo rather than bitwise `&`, which truncates to 32 bits, to stay correct if the flags ever grow past that.
const hasFlag = (flags, flag) => (flags % (flag * 2)) >= flag;

const typeHasFlag = (type, flag) => hasFlag(type.flags, flag);

const isConstEnumSymbol = symbol => hasFlag(symbol.flags, constEnumSymbolFlag);

const isAliasSymbol = symbol => hasFlag(symbol.flags, aliasSymbolFlag);

const isTemplateLiteralType = type => typeHasFlag(type, templateLiteralTypeFlag);

const isUniqueSymbolType = type => typeHasFlag(type, uniqueSymbolTypeFlag);

const isStringMappingType = type => typeHasFlag(type, stringMappingTypeFlag);

const isTypeParameterType = type =>
	type.isTypeParameter?.() || typeHasFlag(type, typeParameterTypeFlag);

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
	isAliasSymbol,
	isConstEnumSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	isStringMappingType,
	isTemplateLiteralType,
	isTypeParameterType,
	isUniqueSymbolType,
	isUnknownType,
};
