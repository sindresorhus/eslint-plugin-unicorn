import {isDirective} from '../ast/index.js';

/**
Check whether the syntax requires the given string literal to stay a string literal, so it cannot be replaced with another expression (for example, a template literal or a call).

This is the case for directives, non-computed keys, module sources and specifiers, import attributes, JSX attribute values, and TypeScript enum members, module declarations, external module references, literal types, and import types.

@param {import('estree').Literal | import('estree').TemplateLiteral} node - The string literal or template literal.
@returns {boolean}
*/
// eslint-disable-next-line complexity
export default function isStringLiteralRequired(node) {
	const {parent} = node;
	const {type} = parent;
	return (
		// Directive
		isDirective(parent)
		// Property, method, or accessor key (only non-computed)
		|| (
			[
				'Property',
				'PropertyDefinition',
				'MethodDefinition',
				'AccessorProperty',
			].includes(type)
			&& !parent.computed && parent.key === node
		)
		// Property, method, or accessor key (always)
		|| (
			[
				'TSAbstractPropertyDefinition',
				'TSAbstractMethodDefinition',
				'TSAbstractAccessorProperty',
				'TSPropertySignature',
				'TSMethodSignature',
			].includes(type)
			&& parent.key === node
		)
		// Module source
		|| (
			[
				'ImportDeclaration',
				'ExportNamedDeclaration',
				'ExportAllDeclaration',
			].includes(type)
			&& parent.source === node
		)
		// Import attribute key and value
		|| (type === 'ImportAttribute' && (parent.key === node || parent.value === node))
		// Module specifier
		|| (type === 'ImportSpecifier' && parent.imported === node)
		|| (type === 'ExportSpecifier' && (parent.local === node || parent.exported === node))
		|| (type === 'ExportAllDeclaration' && parent.exported === node)
		// JSX attribute value
		|| (type === 'JSXAttribute' && parent.value === node)
		// (TypeScript) Enum member key and value
		|| (type === 'TSEnumMember' && (parent.initializer === node || parent.id === node))
		// (TypeScript) Module declaration
		|| (type === 'TSModuleDeclaration' && parent.id === node)
		// (TypeScript) CommonJS module reference
		|| (type === 'TSExternalModuleReference' && parent.expression === node)
		// (TypeScript) Literal type
		|| (type === 'TSLiteralType' && parent.literal === node)
		// (TypeScript) Import type
		|| (type === 'TSImportType' && parent.source === node)
	);
}
