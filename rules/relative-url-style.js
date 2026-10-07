import {ident} from '@eslint/css-tree';
import {decodeHTMLAttribute} from 'entities';
import {parse, preprocess, postprocess} from 'micromark';
import {parseFragment} from 'parse5';
import {isNewExpression, isStringLiteral} from './ast/index.js';
import {getStaticValueIfNoSideEffects} from './utils/index.js';
import getSrcsetCandidates from './shared/get-srcset-candidates.js';

const MESSAGE_ID_NEVER = 'never';
const MESSAGE_ID_ALWAYS = 'always';
const MESSAGE_ID_REMOVE = 'remove';
const messages = {
	[MESSAGE_ID_NEVER]: 'Remove the `./` prefix from the relative URL.',
	[MESSAGE_ID_ALWAYS]: 'Add a `./` prefix to the relative URL.',
	[MESSAGE_ID_REMOVE]: 'Remove leading `./`.',
};

const DOT_SLASH = './';
const imageSetFunctions = new Set(['image-set', '-webkit-image-set']);
const TEST_URL_BASES = [
	'https://example.com/a/b/',
	'https://example.com/a/b.html',
];
const isSafeToAddDotSlashToUrl = (url, base) => {
	try {
		const originalUrl = new URL(url, base);
		const urlWithDotSlash = new URL(DOT_SLASH + url, base);
		return originalUrl.href === urlWithDotSlash.href;
	} catch {}

	return false;
};

const isSafeToAddDotSlash = (url, bases = TEST_URL_BASES) => bases.every(base => isSafeToAddDotSlashToUrl(url, base));
const isSafeToRemoveDotSlash = (url, bases = TEST_URL_BASES) => bases.every(base => isSafeToAddDotSlashToUrl(url.slice(DOT_SLASH.length), base));

function canAddDotSlash(node, sourceCode) {
	const url = node.value;
	if (url.startsWith(DOT_SLASH) || url.startsWith('.') || url.startsWith('/')) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValueIfNoSideEffects(baseNode, {sourceCode});

	if (typeof staticValueResult?.value === 'string') {
		return isSafeToAddDotSlash(url, [staticValueResult.value]);
	}

	return isSafeToAddDotSlash(url);
}

function canRemoveDotSlash(node, sourceCode) {
	const rawValue = node.raw.slice(1, -1);
	if (!rawValue.startsWith(DOT_SLASH)) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValueIfNoSideEffects(baseNode, {sourceCode});

	if (typeof staticValueResult?.value === 'string') {
		return isSafeToRemoveDotSlash(node.value, [staticValueResult.value]);
	}

	return isSafeToRemoveDotSlash(node.value);
}

function addDotSlash(node, sourceCode) {
	if (!canAddDotSlash(node, sourceCode)) {
		return;
	}

	const insertPosition = sourceCode.getRange(node)[0] + 1; // After quote
	return fixer => fixer.insertTextAfterRange([insertPosition, insertPosition], DOT_SLASH);
}

function removeDotSlash(node, sourceCode) {
	if (!canRemoveDotSlash(node, sourceCode)) {
		return;
	}

	const start = sourceCode.getRange(node)[0] + 1; // After quote
	return fixer => fixer.removeRange([start, start + 2]);
}

