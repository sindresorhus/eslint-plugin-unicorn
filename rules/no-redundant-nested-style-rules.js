import {ident} from '@eslint/css-tree';
import {getComments} from './utils/index.js';

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
const trimCssWhitespace = string => string.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu, '');

const getSingleSelector = rule => rule.prelude.type === 'SelectorList' && rule.prelude.children.length === 1
	? rule.prelude.children.at(0)
	: undefined;

const isNestingSelectorOnly = node => {
	const selector = getSingleSelector(node);
	return selector !== undefined
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
	const selector = getSingleSelector(rule);
	return selector !== undefined
		&& selector.children.every(node =>
			node.type !== 'PseudoElementSelector'
			&& !(node.type === 'PseudoClassSelector' && legacyPseudoElements.has(normalizeCssIdentifier(node.name))));
};

const getLineBreak = string => string.match(/\r\n|[\n\f\r]/u)?.[0] ?? '\n';

const stripCssIndent = string => {
	const lineParts = string.split(/(\r\n|[\n\f\r])/u);
	let minimumIndent = Infinity;

	for (let index = 0; index < lineParts.length; index += 2) {
		const line = lineParts[index];
		if (/[^\t ]/u.test(line)) {
			minimumIndent = Math.min(minimumIndent, line.match(/^[\t ]*/u)[0].length);
		}
	}

	if (minimumIndent === 0 || minimumIndent === Infinity) {
		return string;
	}

	for (let index = 0; index < lineParts.length; index += 2) {
		const line = lineParts[index];
		if (line.match(/^[\t ]*/u)[0].length >= minimumIndent) {
			lineParts[index] = line.slice(minimumIndent);
		}
	}

	return lineParts.join('');
};

const formatPart = (part, indentation) => {
	const lineBreak = getLineBreak(part);
	const lines = part.split(lineBreak);
	const formatted = lines.length > 1 && trimCssWhitespace(lines[0]) !== ''
		? [
			trimCssWhitespace(lines[0]),
			trimCssWhitespace(stripCssIndent(lines.slice(1).join(lineBreak))),
		].filter(Boolean).join(lineBreak)
		: trimCssWhitespace(stripCssIndent(part));

	return formatted.replaceAll(/(^|\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentation);
};

const getMultilineUnsafeRanges = context => {
	const {sourceCode} = context;
	const nodes = [...getComments(context)];
	for (const {target, phase} of sourceCode.traverse()) {
		if (phase === 1 && target.type === 'Raw') {
			nodes.push(target);
		}
	}

	return nodes
		.filter(node => {
			const {start, end} = sourceCode.getLoc(node);
			return start.line !== end.line;
		})
		.map(node => sourceCode.getRange(node));
};

const hasAtRuleTerminator = (node, sourceCode) => sourceCode.getText(node).endsWith(';')
	&& (node.prelude === null || sourceCode.getRange(node.prelude)[1] < sourceCode.getRange(node)[1]);

const isFixUnsafe = (node, sourceCode, multilineUnsafeRanges) => {
	const lastChild = node.block.children.at(-1);
	const hasAmbiguousEnd = lastChild?.type === 'Raw'
		|| (
			lastChild?.type === 'Atrule'
			&& lastChild.block === null
			&& !hasAtRuleTerminator(lastChild, sourceCode)
		);
	if (
		hasAmbiguousEnd
		&& sourceCode.getParent(node).children.at(-1) !== node
	) {
		return true;
	}

	if (multilineUnsafeRanges === undefined) {
		return false;
	}

	if (/\\[\n\f\r]/u.test(sourceCode.getText(node))) {
		return true;
	}

	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	return multilineUnsafeRanges.some(([start, end]) => start >= nodeStart && end <= nodeEnd);
};

const getDeclarationSeparatorIndex = content => {
	const trailingWhitespace = content.match(/[\t\n\f\r ]*$/u)[0];
	let separatorIndex = content.length - trailingWhitespace.length;
	if (trailingWhitespace === '') {
		return separatorIndex;
	}

	let backslashCount = 0;
	for (let index = separatorIndex - 1; content[index] === '\\'; index--) {
		backslashCount++;
	}

	if (backslashCount % 2 === 1) {
		separatorIndex++;
	}

	return separatorIndex;
};

const addDeclarationSeparator = (node, content, sourceCode) => {
	const parentBlock = sourceCode.getParent(node);
	const lastChild = node.block.children.at(-1);
	if (
		lastChild?.type !== 'Declaration'
		|| parentBlock.children.at(-1) === node
	) {
		return content;
	}

	const [, declarationEnd] = sourceCode.getRange(lastChild);
	const [, blockEnd] = sourceCode.getRange(node.block);
	if (trimCssWhitespace(sourceCode.text.slice(declarationEnd, blockEnd - 1)).startsWith(';')) {
		return content;
	}

	const separatorIndex = getDeclarationSeparatorIndex(content);
	return `${content.slice(0, separatorIndex)};${content.slice(separatorIndex)}`;
};

const getReplacement = (node, sourceCode) => {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	const [, selectorEnd] = sourceCode.getRange(node.prelude);
	const [blockStart, blockEnd] = sourceCode.getRange(node.block);
	const betweenSelectorAndBlock = sourceCode.text.slice(selectorEnd, blockStart);
	const content = addDeclarationSeparator(node, sourceCode.text.slice(blockStart + 1, blockEnd - 1), sourceCode);
	const parts = [betweenSelectorAndBlock, content].filter(part => trimCssWhitespace(part) !== '');
	const {start, end} = sourceCode.getLoc(node);
	const lineStart = nodeStart - (start.column - 1);
	const indentation = sourceCode.text.slice(lineStart, nodeStart);

	if (start.line === end.line || /[^\t\n\f\r ]/u.test(indentation)) {
		const removeLeadingSpace = parts.length === 0
			&& /[\t ]/u.test(sourceCode.text[nodeStart - 1])
			&& /[\t ]/u.test(sourceCode.text[nodeEnd]);

		return {
			fixRange: [removeLeadingSpace ? nodeStart - 1 : nodeStart, nodeEnd],
			text: parts.map(part => trimCssWhitespace(part)).join(' '),
		};
	}

	return {
		fixRange: [lineStart, nodeEnd],
		text: parts
			.map(part => formatPart(part, indentation))
			.join(getLineBreak(sourceCode.text.slice(nodeStart, nodeEnd))),
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
	let multilineUnsafeRanges;

	context.on('Rule', node => {
		if (!isNestingSelectorOnly(node)) {
			return;
		}

		const parentStyleRule = getParentStyleRule(node, sourceCode);
		if (!parentStyleRule || !canFlattenInto(parentStyleRule)) {
			return;
		}

		const {start, end} = sourceCode.getLoc(node);
		const isMultiline = start.line !== end.line;
		if (isMultiline) {
			multilineUnsafeRanges ??= getMultilineUnsafeRanges(context);
		}

		return {
			node: node.prelude,
			messageId: MESSAGE_ID,
			fix: isFixUnsafe(node, sourceCode, isMultiline ? multilineUnsafeRanges : undefined) ? undefined : getFix(node, sourceCode),
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
