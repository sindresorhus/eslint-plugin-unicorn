import {isStringLiteral, isDirective} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'prefer-string-raw';
const messages = {
	[MESSAGE_ID]: '`String.raw` should be used to avoid escaping `\\`.',
};

const BACKSLASH = '\\';

function unescapeBackslash(value, quote = '') {
	return value
		.replaceAll(new RegExp(String.raw`\\([\\${quote}])`, 'g'), '$1');
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

		const unescaped = unescapeBackslash(raw.slice(1, -1), raw.charAt(0));
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

	context.on('TemplateLiteral', node => {
		if (node.parent.type === 'TaggedTemplateExpression') {
			return;
		}

		let suggestedValue = '';
		let hasBackslash = false;

		for (let index = 0; index < node.quasis.length; index++) {
			const quasi = node.quasis[index];
			const {raw, cooked} = quasi.value;

			if (cooked.at(-1) === BACKSLASH) {
				return;
			}

			const unescaped = unescapeBackslash(raw);
			if (unescaped !== cooked) {
				return;
			}

			if (cooked.includes(BACKSLASH)) {
				hasBackslash = true;
			}

			if (index > 0) {
				suggestedValue += '${' + context.sourceCode.getText(node.expressions[index - 1]) + '}';
			}

			suggestedValue += unescaped;
		}

		if (!hasBackslash) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				yield fixer.replaceText(node, `String.raw\`${suggestedValue}\``);
				yield * fixSpaceAroundKeyword(fixer, node, context.sourceCode);
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
