import {ident} from '@eslint/css-tree';
import stripIndent from 'strip-indent';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-redundant-nested-style-rules';
const messages = {
	[MESSAGE_ID]: 'Remove the redundant nested `&` style rule.',
};

const legacyPseudoElements = new Set([
	'after',
	'before',
	'first-letter',
	'first-line',
]);

const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();

const isNestingSelectorOnly = node => {
	const [selector] = node.prelude.children;
	return node.prelude.children.length === 1
		&& selector.children.length === 1
		&& selector.children.at(0).type === 'NestingSelector';
};

const getParentStyleRule = (node, sourceCode) => {
	let parent = sourceCode.getParent(node);

	while (parent) {
		if (parent.type === 'Atrule' && normalizeCssIdentifier(parent.name) === 'scope') {
			return;
		}

		if (parent.type === 'Rule') {
			const block = sourceCode.getParent(parent);
			const owner = sourceCode.getParent(block);
			if (owner?.type === 'Atrule' && /(?:^|-)keyframes$/u.test(normalizeCssIdentifier(owner.name))) {
				return;
			}

			return parent;
		}

		parent = sourceCode.getParent(parent);
	}
};

const canFlattenInto = rule => {
	const [selector] = rule.prelude.children;
	return rule.prelude.children.length === 1
		&& selector.children.every(node =>
			node.type !== 'PseudoElementSelector'
			&& !(node.type === 'PseudoClassSelector' && legacyPseudoElements.has(normalizeCssIdentifier(node.name))));
};

const indent = (string, indentation) => string
	.split('\n')
	.map(line => indentation + line)
	.join('\n');

const addDeclarationSeparator = (node, content, sourceCode) => {
	const parentBlock = sourceCode.getParent(node);
	if (
		node.block.children.at(-1)?.type !== 'Declaration'
		|| parentBlock.children.at(-1) === node
		|| content.trimEnd().endsWith(';')
	) {
		return content;
	}

	return content.replace(/(?=\s*$)/u, ';');
};

const getReplacement = (node, sourceCode) => {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	const [, selectorEnd] = sourceCode.getRange(node.prelude);
	const [blockStart, blockEnd] = sourceCode.getRange(node.block);
	const betweenSelectorAndBlock = sourceCode.text.slice(selectorEnd, blockStart);
	const content = addDeclarationSeparator(node, sourceCode.text.slice(blockStart + 1, blockEnd - 1), sourceCode);
	const parts = [betweenSelectorAndBlock, content].filter(part => part.trim() !== '');
	const {start, end} = sourceCode.getLoc(node);
	const lineStart = nodeStart - (start.column - 1);
	const indentation = sourceCode.text.slice(lineStart, nodeStart);

	if (start.line === end.line || /\S/u.test(indentation)) {
		const removeLeadingSpace = parts.length === 0
			&& /[\t ]/u.test(sourceCode.text[nodeStart - 1])
			&& /[\t ]/u.test(sourceCode.text[nodeEnd]);

		return {
			fixRange: [removeLeadingSpace ? nodeStart - 1 : nodeStart, nodeEnd],
			text: parts.map(part => part.trim()).join(' '),
		};
	}

	return {
		fixRange: [lineStart, nodeEnd],
		text: parts
			.map(part => indent(stripIndent(part).trim(), indentation))
			.join('\n'),
	};
};

const getFix = (node, sourceCode) => fixer => {
	const {fixRange, text} = getReplacement(node, sourceCode);
	return fixer.replaceTextRange(fixRange, text);
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Rule', node => {
		if (!isNestingSelectorOnly(node)) {
			return;
		}

		const parentStyleRule = getParentStyleRule(node, sourceCode);
		if (!parentStyleRule || !canFlattenInto(parentStyleRule)) {
			return;
		}

		return {
			node: node.prelude,
			messageId: MESSAGE_ID,
			fix: getFix(node, sourceCode),
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow nested style rules that do not modify the parent selector.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
