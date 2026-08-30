import {ident} from '@eslint/css-tree';
import indentString from 'indent-string';
import stripIndent from 'strip-indent';
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

const getLineBreak = string => string.includes('\r\n') ? '\r\n' : '\n';

const formatPart = (part, indentation) => {
	const lineBreak = getLineBreak(part);
	const lines = part.split(lineBreak);
	const formatted = lines.length > 1 && lines[0].trim() !== ''
		? [
			lines[0].trim(),
			stripIndent(lines.slice(1).join(lineBreak)).trim(),
		].filter(Boolean).join(lineBreak)
		: stripIndent(part).trim();

	return indentString(formatted, 1, {indent: indentation});
};

const getMultilineRawRanges = sourceCode => {
	const ranges = [];
	for (const {target, phase} of sourceCode.traverse()) {
		if (phase !== 1 || target.type !== 'Raw') {
			continue;
		}

		const {start, end} = sourceCode.getLoc(target);
		if (start.line !== end.line) {
			ranges.push(sourceCode.getRange(target));
		}
	}

	return ranges;
};

const hasUnsafeMultilineSyntax = (node, sourceCode, comments, multilineRawRanges) => {
	if (/\\(?:\r\n|[\n\f\r])/u.test(sourceCode.getText(node))) {
		return true;
	}

	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	if (multilineRawRanges.some(([start, end]) => start >= nodeStart && end <= nodeEnd)) {
		return true;
	}

	return comments.some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		const {start, end} = sourceCode.getLoc(comment);
		return commentStart >= nodeStart
			&& commentEnd <= nodeEnd
			&& start.line !== end.line;
	});
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
	if (sourceCode.text.slice(declarationEnd, blockEnd - 1).trimStart().startsWith(';')) {
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
	const comments = getComments(context);
	const multilineRawRanges = getMultilineRawRanges(sourceCode);

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
			fix: hasUnsafeMultilineSyntax(node, sourceCode, comments, multilineRawRanges) ? undefined : getFix(node, sourceCode),
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
