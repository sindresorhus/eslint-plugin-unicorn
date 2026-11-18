import {characterEntitiesHtml4} from 'character-entities-html4';
import {decodeHTML, decodeHTMLStrict, encodeHTML} from 'entities';
import {parse as parseHtml} from 'parse5';
import {isStringLiteral} from './ast/index.js';
import {toLocation} from './utils/index.js';

const MESSAGE_ID = 'prefer-named-character-references';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{reference}}`.',
};

const namesByCodePoint = new Map(Object.entries(characterEntitiesHtml4).map(([name, character]) => [character.codePointAt(0), name]));

// Espree reads at most 10 characters after `&`, including `#`, the optional `x`, and `;`.
const jsxReferencePattern = /&#(?:\d{1,8}|x[\dA-Fa-f]{1,7});/gv;
const htmlReferencePattern = /&#(?:\d+|x[\da-f]+);/giv;
// Consume escaped backslashes and ampersands before looking for Markdown references.
const markdownReferencePattern = /\\[&\\]|&#(?:\d{1,7}|x[\da-f]{1,6});/giv;
// HTML node locations and ESLint's offset lookup can count these line breaks differently.
const unsupportedHtmlLineBreakPattern = /\r(?!\n)|[\u{2028}\u{2029}]/v;

function getCodePoint(reference) {
	const digits = reference.slice(2, -1);
	return /^x/iv.test(digits) ? Number.parseInt(digits.slice(1), 16) : Number(digits);
}

function getNamedHtmlReference(character) {
	const encoded = encodeHTML(character);
	if (/^&[\dA-Za-z]+;$/v.test(encoded)) {
		return encoded;
	}
}

function getJsxReplacement(reference) {
	const name = namesByCodePoint.get(getCodePoint(reference));
	if (name !== undefined) {
		return `&${name};`;
	}
}

const getHtmlReplacement = reference => getNamedHtmlReference(decodeHTMLStrict(reference));

function getMarkdownReplacement(reference) {
	const codePoint = getCodePoint(reference);
	if (codePoint <= 0x10_FF_FF) {
		return getNamedHtmlReference(String.fromCodePoint(codePoint));
	}
}

function * getHtmlRanges(text) {
	const pending = [parseHtml(text, {sourceCodeLocationInfo: true})];
	const seenAttributeOffsets = new Set();
	while (pending.length > 0) {
		const node = pending.pop();
		const location = node.sourceCodeLocation;
		if (node.nodeName === '#text' && location) {
			const {startOffset, endOffset} = location;
			const raw = text.slice(startOffset, endOffset);
			// Raw text, CDATA, and merged text with intervening markup can differ from decoded source.
			// The parser can also discard one initial newline in elements such as `textarea`.
			const decoded = decodeHTML(raw.replaceAll(/\r\n?/g, '\n'));
			if (decoded === node.value || decoded === `\n${node.value}`) {
				yield [startOffset, endOffset];
			}
		}

		for (const {startOffset, endOffset} of Object.values(location?.attrs ?? {})) {
			// HTML error recovery can recreate formatting elements from the same source tag.
			if (seenAttributeOffsets.has(startOffset)) {
				continue;
			}

			seenAttributeOffsets.add(startOffset);
			const prefix = /^[^=]+=/v.exec(text.slice(startOffset, endOffset))?.[0];
			if (prefix) {
				yield [startOffset + prefix.length, endOffset];
			}
		}

		for (const child of node.childNodes ?? []) {
			pending.push(child);
		}

		if (node.content) {
			pending.push(node.content);
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const hasPotentialReferenceDefinitions = sourceCode.text.includes(']:');

	function * getProblems(node, inputRange, pattern, getReplacement) {
		const [inputStart, inputEnd] = inputRange;
		for (const match of sourceCode.text.slice(inputStart, inputEnd).matchAll(pattern)) {
			const [reference] = match;
			const replacement = reference.startsWith('&') ? getReplacement(reference) : undefined;
			if (replacement === undefined) {
				continue;
			}

			const start = inputStart + match.index;
			const range = [start, start + reference.length];
			yield {
				node,
				loc: toLocation(range, context),
				messageId: MESSAGE_ID,
				data: {reference, replacement},
				fix: fixer => fixer.replaceTextRange(range, replacement),
			};
		}
	}

	const getJsxProblems = node => getProblems(node, sourceCode.getRange(node), jsxReferencePattern, getJsxReplacement);
	context.on('JSXText', getJsxProblems);
	context.on('JSXAttribute', node => {
		if (isStringLiteral(node.value)) {
			return getJsxProblems(node.value);
		}
	});

	context.on('Document', function * (node) {
		const [firstChild] = node.children;
		const {frontmatter, rawContentTags, templateEngineSyntax} = {...context.languageOptions.parserOptions, ...context.languageOptions};
		if (!firstChild || rawContentTags?.length > 0 || unsupportedHtmlLineBreakPattern.test(sourceCode.text)) {
			return;
		}

		// The HTML parser gives its first markup node an offset past any configured frontmatter.
		const start = frontmatter ? sourceCode.getRange(firstChild)[0] : 0;
		const markup = sourceCode.text.slice(start);
		const configuredDelimiters = Array.isArray(templateEngineSyntax) ? templateEngineSyntax.map(({open}) => open) : Object.keys(templateEngineSyntax ?? {});
		const templateDelimiters = ['{{', '{%', '<%', '${', ...configuredDelimiters];
		// A template expression can contain markup that the secondary HTML parser sees as real elements.
		if (!markup.includes('&#') || templateDelimiters.some(delimiter => markup.includes(delimiter))) {
			return;
		}

		for (const [rangeStart, rangeEnd] of getHtmlRanges(markup)) {
			yield * getProblems(node, [start + rangeStart, start + rangeEnd], htmlReferencePattern, getHtmlReplacement);
		}
	});

	context.on('text', node => {
		// GFM can omit source positions for synthesized autolinks and their surrounding text.
		if (!node.position) {
			return;
		}

		for (let parent = sourceCode.getParent(node); parent; parent = sourceCode.getParent(parent)) {
			if (!parent.position) {
				return;
			}

			// Autolinks keep references literal.
			if (parent.type === 'link' && !sourceCode.getText(parent).startsWith('[')) {
				return;
			}

			if (['paragraph', 'heading', 'tableCell'].includes(parent.type)) {
				// Reference labels match by raw spelling. Rewriting a label can change which definition it matches.
				if (hasPotentialReferenceDefinitions && sourceCode.getText(parent).includes('[')) {
					return;
				}

				break;
			}
		}

		return getProblems(node, sourceCode.getRange(node), markdownReferencePattern, getMarkdownReplacement);
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer named character references in JSX, HTML, and Markdown.',
			recommended: false,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
			'html/html',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
