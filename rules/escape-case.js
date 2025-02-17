import {replaceTemplateElement} from './fix/index.js';
import {isRegexLiteral, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'escape-case';
const messages = {
	[MESSAGE_ID]: 'Use uppercase characters for the value of the escape sequence.',
};

const escapeWithLowercase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+})/g;
const escapePatternWithLowercase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+}|c[a-z])/g;
const getProblem = ({node, original, regex = escapeWithLowercase, fix}) => {
	const fixed = original.replace(regex, data => data.slice(0, 1) + data.slice(1).toUpperCase());

	if (fixed !== original) {
		return {
			node,
			messageId: MESSAGE_ID,
			fix: fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed),
		};
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (isStringLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
			});
		}
	});

	context.on('Literal', node => {
		if (isRegexLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
				regex: escapePatternWithLowercase,
			});
		}
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent, ['String.raw'])) {
			return;
		}

		return getProblem({
			node,
			original: node.value.raw,
			fix: (fixer, fixed) => replaceTemplateElement(fixer, node, fixed),
		});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require escape sequences to use uppercase values.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
