const isTypeImportSpecifier = specifier =>
	specifier.importKind === 'type'
	|| specifier.parent.importKind === 'type';

const isRuntimeImportSpecifier = specifier =>
	!isTypeImportSpecifier(specifier);

export {
	isRuntimeImportSpecifier,
	isTypeImportSpecifier,
};
