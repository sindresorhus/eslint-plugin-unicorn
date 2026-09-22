import {isOpeningBraceToken} from '@eslint-community/eslint-utils';
import {toLocation} from './utils/index.js';

const MESSAGE_ID = 'empty-brace-spaces';
const messages = {
	[MESSAGE_ID]: 'Do not add spaces between braces.',
};

const getProblem = (range, context) => {
	const {sourceCode} = context;
	const [start, end] = range;
	const textBetween = sourceCode.text.slice(start, end);

	if (!/^\s+$/.test(textBetween)) {
		return;
	}

	return {
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		fix: fixer => fixer.removeRange([start, end]),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on([
		'BlockStatement',
		'ClassBody',
		'StaticBlock',
		'ObjectExpression',
	], node => {
		const children = node.type === 'ObjectExpression' ? node.properties : node.body;

		if (children.length > 0) {
			return;
		}

		const {sourceCode} = context;
		const openingBrace = sourceCode.getFirstToken(node, {filter: isOpeningBraceToken});
		const closingBrace = sourceCode.getLastToken(node);
		return getProblem([sourceCode.getRange(openingBrace)[1], sourceCode.getRange(closingBrace)[0]], context);
	});

	context.on(['Object', 'Array', 'Block', 'TOMLInlineTable', 'TOMLArray', 'YAMLMapping', 'YAMLSequence'], node => {
		if (node.style === 'block') {
			return;
		}

		const children = node.members ?? node.elements ?? node.children ?? node.body ?? node.pairs ?? node.entries;
		if (children.length > 0) {
			return;
		}

		const [start, end] = context.sourceCode.getRange(node);
		return getProblem([start + 1, end - 1], context);
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Enforce no spaces between braces.',
			recommended: true,
		},
		fixable: 'whitespace',
		messages,
		languages: [
			'js/js',
			'json/json',
			'json/jsonc',
			'json/json5',
			'css/css',
			'toml/toml',
			'yml/yaml',
		],
	},
};

export default config;
