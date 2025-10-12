import {isStringLiteral, isDirective} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'prefer-string-raw';
const messages = {
	[MESSAGE_ID]: '`String.raw` should be used to avoid escaping `\\`.',
};

const BACKSLASH = '\\';

function unescapeBackslash(raw) {
	const quote = raw.charAt(0);

	return raw
		.slice(1, -1)
		.replaceAll(new RegExp(String.raw`\\(?<escapedCharacter>[\\${quote}])`, 'g'), '$<escapedCharacter>');
}

/**
Check if a string literal is restricted to replace with a `String.raw`
*/
// eslint-disable-next-line complexity
function isStringRawRestricted(node) {
	const {parent} = node;
	const {type} = parent;
	return (
		// Directive
		isDirective(parent)
		// Property, method, or accessor key (only non-computed)
		|| (
			(
				type === 'Property'
				|| type === 'PropertyDefinition'
				|| type === 'MethodDefinition'
				|| type === 'AccessorProperty'
			)
			&& !parent.computed && parent.key === node
		)
		// Property, method, or accessor key (always)
		|| (
			(
				type === 'TSAbstractPropertyDefinition'
				|| type === 'TSAbstractMethodDefinition'
				|| type === 'TSAbstractAccessorProperty'
				|| type === 'TSPropertySignature'
			)
			&& parent.key === node
		)
		// Module source
		|| (
			(
				type === 'ImportDeclaration'
				|| type === 'ExportNamedDeclaration'
				|| type === 'ExportAllDeclaration'
			) && parent.source === node
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
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (!isStringLiteral(node) || isStringRawRestricted(node)) {
			return;
		}

		const {sourceCode} = context;
		const {raw} = node;
		if (
			raw.at(-2) === BACKSLASH
			|| !raw.includes(BACKSLASH + BACKSLASH)
			|| raw.includes('`')
			|| raw.includes('${')
			|| sourceCode.getLoc(node).start.line !== sourceCode.getLoc(node).end.line
		) {
			return;
		}

		const unescaped = unescapeBackslash(raw);
		if (unescaped !== node.value) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield fixer.replaceText(node, `String.raw\`${unescaped}\``);
				yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using the `String.raw` tag to avoid escaping `\\`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
