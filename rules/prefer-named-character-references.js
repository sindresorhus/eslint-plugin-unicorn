import {tokenize, tokenTypes} from '@eslint/css-tree';
import {characterEntitiesHtml4} from 'character-entities-html4';
import {decodeHTML, decodeHTMLAttribute, encodeHTML} from 'entities';
import {parse as parseHtml} from 'parse5';
import {isStringLiteral} from './ast/index.js';
import {getMarkdownImageResourceOffset, isStringLiteralRequired, toLocation} from './utils/index.js';
import {getNumericCharacterReferenceCodePoint, jsxNumericCharacterReferencePattern} from './shared/numeric-character-references.js';

const MESSAGE_ID = 'prefer-named-character-references';
const SUGGESTION_MESSAGE_ID = 'replace';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{reference}}`.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `{{reference}}` with `{{replacement}}`.',
};

const namesByCodePoint = new Map(Object.entries(characterEntitiesHtml4).map(([name, character]) => [character.codePointAt(0), name]));

const htmlReferencePattern = /&#(?:\d+|x[\da-f]+);?/giv;
const completeReferencePattern = /&#(?:\d+|x[\da-f]+);/giv;
// Consume escaped backslashes and ampersands before looking for Markdown references.
const markdownReferencePattern = /\\[&\\]|&#(?:\d{1,7}|x[\da-f]{1,6});/giv;
// HTML node locations and ESLint's offset lookup can count these line breaks differently.
const unsupportedHtmlLineBreakPattern = /\r(?!\n)|[\u{2028}\u{2029}]/v;
const rawHtmlTextElementNames = new Set(['iframe', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'xmp']);

function getNamedHtmlReference(character) {
	const encoded = encodeHTML(character);
	if (/^&[\dA-Za-z]+;$/v.test(encoded)) {
		return encoded;
	}
}

function getJsxReplacement(reference) {
	const name = namesByCodePoint.get(getNumericCharacterReferenceCodePoint(reference));
	if (name !== undefined) {
		return `&${name};`;
	}
}

const getHtmlReplacement = reference => getNamedHtmlReference(decodeHTML(reference));

function getMarkdownReplacement(reference) {
	const codePoint = getNumericCharacterReferenceCodePoint(reference);
	if (codePoint <= 0x10_FF_FF) {
		return getNamedHtmlReference(String.fromCodePoint(codePoint));
	}
}

const decodeHtmlText = text => decodeHTML(text.replaceAll(/\r\n?/g, '\n'));

function getMarkdownResourceRange(node, sourceCode) {
	const [start, end] = sourceCode.getRange(node);
	if (node.type === 'definition') {
		// The label's raw spelling determines which links use this definition.
		const label = /^\[(?:\\.|[^\\\]])*\]:/sv.exec(sourceCode.text.slice(start, end))?.[0];
		if (label) {
			return [start + label.length, end];
		}

		return;
	}

	if (node.type === 'image') {
		const offset = getMarkdownImageResourceOffset(sourceCode.text.slice(start, end));
		if (offset !== undefined) {
			return [start + offset, end];
		}

		return;
	}

	const lastChild = node.children.at(-1);
	if (sourceCode.text[start] !== '[' || (lastChild && !lastChild.position)) {
		return;
	}

	const resourceStart = lastChild ? sourceCode.getRange(lastChild)[1] : start + 1;
	if (sourceCode.text.startsWith('](', resourceStart)) {
		return [resourceStart + 2, end];
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
			const decoded = decodeHtmlText(raw);
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
	if (!sourceCode.text.includes('&#')) {
		return;
	}

	const hasPotentialReferenceDefinitions = sourceCode.text.includes(']:');

	function * getProblems(node, inputRange, {pattern = completeReferencePattern, getReplacement = getHtmlReplacement, shouldSuggest = false} = {}) {
		const [inputStart, inputEnd] = inputRange;
		for (const match of sourceCode.text.slice(inputStart, inputEnd).matchAll(pattern)) {
			const [reference] = match;
			const replacement = reference.startsWith('&') ? getReplacement(reference) : undefined;
			if (replacement === undefined) {
				continue;
			}

			const start = inputStart + match.index;
			const range = [start, start + reference.length];
			const data = {reference, replacement};
			const fix = fixer => fixer.replaceTextRange(range, replacement);
			yield {
				node,
				loc: toLocation(range, context),
				messageId: MESSAGE_ID,
				data,
				...(shouldSuggest ? {suggest: [{messageId: SUGGESTION_MESSAGE_ID, fix}]} : {fix}),
			};
		}
	}

	const getStringProblems = (node, range = sourceCode.getRange(node)) => getProblems(node, range, {shouldSuggest: true});
	const getHtmlProblems = (node, range = sourceCode.getRange(node)) => getProblems(node, range, {pattern: htmlReferencePattern});
	const getMarkdownProblems = (node, range) => getProblems(node, range, {pattern: markdownReferencePattern, getReplacement: getMarkdownReplacement});

	context.on('Literal', node => {
		if (isStringLiteral(node) && !isStringLiteralRequired(node)) {
			return getStringProblems(node);
		}
	});
	context.on('TemplateLiteral', function * (node) {
		if (isStringLiteralRequired(node)) {
			return;
		}

		for (const quasi of node.quasis) {
			yield * getStringProblems(quasi);
		}
	});

	context.on('String', node => {
		if (sourceCode.ast.type !== 'StyleSheet' && sourceCode.getParent(node)?.name !== node) {
			return getStringProblems(node);
		}
	});
	context.on('TOMLValue', node => {
		if (node.kind === 'string') {
			return getStringProblems(node);
		}
	});
	context.on('YAMLScalar', node => {
		if (typeof node.value !== 'string') {
			return;
		}

		for (let ancestor = node; ancestor.parent; ancestor = ancestor.parent) {
			if (ancestor.parent.key === ancestor) {
				return;
			}
		}

		if (node.style === 'literal' || node.style === 'folded') {
			// Use the body token to skip comments on the block scalar header.
			return getStringProblems(node, sourceCode.getRange(sourceCode.getLastToken(node)));
		}

		return getStringProblems(node);
	});
	context.on('StyleSheet', node => {
		const problems = [];
		// Quoted strings in URLs and custom properties do not always have a String node.
		tokenize(sourceCode.text, (type, start, end) => {
			if (type === tokenTypes.String) {
				for (const problem of getStringProblems(node, [start, end])) {
					problems.push(problem);
				}
			}
		});
		return problems;
	});

	const getJsxProblems = node => getProblems(node, sourceCode.getRange(node), {pattern: jsxNumericCharacterReferencePattern, getReplacement: getJsxReplacement});
	context.on('JSXText', getJsxProblems);
	context.on('JSXAttribute', node => {
		if (isStringLiteral(node.value)) {
			return getJsxProblems(node.value);
		}
	});

	context.on('SvelteText', node => {
		// The compiler can emit raw HTML text even when its AST exposes a decoded value.
		if (
			decodeHtmlText(sourceCode.getText(node)) !== node.value
			|| sourceCode.getAncestors(node).some(ancestor => ancestor.kind === 'html' && rawHtmlTextElementNames.has(ancestor.name.name.toLowerCase()))
		) {
			return;
		}

		// Require a semicolon because the compiler can join raw text chunks after removing a comment.
		return getProblems(node, sourceCode.getRange(node));
	});
	context.on('SvelteLiteral', node => {
		const attribute = node.parent;
		if (
			attribute.type === 'SvelteAttribute'
			&& attribute.parent.parent.type === 'SvelteElement'
			&& decodeHTMLAttribute(sourceCode.getText(node)) === node.value
		) {
			return getHtmlProblems(node);
		}
	});

	context.on('Program', function * ({templateBody}) {
		if (!templateBody || context.languageOptions.parserOptions?.templateTokenizer) {
			return;
		}

		// Walk only static template nodes. The normal JavaScript visitors handle the script.
		const pending = [templateBody];
		while (pending.length > 0) {
			const element = pending.pop();
			for (const {value} of element.startTag.attributes) {
				if (value?.type === 'VLiteral') {
					// Vue.js 2 only decodes a small set of references in static attributes.
					yield * getProblems(value, sourceCode.getRange(value), {pattern: htmlReferencePattern, shouldSuggest: true});
				}
			}

			// Vue.js can preserve raw text even when its ESLint parser decodes it in SVG.
			if (rawHtmlTextElementNames.has(element.name.toLowerCase())) {
				continue;
			}

			for (const child of element.children) {
				if (child.type === 'VElement') {
					pending.push(child);
				} else if (child.type === 'VText' && decodeHtmlText(sourceCode.getText(child)) === child.value) {
					yield * getHtmlProblems(child);
				}
			}
		}
	});

	context.on('Document', function * (node) {
		if (node.parent?.type !== 'Program') {
			return;
		}

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
		if (templateDelimiters.some(delimiter => markup.includes(delimiter))) {
			return;
		}

		for (const [rangeStart, rangeEnd] of getHtmlRanges(markup)) {
			yield * getHtmlProblems(node, [start + rangeStart, start + rangeEnd]);
		}
	});

	context.on(['link', 'image', 'definition'], node => {
		if (!node.position) {
			return;
		}

		const range = getMarkdownResourceRange(node, sourceCode);
		if (range) {
			return getMarkdownProblems(node, range);
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

		return getMarkdownProblems(node, sourceCode.getRange(node));
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
			description: 'Prefer named character references over numeric references.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
			'css/css',
			'html/html',
			'json/json',
			'json/jsonc',
			'json/json5',
			'markdown/commonmark',
			'markdown/gfm',
			'soml/soml',
			'toml/toml',
			'yml/yaml',
		],
	},
};

export default config;