function getMarkdownImageDestinationOffset(text) {
	const events = postprocess(parse().document().write(preprocess()(text, 'utf8', true)));
	const owners = [];

	for (const [event, token] of events) {
		if (token.type === 'image' || token.type === 'link') {
			if (event === 'enter') {
				owners.push(token);
			} else {
				owners.pop();
			}
		}

		const owner = owners.at(-1);
		if (
			event === 'enter'
			&& token.type === 'resourceDestinationString'
			&& owners.length === 1
			&& owner.type === 'image'
			&& owner.start.offset === 0
			&& owner.end.offset === text.length
		) {
			return token.start.offset;
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const style = context.options[0];
	const {sourceCode} = context;
	const templateDelimiters = Object.keys(context.languageOptions?.templateEngineSyntax ?? {});
	const isCssResourceUrl = node => {
		const prelude = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'AtrulePrelude');
		return !prelude || (ident.decode(sourceCode.getParent(prelude).name).toLowerCase() === 'import' && prelude.children.at(0) === node);
	};

	const getMarkupProblem = (node, url, start) => {
		if (templateDelimiters.some(delimiter => url.includes(delimiter))) {
			return;
		}

		if (style === 'never') {
			if (!sourceCode.text.startsWith(DOT_SLASH, start) || !isSafeToRemoveDotSlash(url)) {
				return;
			}
		} else if (url.startsWith('.') || url.startsWith('/') || !isSafeToAddDotSlash(url)) {
			return;
		}

		return {
			node,
			messageId: style,
			fix: fixer => style === 'never'
				? fixer.removeRange([start, start + DOT_SLASH.length])
				: fixer.insertTextAfterRange([start, start], DOT_SLASH),
		};
	};

	context.on('Url', node => {
		if (!isCssResourceUrl(node)) {
			return;
		}

		// The CSS tokenizer only creates `Url` nodes from a literal `url(` (no escapes), so this always matches.
		const [prefix] = sourceCode.getText(node).match(/^url\([\t\n\f\r ]*["']?/i);
		return getMarkupProblem(node, node.value, sourceCode.getRange(node)[0] + prefix.length);
	});

	context.on('Atrule', node => {
		if (ident.decode(node.name).toLowerCase() !== 'import') {
			return;
		}

		const string = node.prelude?.children?.at(0);
		if (string?.type === 'String') {
			return getMarkupProblem(string, string.value, sourceCode.getRange(string)[0] + 1);
		}
	});
	context.on('String', node => {
		const parent = sourceCode.getParent(node);
		if (parent?.type !== 'Function' || !imageSetFunctions.has(ident.decode(parent.name).toLowerCase()) || !isCssResourceUrl(node)) {
			return;
		}

		return getMarkupProblem(node, node.value, sourceCode.getRange(node)[0] + 1);
	});

	const getHtmlAttributeProblems = (node, name, raw, start) => {
		if (
			!['href', 'src', 'poster', 'srcset', 'imagesrcset'].includes(name)
			|| !raw
			|| templateDelimiters.some(delimiter => raw.includes(delimiter))
		) {
			return;
		}

		if (name === 'srcset' || name === 'imagesrcset') {
			if (decodeHTMLAttribute(raw) !== raw) {
				return;
			}

			// A leading comma would become a candidate separator if the prefix were removed.
			return getSrcsetCandidates(raw)
				.filter(candidate => !candidate.value.startsWith('./,'))
				.map(candidate => getMarkupProblem(node, candidate.value, start + candidate.offsets[0]));
		}

		const value = raw.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
		const url = decodeHTMLAttribute(value);
		if (url !== url.trim()) {
			return;
		}

		return [getMarkupProblem(node, url, start + raw.indexOf(value))];
	};

	context.on('Attribute', node => {
		if (node.key.parts.length > 0 || !node.value || node.value.parts.length > 0) {
			return;
		}

		const [start] = sourceCode.getRange(node.value);
		// The HTML parser can stop an unquoted value at a slash.
		const raw = node.startWrapper ? sourceCode.getText(node.value) : sourceCode.text.slice(start).match(/^[^\t\n\f\r "'<>`]+/u)?.[0];
		return getHtmlAttributeProblems(node, node.key.value.toLowerCase(), raw, start);
	});

	context.on(['link', 'definition'], node => {
		// Complex definition labels are left unchanged when their destination cannot be located unambiguously.
		const [start, end] = sourceCode.getRange(node);
		const lastChild = node.children?.at(-1);
		const prefixStart = lastChild ? sourceCode.getRange(lastChild)[1] : start;
		const prefix = sourceCode.text.slice(prefixStart, end).match(lastChild
			? /^\]\([\t\n\r ]*<?/u
			: /^\[(?:\\.|[^<[\\\]`])*\](?:\(|:)[\t\n\r ]*<?/u)?.[0];
		if (!prefix) {
			return;
		}

		return getMarkupProblem(node, node.url, prefixStart + prefix.length);
	});

	context.on('image', node => {
		const text = sourceCode.getText(node);
		// Math syntax can change image label boundaries.
		if (context.languageOptions.math === true && text.includes('$')) {
			return;
		}

		const offset = getMarkdownImageDestinationOffset(text);
		if (offset !== undefined) {
			return getMarkupProblem(node, node.url, sourceCode.getRange(node)[0] + offset);
		}
	});

	const markdownHtmlNodes = [];
	context.on('html', node => {
		markdownHtmlNodes.push(node);
	});
	context.onExit('root', () => {
		// Container processing can change HTML content, so only use unchanged fragments.
		if (markdownHtmlNodes.length === 0 || markdownHtmlNodes.some(node => sourceCode.getText(node) !== node.value)) {
			return;
		}

		// Mask Markdown while preserving offsets and HTML context across separate fragments.
		const parts = [];
		let previousEnd = 0;
		for (const node of markdownHtmlNodes) {
			const [start, end] = sourceCode.getRange(node);
			parts.push(sourceCode.text.slice(previousEnd, start).replaceAll(/[^\n\r]/g, ' '), sourceCode.text.slice(start, end));
			previousEnd = end;
		}

		parts.push(sourceCode.text.slice(previousEnd).replaceAll(/[^\n\r]/g, ' '));
		const fragment = parseFragment(parts.join(''), {sourceCodeLocationInfo: true});
		const problems = [];
		const collectProblems = element => {
			for (const attribute of element.attrs ?? []) {
				const location = element.sourceCodeLocation?.attrs?.[attribute.name];
				if (attribute.prefix || !location) {
					continue;
				}

				const node = markdownHtmlNodes.find(node => {
					const [start, end] = sourceCode.getRange(node);
					return location.startOffset >= start && location.endOffset <= end;
				});
				if (!node) {
					continue;
				}

				const text = sourceCode.text.slice(location.startOffset, location.endOffset);
				const prefix = text.match(/^[^=]*=[\t\n\f\r ]*(["']?)/u);
				if (!prefix) {
					continue;
				}

				const raw = text.slice(prefix[0].length, prefix[1] ? -1 : undefined);
				problems.push(...getHtmlAttributeProblems(node, attribute.name, raw, location.startOffset + prefix[0].length) ?? []);
			}

			for (const child of element.childNodes ?? []) {
				collectProblems(child);
			}

			if (element.content) {
				collectProblems(element.content);
			}
		};

		collectProblems(fragment);
		return problems;
	});

	// Template literals are not always safe to remove `./` from, but report those starting with `./`.
	if (style === 'never') {
		context.on('TemplateLiteral', node => {
			if (!(
				isNewExpression(node.parent, {name: 'URL', argumentsLength: 2})
				&& node.parent.arguments[0] === node
			)) {
				return;
			}

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
							const start = context.sourceCode.getRange(firstPart)[0] + 1;
							return fixer.removeRange([start, start + DOT_SLASH.length]);
						},
					},
				],
			};
		});
	}

	context.on('Literal', node => {
		if (!(
			isStringLiteral(node)
			&& isNewExpression(node.parent, {name: 'URL', argumentsLength: 2})
			&& node.parent.arguments[0] === node
		)) {
			return;
		}

		const {sourceCode} = context;
		const fix = (style === 'never' ? removeDotSlash : addDotSlash)(node, sourceCode);

		if (!fix) {
			return;
		}

		return {
			node,
			messageId: style,
			fix,
		};
	});
};

const schema = [
	{
		enum: ['never', 'always'],
		description: 'Whether to never or always use a leading `./` for relative URLs.',
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
			description: 'Enforce consistent relative URL style.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: ['never'],
		messages,
		languages: [
			'js/js',
			'css/css',
			'html/html',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
