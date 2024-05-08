'use strict';
const {isStringLiteral, isDirective} = require('./ast/index.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');
const {} = require('./utils/index.js');

const MESSAGE_ID = 'prefer-string-raw';
const messages = {
	[MESSAGE_ID]: 'Prefer `String.raw` tag to avoid escaping `\\`.',
};

const BACKSLASH = '\\';

function unescapeBackslash(raw) {
	const quote = raw.charAt(0);

	raw = raw.slice(1, -1);

	let result = '';
	for (let position = 0; position < raw.length; position++) {
		const character = raw[position];
		if (character === BACKSLASH) {
			const nextCharacter = raw[position + 1];
			switch (nextCharacter) {
				case BACKSLASH: {
					result += nextCharacter;
					position++;
					continue;
				}

				case '\n':
				case quote: {
					continue;
				}
				// No default
			}
		}

		result += character;
	}

	return result;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (
			!isStringLiteral(node)
			|| isDirective(node.parent)
			|| (node.parent.type === 'ImportDeclaration' || node.parent.type === 'ExportNamedDeclaration') && node.parent.source === node
			|| (node.parent.type === 'Property' && !node.parent.computed && node.parent.key === node)
		) {
			return;
		}

		const {raw} = node;
		if (
			!raw.includes(BACKSLASH + BACKSLASH)
			|| raw.includes('`')
			|| node.loc.start.line !== node.loc.end.line
		) {
			return;
		}

		const unescaped = unescapeBackslash(raw);
		if (unescaped.endsWith(BACKSLASH) || unescaped !== node.value) {
			return;
		}

		return {
			node,
			message: MESSAGE_ID,
			* fix(fixer) {
				yield fixer.replaceText(node, `String.raw\`${unescaped}\``);
				yield * fixSpaceAroundKeyword(fixer, node, context.sourceCode);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String.raw` tag to avoid escaping `\\`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};
