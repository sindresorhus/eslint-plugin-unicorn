import {isStringLiteral, isDirective, isMemberExpression} from './ast/index.js';
import {
	addParenthesizesToReturnOrThrowExpression,
	fixSpaceAroundKeyword,
	removeParentheses,
	replaceTemplateElement,
} from './fix/index.js';
import isJestInlineSnapshot from './shared/is-jest-inline-snapshot.js';
import {isOnSameLine, isParenthesized} from './utils/index.js';
import needsSemicolon from './utils/needs-semicolon.js';

const MESSAGE_ID = 'prefer-string-raw';
const MESSAGE_ID_UNNECESSARY_STRING_RAW = 'unnecessary-string-raw';
const messages = {
	[MESSAGE_ID]: '`String.raw` should be used to avoid escaping `\\`.',
	[MESSAGE_ID_UNNECESSARY_STRING_RAW]: 'Using `String.raw` is unnecessary as the string does not contain any `\\`.',
};

const BACKSLASH = '\\';

function unescapeBackslash(text, quote = '') {
	return text.replaceAll(new RegExp(String.raw`\\(?<escapedCharacter>[\\${quote}])`, 'g'), '$<escapedCharacter>');
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
		// (TypeScript) Import type
		|| (type === 'TSImportType' && parent.source === node)
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (!isStringLiteral(node) || isStringRawRestricted(node) || isJestInlineSnapshot(node)) {
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

		const unescaped = unescapeBackslash(raw.slice(1, -1), raw.charAt(0));
		if (unescaped !== node.value) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield fixSpaceAroundKeyword(fixer, node, context);
				yield fixer.replaceText(node, `String.raw\`${unescaped}\``);
			},
		};
	});

	context.on('TemplateLiteral', node => {
		if (
			(node.parent.type === 'TaggedTemplateExpression' && node.parent.quasi === node)
			|| node.quasis.every(({value: {cooked, raw}}) => cooked === raw)
			|| node.quasis.some(({value: {cooked, raw}}) => cooked.at(-1) === BACKSLASH || unescapeBackslash(raw) !== cooked)
			|| isJestInlineSnapshot(node)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield fixSpaceAroundKeyword(fixer, node, context);
				yield fixer.insertTextBefore(node, 'String.raw');

				for (const quasis of node.quasis) {
					const {cooked, raw} = quasis.value;
					if (cooked === raw) {
						continue;
					}

					yield replaceTemplateElement(quasis, cooked, context, fixer);
				}
			},
		};
	});

	context.on('TaggedTemplateExpression', node => {
		const {quasi, tag} = node;
		const {sourceCode} = context;

		if (!isMemberExpression(tag, {object: 'String', property: 'raw', optional: false})) {
			return;
		}

		const hasBackslash = quasi.quasis.some(
			quasi => quasi.value.raw.includes(BACKSLASH),
		);

		if (hasBackslash) {
			return;
		}

		const rawQuasi = sourceCode.getText(quasi);
		const suggestion = quasi.expressions.length > 0 || /\r?\n/.test(rawQuasi)
			? rawQuasi
			: `'${rawQuasi.slice(1, -1).replaceAll('\'', String.raw`\'`)}'`;

		return {
			node: tag,
			messageId: MESSAGE_ID_UNNECESSARY_STRING_RAW,
			* fix(fixer) {
				const tokenBefore = sourceCode.getTokenBefore(node);
				if (needsSemicolon(tokenBefore, context, suggestion)) {
					yield fixer.insertTextBefore(node, ';');
				}

				const {parent} = node;
				if (
					(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
					&& !isOnSameLine(tokenBefore, node.quasi, context)
					&& !isParenthesized(node, context)
				) {
					yield addParenthesizesToReturnOrThrowExpression(fixer, parent, context);
				}

				yield fixer.replaceText(node.quasi, suggestion);
				yield removeParentheses(node.tag, fixer, context);
				yield fixer.remove(node.tag);
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
