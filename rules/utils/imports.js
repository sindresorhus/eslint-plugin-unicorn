const isTypeImportSpecifier = specifier =>
	specifier.importKind === 'type'
	|| specifier.parent.importKind === 'type';

const isRuntimeImportSpecifier = specifier =>
	!isTypeImportSpecifier(specifier);

/**
Check if a scope variable definition only exists at the type level, like a `type`/`interface` declaration or a type-only import (`import type {Foo} from 'foo'`, `import {type Foo} from 'foo'`).

@param {import('eslint').Scope.Definition} definition
@returns {boolean}
*/
const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| (definition.type === 'ImportBinding' && isTypeImportSpecifier(definition.node));

export {
	isRuntimeImportSpecifier,
	isTypeImportSpecifier,
	isTypeOnlyDefinition,
};
