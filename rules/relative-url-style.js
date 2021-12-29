'use strict';
const {newExpressionSelector} = require('./selectors/index.js');
const {replaceStringLiteral} = require('./fix/index.js');

const MESSAGE_ID_NEVER = 'never';
const MESSAGE_ID_ALWAYS = 'always';
const messages = {
	[MESSAGE_ID_NEVER]: 'Remove `./` prefix from the relative url.',
	[MESSAGE_ID_ALWAYS]: 'Use `./` prefix in the relative url.',
};

const selector = [
	newExpressionSelector({name: 'URL', argumentsLength: 2}),
	' > :first-child.arguments',
].join('');

const DOT_SLASH = './';
const TEST_URL_BASE = 'https://www.example.com/';
const isSafeToAddDotSlash = url => new URL(url, TEST_URL_BASE).href === new URL(`./${url}`, TEST_URL_BASE).href;

function removeDotSlash(node) {
	if (
		node.type === 'TemplateLiteral'
		&& node.quasis[0].value.raw.startsWith(DOT_SLASH)
	) {
		const firstPart = node.quasis[0];
		return (fixer) => {
			const start = firstPart.range[0] + 1;
			return fixer.removeRange([start, start + 2]);
		};
	}

	if (node.type !== 'Literal' || typeof node.value !== 'string') {
		return;
	}

	const url = node.value;

	if (!url.startsWith(DOT_SLASH)) {
		return;
	}

	return fixer => replaceStringLiteral(fixer, node, '', 0, 2)
}

function addDotSlash(node) {
	if (node.type !== 'Literal' || typeof node.value !== 'string') {
		return;
	}

	const url = node.value;

	if (url.startsWith(DOT_SLASH)) {
		return;
	}

	if (
		url.startsWith('.')
		|| url.startsWith('/')
		|| !isSafeToAddDotSlash(url)
	) {
		return;
	}

	return fixer => replaceStringLiteral(fixer, node, DOT_SLASH, 0, 0)
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const style = context.options[0] || 'never';
	return {[selector](node) {
		const fix = (style === 'never' ? removeDotSlash : addDotSlash)(node)

		if (!fix) {
			return;
		}

		return {
			node,
			messageId: style,
			fix,
		}
	}};
};

const schema = [
	{
		enum: ['never', 'always'],
		default: 'never',
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent relative url style.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
