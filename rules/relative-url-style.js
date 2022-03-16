'use strict';
const {getStaticValue} = require('eslint-utils');
const {newExpressionSelector} = require('./selectors/index.js');
const {replaceStringLiteral} = require('./fix/index.js');

const MESSAGE_ID_NEVER = 'never';
const MESSAGE_ID_ALWAYS = 'always';
const MESSAGE_ID_REMOVE = 'remove';
const messages = {
	[MESSAGE_ID_NEVER]: 'Remove the `./` prefix from the relative URL.',
	[MESSAGE_ID_ALWAYS]: 'Add a `./` prefix to the relative URL.',
	[MESSAGE_ID_REMOVE]: 'Remove leading `./`.',
};

const templateLiteralSelector = [
	newExpressionSelector({name: 'URL', argumentsLength: 2}),
	' > TemplateLiteral.arguments:first-child',
].join('');
const literalSelector = [
	newExpressionSelector({name: 'URL', argumentsLength: 2}),
	' > Literal.arguments:first-child',
].join('');

const DOT_SLASH = './';
const TEST_URL_BASES = [
	'https://example.com/a/b/',
	'https://example.com/a/b.html',
];
const isSameUrl = (url1, url2, base) => {
	try {
		return new URL(url1, base).href === new URL(url2, base).href;
	} catch {}

	return false;
};

const isSafeToAddDotSlashWithBase = (url, base) => isSameUrl(url, DOT_SLASH + url, base);
const isSafeToAddDotSlash = url => TEST_URL_BASES.every(base => isSafeToAddDotSlashWithBase(url, base));
const isSafeToRemoveDotSlashWithBase = (url, base) => isSameUrl(url, url.slice(DOT_SLASH.length), base);
const isSafeToRemoveDotSlash = url => TEST_URL_BASES.every(base => isSafeToRemoveDotSlashWithBase(url, base));

function canAddDotSlash(node, context) {
	const url = node.value;
	if (url.startsWith(DOT_SLASH) || url.startsWith('.') || url.startsWith('/')) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValue(baseNode, context.getScope());

	if (
		staticValueResult
		&& typeof staticValueResult.value === 'string'
		&& isSafeToAddDotSlashWithBase(url, staticValueResult.value)
	) {
		return true;
	}

	return isSafeToAddDotSlash(url);
}

function canRemoveDotSlash(node, context) {
	const rawValue = node.raw.slice(1, -1);
	if (!rawValue.startsWith(DOT_SLASH)) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValue(baseNode, context.getScope());

	if (
		staticValueResult
		&& typeof staticValueResult.value === 'string'
		&& isSafeToRemoveDotSlashWithBase(node.value, staticValueResult.value)
	) {
		return true;
	}

	return isSafeToRemoveDotSlash(node.value);
}

function addDotSlash(node, context) {
	if (!canAddDotSlash(node, context)) {
		return;
	}

	return fixer => replaceStringLiteral(fixer, node, DOT_SLASH, 0, 0);
}

function removeDotSlash(node, context) {
	if (!canRemoveDotSlash(node, context)) {
		return;
	}

	return fixer => replaceStringLiteral(fixer, node, '', 0, 2);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const style = context.options[0] || 'never';
	const fixFunction = style === 'never' ? removeDotSlash : addDotSlash;

	const listeners = {};

	// TemplateLiteral are not always safe to remove `./`, but if it's starts with `./` we'll report
	if (style === 'never') {
		listeners[templateLiteralSelector] = function (node) {
			const firstPart = node.quasis[0];
			if (!firstPart.value.raw.startsWith(DOT_SLASH)) {
				return;
			}

			return {
				node,
				messageId: style,
				suggest: [
					{
						messageId: MESSAGE_ID_REMOVE,
						fix(fixer) {
							const start = firstPart.range[0] + 1;
							return fixer.removeRange([start, start + 2]);
						},
					},
				],
			};
		};
	}

	listeners[literalSelector] = function (node) {
		if (node.type !== 'Literal' || typeof node.value !== 'string') {
			return;
		}

		const fix = fixFunction(node, context);

		if (!fix) {
			return;
		}

		return {
			node,
			messageId: style,
			fix,
		};
	};

	return listeners;
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
			description: 'Enforce consistent relative URL style.',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		messages,
	},
};
