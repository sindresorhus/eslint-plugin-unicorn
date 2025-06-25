import {isStringLiteral, isDirective} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'prefer-string-raw';
const MESSAGE_ID_UNNECESSARY_STRING_RAW = 'unnecessary-string-raw';
const messages = {
	[MESSAGE_ID]: '`String.raw` should be used to avoid escaping `\\`.',
	[MESSAGE_ID_UNNECESSARY_STRING_RAW]: 'Using `String.raw` is unnecessary as the string does not contain any `\\`.',
};

const BACKSLASH = '\\';

function unescapeBackslash(raw) {
	const quote = raw.charAt(0);

	return raw
		.slice(1, -1)
		.replaceAll(new RegExp(String.raw`\\(?<escapedCharacter>[\\${quote}])`, 'g'), '$<escapedCharacter>');
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	// eslint-disable-next-line complexity
	context.on('Literal', node => {
		if (
			!isStringLiteral(node)
			|| isDirective(node.parent)
			|| (
				(
					node.parent.type === 'ImportDeclaration'
					|| node.parent.type === 'ExportNamedDeclaration'
					|| node.parent.type === 'ExportAllDeclaration'
				) && node.parent.source === node
			)
			|| (node.parent.type === 'Property' && !node.parent.computed && node.parent.key === node)
			|| (node.parent.type === 'JSXAttribute' && node.parent.value === node)
			|| (node.parent.type === 'TSEnumMember' && (node.parent.initializer === node || node.parent.id === node))
			|| (node.parent.type === 'ImportAttribute' && (node.parent.key === node || node.parent.value === node))
		) {
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

	context.on('TaggedTemplateExpression', node => {
		const {quasi, tag} = node;

		if (tag.type !== 'MemberExpression'
			|| tag.object.type !== 'Identifier'
			|| tag.property.type !== 'Identifier'
			|| tag.object.name !== 'String'
			|| tag.property.name !== 'raw'
		) {
			return;
		}

		const hasBackslash = quasi.quasis.some(
			quasi => quasi.value.raw.includes(BACKSLASH),
		);

		if (hasBackslash) {
			return;
		}

		const rawQuasi = context.sourceCode.getText(quasi);
		const suggestion = quasi.expressions.length > 0 || /\r?\n/.test(rawQuasi)
			? rawQuasi
			: `'${rawQuasi.slice(1, -1).replaceAll('\'', String.raw`\'`)}'`;

		return {
			node,
			messageId: MESSAGE_ID_UNNECESSARY_STRING_RAW,
			* fix(fixer) {
				yield fixer.replaceText(node, suggestion);
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
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
