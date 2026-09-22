import {tokenize, tokenTypes} from '@eslint/css-tree';
import {replaceTemplateElement} from './fix/index.js';
import {isRegexLiteral, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {getTemplateElementRaw} from './utils/index.js';

const MESSAGE_ID_UPPERCASE = 'escape-uppercase';
const MESSAGE_ID_LOWERCASE = 'escape-lowercase';
const messages = {
	[MESSAGE_ID_UPPERCASE]: 'Use uppercase characters for the value of the escape sequence.',
	[MESSAGE_ID_LOWERCASE]: 'Use lowercase characters for the value of the escape sequence.',
};

const escapeCase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+})/g;
const escapePatternCase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|u{[\dA-Fa-f]+}|c[A-Za-z])/g;
const fixedWidthEscapeCase = /(?<=(?:^|[^\\])(?:\\\\)*\\)(?<data>x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|U[\dA-Fa-f]{8})/g;
const cssEscapeCase = /(?<!\\)(?:\\\\)*\\[\da-f]{1,6}/gi;
const getProblem = ({node, original, regex = escapeCase, lowercase, fix}) => {
	const fixed = original.replace(regex, data => data[0] + data.slice(1)[lowercase ? 'toLowerCase' : 'toUpperCase']());

	if (fixed !== original) {
		return {
			node,
			messageId: lowercase ? MESSAGE_ID_LOWERCASE : MESSAGE_ID_UPPERCASE,
			fix: fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed),
		};
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const isLowercase = context.options[0] === 'lowercase';

	context.on('StyleSheet', node => {
		const {sourceCode} = context;
		const problems = [];
		tokenize(sourceCode.text, (type, start, end) => {
			if (type === tokenTypes.Comment) {
				return;
			}

			const problem = getProblem({
				node,
				original: sourceCode.text.slice(start, end),
				regex: cssEscapeCase,
				lowercase: isLowercase,
				fix: (fixer, fixed) => fixer.replaceTextRange([start, end], fixed),
			});
			if (problem) {
				problems.push({
					...problem,
					loc: {start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end)},
				});
			}
		});
		return problems;
	});

	context.on('String', node => {
		if (context.sourceCode.ast.type === 'StyleSheet') {
			return;
		}

		return getProblem({
			node,
			original: context.sourceCode.getText(node),
			lowercase: isLowercase,
		});
	});

	context.on(['TOMLValue', 'TOMLQuoted'], node => {
		if (node.kind !== 'string' || node.style !== 'basic') {
			return;
		}

		return getProblem({
			node,
			original: context.sourceCode.getText(node),
			regex: fixedWidthEscapeCase,
			lowercase: isLowercase,
		});
	});

	context.on('YAMLScalar', node => {
		if (node.style !== 'double-quoted') {
			return;
		}

		return getProblem({
			node,
			original: context.sourceCode.getText(node),
			regex: fixedWidthEscapeCase,
			lowercase: isLowercase,
		});
	});

	context.on('Literal', node => {
		if (isStringLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
				lowercase: isLowercase,
			});
		}
	});

	context.on('Literal', node => {
		if (isRegexLiteral(node)) {
			return getProblem({
				node,
				original: node.raw,
				regex: escapePatternCase,
				lowercase: isLowercase,
			});
		}
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return getProblem({
			node,
			original: getTemplateElementRaw(node, context),
			lowercase: isLowercase,
			fix: (fixer, fixed) => replaceTemplateElement(node, fixed, context, fixer),
		});
	});
};

const schema = [
	{
		enum: ['uppercase', 'lowercase'],
		description: 'The case style for escape sequences.',
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require escape sequences to use uppercase or lowercase values.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: ['uppercase'],
		messages,
		languages: [
			'js/js',
			'yml/yaml',
			'json/json',
			'json/jsonc',
			'json/json5',
			'css/css',
			'toml/toml',
		],
	},
};

export default config;
