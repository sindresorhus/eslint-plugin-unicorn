import {isStaticRequire} from '../ast/index.js';
import {getVariableIdentifiers, isShorthandImportLocal} from '../utils/index.js';

const declarationTypes = new Set([
	'FunctionDeclaration',
	'ClassDeclaration',
	'TSTypeAliasDeclaration',
	'TSInterfaceDeclaration',
	'TSEnumDeclaration',
]);

const propertyNameParentTypes = new Set([
	'AccessorProperty',
	'MethodDefinition',
	'PropertyDefinition',
	'TSAbstractAccessorProperty',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
	'TSMethodSignature',
	'TSPropertySignature',
]);

/**
Check whether an identifier declares a named export.
*/
const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration'
			&& identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		declarationTypes.has(identifier.parent.type)
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

/**
Check whether a variable can be renamed without touching exported names or JSX tags.
*/
export const shouldRenameVariable = variable => getVariableIdentifiers(variable)
	.every(identifier =>
		!isExportedIdentifier(identifier)
		// In TypeScript parser, only `JSXOpeningElement` is added to variable.
		// `<foo></foo>` -> `<bar></foo>` will cause parse error.
		&& identifier.type !== 'JSXIdentifier');

/**
Check whether an identifier is a default import, namespace import, or static `require()` binding name.
*/
const isDefaultOrNamespaceImportName = identifier => {
	if (
		identifier.parent.type === 'ImportDefaultSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportNamespaceSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportSpecifier'
		&& identifier.parent.local === identifier
		&& identifier.parent.imported.type === 'Identifier'
		&& identifier.parent.imported.name === 'default'
	) {
		return true;
	}

	return Boolean(identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
		&& isStaticRequire(identifier.parent.init));
};

/**
Check whether an ESLint scope variable is the synthetic variable created for a class name.
*/
export const isClassVariable = variable => {
	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	return definition.type === 'ClassName';
};

/**
Check whether a property name node is a property definition or property write that should be reported as a property.
*/
export const shouldReportIdentifierAsProperty = identifier => {
	if (
		identifier.parent.type === 'MemberExpression'
		&& identifier.parent.property === identifier
		&& !identifier.parent.computed
		&& (
			(
				identifier.parent.parent.type === 'AssignmentExpression'
				&& identifier.parent.parent.left === identifier.parent
			)
			|| (
				identifier.parent.parent.type === 'UpdateExpression'
				&& identifier.parent.parent.argument === identifier.parent
			)
		)
	) {
		return true;
	}

	if (
		identifier.parent.type === 'Property'
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed
		&& !identifier.parent.shorthand // Shorthand properties are reported and fixed as variables.
		&& identifier.parent.parent.type === 'ObjectExpression'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ExportSpecifier'
		&& identifier.parent.exported === identifier
		&& identifier.parent.local !== identifier // Same as shorthand properties above.
	) {
		return true;
	}

	return propertyNameParentTypes.has(identifier.parent.type)
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed;
};

/**
Check whether an import or static `require()` definition points at an internal module.
*/
const isInternalImport = definition => {
	let source = '';

	if (definition.type === 'Variable') {
		source = definition.node.init.arguments[0].value;
	} else if (definition.type === 'ImportBinding') {
		source = definition.parent.source.value;
	}

	return (
		!source.includes('node_modules')
		&& (source.startsWith('.') || source.startsWith('/'))
	);
};

/**
Check whether rule options allow reporting a default import, namespace import, or static `require()` binding.
*/
export const shouldCheckDefaultOrNamespaceImportName = (definition, options) => {
	if (!isDefaultOrNamespaceImportName(definition.name)) {
		return true;
	}

	if (!options.checkDefaultAndNamespaceImports) {
		return false;
	}

	return options.checkDefaultAndNamespaceImports !== 'internal' || isInternalImport(definition);
};

/**
Check whether rule options allow reporting a shorthand import binding.
*/
export const shouldCheckShorthandImportName = (definition, options, context) => {
	if (!isShorthandImportLocal(definition.name, context)) {
		return true;
	}

	if (!options.checkShorthandImports) {
		return false;
	}

	return options.checkShorthandImports !== 'internal' || isInternalImport(definition);
};
