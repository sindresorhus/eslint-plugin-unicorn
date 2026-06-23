import {
	getComments,
	isEslintDisableOrEnableDirective,
	normalizeComment,
	onRoot,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'comment-content';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.',
};

const caseInsensitive = replacement => ({
	replacement,
	caseSensitive: false,
});

const defaultReplacements = {
	'\\bapplication\\b(?!/)': 'app',
	'\\bapplications\\b': 'apps',
	'\\bapi\\b': caseInsensitive('API'),
	// eslint-disable-next-line unicorn/text-encoding-identifier-case
	'\\bascii\\b': caseInsensitive('ASCII'),
	'\\bast\\b': caseInsensitive('AST'),
	'\\bavif\\b': caseInsensitive('AVIF'),
	'\\baws\\b': caseInsensitive('AWS'),
	'\\bazure\\b': caseInsensitive('Azure'),
	'\\bbitcoin\\b': caseInsensitive('Bitcoin'),
	'\\bbom\\b': caseInsensitive('BOM'),
	'\\bcd\\b': caseInsensitive('CD'),
	'\\bcdn\\b': caseInsensitive('CDN'),
	'\\bci\\b': caseInsensitive('CI'),
	'\\bcjs\\b': caseInsensitive('CJS'),
	'\\bcli\\b': caseInsensitive('CLI'),
	'\\bcors\\b': caseInsensitive('CORS'),
	'\\bcpu\\b': caseInsensitive('CPU'),
	'\\bcrud\\b': caseInsensitive('CRUD'),
	'\\bcsrf\\b': caseInsensitive('CSRF'),
	'\\bcsv\\b': caseInsensitive('CSV'),
	'\\bcss\\b': caseInsensitive('CSS'),
	'\\bdeno\\b': caseInsensitive('Deno'),
	'\\bdevops\\b': caseInsensitive('DevOps'),
	'\\bdns\\b': caseInsensitive('DNS'),
	'\\bdocker\\b': caseInsensitive('Docker'),
	'\\bdom\\b': caseInsensitive('DOM'),
	'\\bdiscord\\b': caseInsensitive('Discord'),
	'\\bec2\\b': caseInsensitive('EC2'),
	'\\beof\\b': caseInsensitive('EOF'),
	'\\beol\\b': caseInsensitive('EOL'),
	'\\beslint(?:\\.js)?\\b': caseInsensitive('ESLint'),
	'\\besm\\b': caseInsensitive('ESM'),
	'\\bfacebook\\b': caseInsensitive('Facebook'),
	'\\bftp\\b': caseInsensitive('FTP'),
	'\\bgcp\\b': caseInsensitive('GCP'),
	'\\bgif\\b': caseInsensitive('GIF'),
	'\\bgit\\b': caseInsensitive('Git'),
	'\\bgithub\\b': caseInsensitive('GitHub'),
	'\\bgpu\\b': caseInsensitive('GPU'),
	'\\bgraphql\\b': caseInsensitive('GraphQL'),
	'\\bgrunt(?:\\.js)?\\b': caseInsensitive('Grunt'),
	'\\bgulp(?:\\.js)?\\b': caseInsensitive('Gulp'),
	'\\bhtml\\b': caseInsensitive('HTML'),
	'\\bhttps\\b': caseInsensitive('HTTPS'),
	'\\bhttp\\b': caseInsensitive('HTTP'),
	'\\bide\\b': caseInsensitive('IDE'),
	'\\biife\\b': caseInsensitive('IIFE'),
	'\\bios\\b': caseInsensitive('iOS'),
	'\\bjavascript\\b': caseInsensitive('JavaScript'),
	'\\bjpeg\\b': caseInsensitive('JPEG'),
	'\\bjpg\\b': caseInsensitive('JPG'),
	'\\bjson\\b': caseInsensitive('JSON'),
	'\\bjsx\\b': caseInsensitive('JSX'),
	'\\bjquery\\b': caseInsensitive('jQuery'),
	'\\bjwt\\b': caseInsensitive('JWT'),
	'\\bk8s\\b': caseInsensitive('K8s'),
	'\\bkubernetes\\b': caseInsensitive('Kubernetes'),
	'\\blinux\\b': caseInsensitive('Linux'),
	'\\blsp\\b': caseInsensitive('LSP'),
	'\\bltr\\b': caseInsensitive('LTR'),
	'\\bmdn\\b': caseInsensitive('MDN'),
	'\\bmime\\b': caseInsensitive('MIME'),
	'\\bmongodb\\b': caseInsensitive('MongoDB'),
	'\\bmysql\\b': caseInsensitive('MySQL'),
	'\\bnfc\\b': caseInsensitive('NFC'),
	'\\bnfd\\b': caseInsensitive('NFD'),
	'\\bnginx\\b': caseInsensitive('NGINX'),
	'\\bnode\\.?js\\b': caseInsensitive('Node.js'),
	'\\bnpm\\b': caseInsensitive('npm'),
	'\\boauth\\b': caseInsensitive('OAuth'),
	'\\bpdf\\b': caseInsensitive('PDF'),
	'\\bpng\\b': caseInsensitive('PNG'),
	'\\bposix\\b': caseInsensitive('POSIX'),
	'\\bpostgresql\\b': caseInsensitive('PostgreSQL'),
	'\\bram\\b': caseInsensitive('RAM'),
	'\\breact\\.?js\\b': caseInsensitive('React'),
	'\\breddit\\b': caseInsensitive('Reddit'),
	'\\bredis\\b': caseInsensitive('Redis'),
	'\\brtl\\b': caseInsensitive('RTL'),
	'\\bs3\\b': caseInsensitive('S3'),
	'\\bsdk\\b': caseInsensitive('SDK'),
	'\\bsftp\\b': caseInsensitive('SFTP'),
	'\\bsql\\b': caseInsensitive('SQL'),
	'\\bsqlite\\b': caseInsensitive('SQLite'),
	'\\bssh\\b': caseInsensitive('SSH'),
	'\\bssl\\b': caseInsensitive('SSL'),
	'\\bstack\\s?overflow\\b': caseInsensitive('Stack Overflow'),
	'\\bstderr\\b': caseInsensitive('stderr'),
	'\\bstdin\\b': caseInsensitive('stdin'),
	'\\bstdout\\b': caseInsensitive('stdout'),
	'\\bsvelte\\b': caseInsensitive('Svelte'),
	'\\bsvg\\b': caseInsensitive('SVG'),
	'\\btcp\\b': caseInsensitive('TCP'),
	'\\btls\\b': caseInsensitive('TLS'),
	'\\btsv\\b': caseInsensitive('TSV'),
	'\\btwitch(?:tv)?\\b': caseInsensitive('Twitch'),
	'\\btypescript\\b': caseInsensitive('TypeScript'),
	'\\bui\\b': caseInsensitive('UI'),
	'\\budp\\b': caseInsensitive('UDP'),
	'\\bumd\\b': caseInsensitive('UMD'),
	'\\bunicode\\b': caseInsensitive('Unicode'),
	'\\bunix\\b': caseInsensitive('Unix'),
	'\\burl\\b': caseInsensitive('URL'),
	'\\buri\\b': caseInsensitive('URI'),
	// eslint-disable-next-line unicorn/text-encoding-identifier-case
	'\\butf-?8\\b': caseInsensitive('UTF-8'),
	'\\bux\\b': caseInsensitive('UX'),
	'\\buuid\\b': caseInsensitive('UUID'),
	'\\bvite\\b': caseInsensitive('Vite'),
	'\\bvue(?:\\.?js)?\\b': caseInsensitive('Vue.js'),
	'\\bvs\\s?code\\b': caseInsensitive('VS Code'),
	'\\b(?:webassembly|wasm)\\b': caseInsensitive('WebAssembly'),
	'\\bwebgl\\b': caseInsensitive('WebGL'),
	'\\bwebp\\b': caseInsensitive('WebP'),
	'\\bwebrtc\\b': caseInsensitive('WebRTC'),
	'\\bwebsocket\\b': caseInsensitive('WebSocket'),
	'\\bxml\\b': caseInsensitive('XML'),
	'\\bxss\\b': caseInsensitive('XSS'),
	'\\byaml\\b': caseInsensitive('YAML'),
	'\\byou\\s?tube\\b': caseInsensitive('YouTube'),
	'\\b(?:mac\\s?os(?!\\s?x)|(mac\\s?)?os\\s?x)\\b': caseInsensitive('macOS'),
};
const defaultReplacementTermPatterns = Object.entries(defaultReplacements)
	.filter(([, options]) => {
		const replacement = typeof options === 'string' ? options : options.replacement;

		return replacement === replacement.toUpperCase();
	})
	.map(([pattern]) => new RegExp(`^(?:${pattern})$`, 'iv'));

function normalizeReplacement(pattern, options) {
	if (typeof options === 'string') {
		options = {
			replacement: options,
		};
	}

	return {
		regex: new RegExp(pattern, options.caseSensitive === false ? 'giu' : 'gu'),
		replacement: options.replacement,
	};
}

function prepareReplacements({extendDefaultReplacements = true, replacements = {}} = {}) {
	const mergedReplacements = extendDefaultReplacements
		? {...defaultReplacements, ...replacements}
		: replacements;

	return Object.entries(mergedReplacements)
		.filter(([, replacement]) => replacement !== false)
		.map(([pattern, replacement]) => normalizeReplacement(pattern, replacement));
}

function isEslintDirective(context, comment) {
	return context.sourceCode.getDisableDirectives
		&& (isEslintDisableOrEnableDirective(context, comment)
			|| (comment.type === 'Block' && /^\s*(?:eslint(?:-env)?|global|exported)\b/v.test(comment.value)));
}

function shouldUseRawCommentFallback(context) {
	const filename = context.physicalFilename.toLowerCase();

	return filename.endsWith('.md')
		|| filename.endsWith('.markdown');
}

function getMarkdownHtmlComments(sourceCode) {
	const comments = [];
	const {text} = sourceCode;
	let activeFence;
	let lineStart = 0;

	while (lineStart < text.length) {
		const lineEnd = getLineEndIndex(text, lineStart);
		const line = text.slice(lineStart, lineEnd);
		const fence = /^ {0,3}(?<fence>`{3,}|~{3,})/v.exec(line)?.groups.fence;

		if (fence) {
			if (!activeFence) {
				activeFence = {
					character: fence[0],
					size: fence.length,
				};
			} else if (fence[0] === activeFence.character && fence.length >= activeFence.size) {
				activeFence = undefined;
			}

			lineStart = lineEnd + 1;
			continue;
		}

		if (activeFence) {
			lineStart = lineEnd + 1;
			continue;
		}

		let nextLineStart = lineEnd + 1;
		let searchStart = lineStart;
		while (searchStart <= lineEnd) {
			const index = text.indexOf('<!--', searchStart);
			if (index === -1 || index > lineEnd) {
				break;
			}

			const end = text.indexOf('-->', index + 4);
			const range = [index, end === -1 ? text.length : end + 3];
			comments.push({
				type: 'Block',
				value: text.slice(index + 4, range[1] - 3),
				range,
			});

			if (end === -1) {
				return comments;
			}

			if (range[1] > lineEnd) {
				nextLineStart = getLineEndIndex(text, range[1]) + 1;
				break;
			}

			searchStart = range[1];
		}

		lineStart = nextLineStart;
	}

	return comments;
}

function getRuleComments(context) {
	const commentsFromHelper = getComments(context);
	const comments = (commentsFromHelper.length > 0 ? commentsFromHelper : context.sourceCode.comments ?? [])
		.map(comment => normalizeComment(comment, context));

	if (comments.length > 0 || !shouldUseRawCommentFallback(context)) {
		return comments;
	}

	return getMarkdownHtmlComments(context.sourceCode);
}

function getCommentValueStart(comment, sourceCode) {
	const range = sourceCode.getRange(comment);
	const commentText = sourceCode.text.slice(...range);
	const valueOffset = commentText.indexOf(comment.value);

	if (valueOffset === -1) {
		return;
	}

	return range[0] + valueOffset;
}

const urlPattern = /\b(?:[a-z][\d+\-.a-z]{0,31}:\/\/|www\.)\S+/giv;
const mimeTypePattern = /\b(?:application|audio|font|image|message|model|multipart|text|video)\/[\da-z][\d+\-.a-z]*\b/giv;
const codeLikeLineStartPattern = /^(?:import|export|const|let|var|type|interface|class|function|return|await|throw)\b/v;
const controlFlowLikeLineStartPattern = /^(?:(?:if|for|while|switch|catch)\s*\(|else(?:\s+if\s*\(|\s*(?:\{|$))|(?:try|do|finally)\s*(?:\{|$)|(?:case\b[^:]+|default\s*):)/v;
const identifierPatternSource = String.raw`[\w$]+`;
const codeIdentifierPatternSource = String.raw`[$A-Z_a-z][\w$]*`;
const listMarkerPatternSource = String.raw`(?:[*+\-]|\d+\.)`;
const optionalListMarkerPrefixPatternSource = String.raw`${listMarkerPatternSource}?\s*`;
const optionalLabelPrefixPatternSource = String.raw`(?:${identifierPatternSource}:\s*)?`;
const bracketPropertyPatternSource = String.raw`\[[^\]]+\]`;
const memberCallPropertyPatternSource = String.raw`(?:(?:\?\.|\.)\s*${identifierPatternSource}|\??\.\s*${bracketPropertyPatternSource})`;
const memberAssignmentTargetPatternSource = String.raw`${identifierPatternSource}(?:\s*${memberCallPropertyPatternSource}|\s*${bracketPropertyPatternSource})+`;
const optionalDeclarationPrefixPatternSource = String.raw`(?:(?:const|let|var)\s+)?`;
const assignmentTargetPatternSource = `(?:${identifierPatternSource}|${memberAssignmentTargetPatternSource})`;
const optionalAssignmentPrefixPatternSource = String.raw`(?:(?:${identifierPatternSource}:|${optionalDeclarationPrefixPatternSource}${assignmentTargetPatternSource}\s*=)\s*)?`;
const markdownLinkDestinationStartPatternSource = String.raw`(?:[A-Za-z][\d+\-.A-Za-z]*:\/\/|www\.|[\u{2D}0-9A-Za-z]+\.|[\w\-.]+\/|\/|#)`;
const callArgumentsPatternSource = String.raw`\((?!\s*${markdownLinkDestinationStartPatternSource})[^\)]*\)`;
const bracketMemberAccessLinePattern = new RegExp([
	`^${optionalLabelPrefixPatternSource}${identifierPatternSource}(?:`,
	String.raw`(?:\??\.\s*)?${bracketPropertyPatternSource}(?:\s*\.[\w$]|\s*$)`,
	String.raw`|\s+${bracketPropertyPatternSource}\s*\.[\w$])`,
].join(''), 'v');
const chainedBracketMemberAccessLinePattern = new RegExp([
	`^${optionalLabelPrefixPatternSource}${codeIdentifierPatternSource}`,
	String.raw`\s*(?:\??\.\s*)?${bracketPropertyPatternSource}`,
	String.raw`\s*${bracketPropertyPatternSource}\s*$`,
].join(''), 'v');
const spacedBracketCallLinePattern = new RegExp([
	`^${optionalListMarkerPrefixPatternSource}`,
	String.raw`(?:\(\s*)?`,
	optionalAssignmentPrefixPatternSource,
	codeIdentifierPatternSource,
	String.raw`\s+${bracketPropertyPatternSource}\s*${callArgumentsPatternSource}\s*\)?\s*;?$`,
].join(''), 'v');
const markdownLinkLabelPattern = String.raw`\[[^\n\]]{1,200}\]`;
const markdownLinkDestinationPattern = String.raw`[^\s\)\[]+`;
const markdownLinkTitlePattern = String.raw`(?:"[^\n"]*"|'[^\n']*'|\([^\n\)]+\))`;
const markdownLinkStartPattern = String.raw`(?:^|[\s\(])${markdownLinkLabelPattern}`;
const markdownInlineLinkPattern = new RegExp(String.raw`${markdownLinkStartPattern}\(${markdownLinkDestinationPattern}(?:[^\S\n]+${markdownLinkTitlePattern})?\)`, 'gv');
const markdownLinkPattern = new RegExp([
	`${markdownLinkStartPattern}(?:`,
	String.raw`:[^\S\n]*${markdownLinkDestinationPattern}(?:[^\S\n]+${markdownLinkTitlePattern})?`,
	`|(?:${markdownLinkLabelPattern})+`,
	String.raw`|\(${markdownLinkDestinationPattern}(?:[^\S\n]+${markdownLinkTitlePattern})?\))`,
].join(''), 'gv');
const memberCallLinePattern = new RegExp([
	`^${optionalListMarkerPrefixPatternSource}`,
	String.raw`(?:\(\s*)?`,
	optionalAssignmentPrefixPatternSource,
	`${identifierPatternSource}(?:`,
	String.raw`\s*${memberCallPropertyPatternSource}\s*(?:\?\.\s*)?\(`,
	String.raw`|${bracketPropertyPatternSource}\()`,
].join(''), 'v');
const bareCallLinePattern = new RegExp([
	`^${optionalListMarkerPrefixPatternSource}`,
	String.raw`(?:\(\s*)?`,
	optionalAssignmentPrefixPatternSource,
	String.raw`(?:new\s+)?`,
	codeIdentifierPatternSource,
	String.raw`(?:\(|\s+\(\s*$)`,
].join(''), 'v');
const shellPromptLinePattern = new RegExp(String.raw`^${optionalListMarkerPrefixPatternSource}\$\s+\S+`, 'v');
const secondaryShellPromptLinePattern = new RegExp(String.raw`^${optionalListMarkerPrefixPatternSource}>\s*(?:bun|curl|deno|docker|git|node(?:js)?|npm|npx|pnpm|yarn)\b`, 'v');
const listMarkerPattern = new RegExp(String.raw`^${listMarkerPatternSource}\s*`, 'v');
const dotMemberAccessAfterMatchPattern = /^(?:\?\.|\.|\s+\.)\s*[\w$]+(?:\s*(?:\[|\.[\w$]|\()|\s*$)/v;
const bracketMemberAccessAfterMatchPattern = /^(?:\?\.\s*)?\[[^\]]+\](?:\s*(?:\[|\.[\w$]|\()|\s*$)/v;
const spacedBracketMemberAccessAfterMatchPattern = /^\s+\[[^\]]+\]\s*(?:\[|\.[\w$])/v;
const pathTerminatorCharacters = '"\'`<>';
const packageSpecifierTerminatorCharacters = '"\'`()[]{}<>,';
const domainLeadingPunctuation = '([{<';
const domainTrailingPunctuation = '.,;:!?)]}>';
const maskCharacter = '\uFFFF';
const openBrackets = '([{';
const closeBrackets = ')]}';
const quoteCharacters = '"\'`';

// Count the net change in unbalanced brackets across a line, ignoring brackets inside string literals so they do not miscount. Operates on raw text so it is independent of mask ordering.
function getBracketDepthDelta(text) {
	let delta = 0;
	let quote;

	for (let index = 0; index < text.length; index++) {
		const character = text[index];

		if (quote) {
			if (character === '\\') {
				index++;
				continue;
			}

			if (character === quote) {
				quote = undefined;
			}

			continue;
		}

		if (character === '/' && text[index + 1] === '/') {
			break;
		}

		if (character === '/' && text[index + 1] === '*') {
			const endIndex = text.indexOf('*/', index + 2);
			index = endIndex === -1 ? text.length : endIndex + 1;
			continue;
		}

		if (quoteCharacters.includes(character)) {
			quote = character;
			continue;
		}

		if (openBrackets.includes(character)) {
			delta++;
		} else if (closeBrackets.includes(character)) {
			delta--;
		}
	}

	return delta;
}

function isIdentifierLikeCharacter(character) {
	return Boolean(character) && /[\p{Letter}\p{Number}_]/v.test(character);
}

function isAsciiLetter(character) {
	return Boolean(character)
		&& ((character >= 'a' && character <= 'z')
			|| (character >= 'A' && character <= 'Z'));
}

function getLineEndIndex(text, index) {
	const lineEnd = text.indexOf('\n', index);

	return lineEnd === -1 ? text.length : lineEnd;
}

function getCharacterIndexBefore(text, character, start, end) {
	for (let index = start; index < end; index++) {
		if (text[index] === character) {
			return index;
		}
	}

	return -1;
}

function isMarkupTagStart(text, index) {
	return isAsciiLetter(text[index + 1])
		|| (text[index + 1] === '/' && isAsciiLetter(text[index + 2]));
}

function maskRange(characters, start, end) {
	for (let index = start; index < end; index++) {
		if (characters[index] !== '\n') {
			characters[index] = maskCharacter;
		}
	}
}

function maskPattern(characters, text, pattern) {
	pattern.lastIndex = 0;

	for (const match of text.matchAll(pattern)) {
		maskRange(characters, match.index, match.index + match[0].length);
	}
}

function getTrimmedDomainRange(text, start, end) {
	while (start < end && domainLeadingPunctuation.includes(text[start])) {
		start++;
	}

	while (end > start && domainTrailingPunctuation.includes(text[end - 1])) {
		end--;
	}

	return [start, end];
}

function isBareDomainText(text) {
	if (text.length > 253 || !text.includes('.')) {
		return false;
	}

	const parts = text.toLowerCase().split('.');
	const topLevelDomain = parts.at(-1);

	return topLevelDomain !== 'js'
		&& /^[a-z]{2,63}$/v.test(topLevelDomain)
		&& parts.slice(0, -1).every(part => /^[\u{2D}0-9a-z]{1,63}$/v.test(part));
}

function isOversizedDottedToken(text) {
	return text.length > 253 && text.includes('.');
}

function isOversizedSlashToken(text) {
	return text.length > 253 && text.includes('/');
}

function maskBareDomains(characters, text) {
	let start = 0;

	while (start < text.length) {
		while (start < text.length && /\s/v.test(text[start])) {
			start++;
		}

		let end = start;
		while (end < text.length && !/\s/v.test(text[end])) {
			end++;
		}

		const [domainStart, domainEnd] = getTrimmedDomainRange(text, start, end);
		const domainText = text.slice(domainStart, domainEnd);
		if (isBareDomainText(domainText) || isOversizedDottedToken(domainText)) {
			maskRange(characters, domainStart, domainEnd);
		}

		start = end + 1;
	}
}

function maskMarkdownLinks(characters, text) {
	markdownLinkPattern.lastIndex = 0;

	for (const match of text.matchAll(markdownLinkPattern)) {
		const bracketIndex = text.indexOf('[', match.index);

		if (characters[bracketIndex] === maskCharacter) {
			continue;
		}

		maskRange(characters, match.index, match.index + match[0].length);
	}
}

function getBacktickRunSize(text, index) {
	let size = 0;

	while (text[index + size] === '`') {
		size++;
	}

	return size;
}

function getClosingBacktickIndex(characters, text, start, size) {
	for (let index = start + size; index < text.length; index++) {
		if (characters[index] === maskCharacter) {
			continue;
		}

		if (text[index] !== '`') {
			continue;
		}

		const closingSize = getBacktickRunSize(text, index);
		if (closingSize === size) {
			return index + closingSize;
		}

		index += closingSize - 1;
	}
}

function getClosingQuoteIndex(characters, text, start, quote) {
	for (let index = start + 1; index < text.length; index++) {
		if (characters[index] === maskCharacter) {
			continue;
		}

		if (text[index] === '\\') {
			index++;
			continue;
		}

		if (text[index] === quote) {
			return index + 1;
		}
	}
}

function maskInlineCodeAndQuotedStrings(characters, text) {
	for (let index = 0; index < text.length; index++) {
		if (characters[index] === maskCharacter) {
			continue;
		}

		const character = text[index];

		if (character === '`') {
			const size = getBacktickRunSize(text, index);
			const end = getClosingBacktickIndex(characters, text, index, size) ?? text.length;

			maskRange(characters, index, end);
			index = end - 1;
			continue;
		}

		if (character === '"') {
			const end = getClosingQuoteIndex(characters, text, index, character) ?? text.length;

			maskRange(characters, index, end);
			index = end - 1;
			continue;
		}

		if (character === '\'' && !isIdentifierLikeCharacter(text[index - 1])) {
			const end = getClosingQuoteIndex(characters, text, index, character) ?? text.length;

			maskRange(characters, index, end);
			index = end - 1;
		}
	}
}

function getCommentLine(commentValue, index) {
	const start = commentValue.lastIndexOf('\n', index - 1) + 1;
	const end = getLineEndIndex(commentValue, index);

	return commentValue.slice(start, end);
}

function cleanCommentLine(line) {
	return line.replace(/^\s*\*\s?/v, '').trim();
}

function isPathTerminator(character) {
	return pathTerminatorCharacters.includes(character) || /\s/v.test(character);
}

function isPackageSpecifierTerminator(character) {
	return packageSpecifierTerminatorCharacters.includes(character) || /\s/v.test(character);
}

function getPathTextAfterIndex(commentValue, index) {
	let pathText = '';

	for (const character of commentValue.slice(index)) {
		if (isPathTerminator(character)) {
			break;
		}

		pathText += character;
	}

	return pathText;
}

function isSlashPairProse(text) {
	const parts = text.replace(/[!.?]$/v, '').split('/');

	if (parts.length !== 2) {
		return false;
	}

	return parts.every(part => defaultReplacementTermPatterns.some(pattern => pattern.test(part)));
}

function getPackageSpecifierBase(text) {
	const suffixStart = text.startsWith('@') ? 1 : 0;

	for (let index = suffixStart; index < text.length; index++) {
		if ('#?@'.includes(text[index])) {
			return text.slice(0, index);
		}
	}

	return text;
}

function isPackageSpecifierText(text) {
	if (!text.includes('/') || text.includes('://') || isSlashPairProse(text)) {
		return false;
	}

	const parts = getPackageSpecifierBase(text).split('/');
	if (parts.length < 2) {
		return false;
	}

	if (parts[0].startsWith('@')) {
		return /^@[\w\-.]+$/v.test(parts[0])
			&& parts.slice(1).every(part => /^[\w\-.]+$/v.test(part));
	}

	return parts.every(part => /^[\w\-.]+$/v.test(part));
}

function maskPackageSpecifiers(characters, text) {
	let start = 0;

	while (start < text.length) {
		while (start < text.length && isPackageSpecifierTerminator(text[start])) {
			start++;
		}

		let end = start;
		while (end < text.length && !isPackageSpecifierTerminator(text[end])) {
			end++;
		}

		const token = text.slice(start, end);
		if (isPackageSpecifierText(token) || isOversizedSlashToken(token)) {
			maskRange(characters, start, end);
		}

		start = end + 1;
	}
}

function removeMarkdownInlineLinks(line) {
	return line.replaceAll(markdownInlineLinkPattern, '');
}

function isCommandLine(line) {
	return shellPromptLinePattern.test(line)
		|| secondaryShellPromptLinePattern.test(line);
}

function isQuotedText(text) {
	const quote = text[0];

	return text.length >= 2
		&& (quote === '"' || quote === '\'')
		&& text.at(-1) === quote
		&& !text.slice(1, -1).includes(quote);
}

function isSimpleStructuredKey(text) {
	return isQuotedText(text) || /^[\w$\-]+$/v.test(text);
}

function isSimpleWrappedValue(text, open, close) {
	return text.startsWith(open)
		&& text.endsWith(close)
		&& text.length >= 2;
}

function isSimpleStructuredValue(text) {
	if (text.endsWith(',')) {
		text = text.slice(0, -1).trimEnd();
	}

	const commentStart = /\s+#/v.exec(text)?.index;
	if (commentStart !== undefined) {
		text = text.slice(0, commentStart);
	}

	return isQuotedText(text)
		|| /^https?:\/\/\S+$/v.test(text)
		|| /^[\w$\-.\/]+$/v.test(text)
		|| isSimpleWrappedValue(text, '{', '}')
		|| isSimpleWrappedValue(text, '[', ']');
}

function isStructuredKeyValueLine(line) {
	line = line.replace(listMarkerPattern, '');

	const colonIndex = line.indexOf(':');
	if (colonIndex === -1) {
		return false;
	}

	const key = line.slice(0, colonIndex).trim();
	const value = line.slice(colonIndex + 1).trim();

	return isSimpleStructuredKey(key) && isSimpleStructuredValue(value);
}

function isObjectLiteralLine(line) {
	line = line.replace(listMarkerPattern, '');

	if (line.endsWith(',')) {
		line = line.slice(0, -1).trimEnd();
	}

	return line.startsWith('{')
		&& line.endsWith('}')
		&& line.includes(':');
}

function isIgnoredCommentLine(line) {
	line = cleanCommentLine(line);

	return codeLikeLineStartPattern.test(line)
		|| controlFlowLikeLineStartPattern.test(line)
		|| bracketMemberAccessLinePattern.test(line)
		|| chainedBracketMemberAccessLinePattern.test(line)
		|| spacedBracketCallLinePattern.test(line)
		|| isCommandLine(line)
		|| isStructuredKeyValueLine(line)
		|| isObjectLiteralLine(line)
		|| /;\s*$/v.test(line)
		|| line.includes('=>')
		|| memberCallLinePattern.test(removeMarkdownInlineLinks(line));
}

function getBracketContinuationOpeningDepth(line) {
	line = cleanCommentLine(line);
	line = removeMarkdownInlineLinks(line);

	if (!bareCallLinePattern.test(line) && !memberCallLinePattern.test(line)) {
		return 0;
	}

	return Math.max(0, getBracketDepthDelta(line));
}

// Advance the running bracket depth for one line. A line counts as code if depth is already open (a continuation line) or it looks like code on its own; otherwise depth resets to zero.
function getNextBracketDepth(depth, line) {
	if (depth > 0) {
		return Math.max(0, depth + getBracketDepthDelta(line));
	}

	return getBracketContinuationOpeningDepth(line);
}

function maskIgnoredLines(characters, text) {
	let start = 0;
	let depth = 0;

	while (start < text.length) {
		const end = getLineEndIndex(text, start);
		const line = text.slice(start, end);

		if (characters.slice(start, end).includes(maskCharacter)) {
			depth = 0;
			start = end + 1;
			continue;
		}

		const openingDepth = getBracketContinuationOpeningDepth(line);

		// A line is masked if it looks like code on its own, or if it is a continuation line inside brackets opened by an earlier code-like line.
		if (depth > 0 || isIgnoredCommentLine(line) || openingDepth > 0) {
			maskRange(characters, start, end);
			depth = depth > 0
				? Math.max(0, depth + getBracketDepthDelta(line))
				: openingDepth;
		}

		start = end + 1;
	}
}

function maskFencedCodeBlocks(characters, text) {
	const fencePattern = /^[\t ]*(?:\*\s?)?(?<fence>`{3,}|~{3,})/gmv;
	let activeFence;

	for (const {index, groups} of text.matchAll(fencePattern)) {
		const {fence} = groups;

		if (!activeFence) {
			activeFence = {
				character: fence[0],
				size: fence.length,
				start: index,
			};
			continue;
		}

		if (fence[0] === activeFence.character && fence.length >= activeFence.size) {
			const end = getLineEndIndex(text, index);

			maskRange(characters, activeFence.start, end);
			activeFence = undefined;
		}
	}

	if (activeFence) {
		maskRange(characters, activeFence.start, text.length);
	}
}

function maskJsdocExamples(characters, text) {
	let exampleStart;
	let lineStart = 0;

	while (lineStart < text.length) {
		const end = getLineEndIndex(text, lineStart);
		const line = text.slice(lineStart, end);
		const trimmedLine = cleanCommentLine(line);

		if (exampleStart !== undefined && /^@\w/v.test(trimmedLine)) {
			maskRange(characters, exampleStart, lineStart);
			exampleStart = undefined;
		}

		if (exampleStart === undefined && /^@example\b/v.test(trimmedLine)) {
			exampleStart = lineStart;
		}

		lineStart = end + 1;
	}

	if (exampleStart !== undefined) {
		maskRange(characters, exampleStart, text.length);
	}
}

function maskMarkupTags(characters, text) {
	let start = 0;

	while (start < text.length) {
		const tagStart = text.indexOf('<', start);
		if (tagStart === -1) {
			break;
		}

		if (characters[tagStart] === maskCharacter) {
			start = tagStart + 1;
			continue;
		}

		if (!isMarkupTagStart(text, tagStart)) {
			start = tagStart + 1;
			continue;
		}

		const lineEnd = getLineEndIndex(text, tagStart);
		const tagEnd = getCharacterIndexBefore(text, '>', tagStart + 1, lineEnd);
		if (tagEnd === -1) {
			start = lineEnd + 1;
			continue;
		}

		if (/^<\/?[a-z][\w\-:]*(?:[^\S\n]|\/?>)/iv.test(text.slice(tagStart, tagEnd + 1))) {
			maskRange(characters, tagStart, tagEnd + 1);
			start = tagEnd + 1;
			continue;
		}

		start = tagEnd + 1;
	}
}

function getSearchableCommentValue(commentValue) {
	/*
	Mask ignored comment regions with fixed-width sentinel characters before running replacement regexes. This keeps every index identical to the original comment for autofix, prevents custom replacements from treating masked regions as normal whitespace, and keeps region-level exclusions out of the per-match skip path. Only neighbor-sensitive cases such as filenames, paths, member access, and punctuation-adjacent matches remain match-local checks.
	*/
	const characters = Array.from({length: commentValue.length}, (_element, index) => commentValue[index]);

	maskFencedCodeBlocks(characters, commentValue);
	maskJsdocExamples(characters, commentValue);
	maskIgnoredLines(characters, commentValue);
	maskInlineCodeAndQuotedStrings(characters, commentValue);
	maskPattern(characters, commentValue, urlPattern);
	maskBareDomains(characters, commentValue);
	maskPattern(characters, commentValue, mimeTypePattern);
	maskPackageSpecifiers(characters, commentValue);
	maskMarkdownLinks(characters, commentValue);
	maskMarkupTags(characters, commentValue);

	return characters.join('');
}

function isPathLikeMatch(commentValue, match) {
	const previousCharacter = commentValue[match.index - 1] ?? '';
	const nextCharacter = commentValue[match.index + match[0].length] ?? '';
	const characterAfterNext = commentValue[match.index + match[0].length + 1] ?? '';
	const isBeforeFileExtension = nextCharacter === '.' && isIdentifierLikeCharacter(characterAfterNext);
	const isBeforePathWithFileExtension = nextCharacter === '/' && /\.[\p{Letter}\p{Number}_]/v.test(getPathTextAfterIndex(commentValue, match.index + match[0].length + 1));

	return (match[0].includes('.') && previousCharacter === '/')
		|| (previousCharacter === '/' && (nextCharacter === '/' || isBeforeFileExtension))
		|| isBeforePathWithFileExtension
		|| previousCharacter === '.'
		|| previousCharacter === '_'
		|| previousCharacter === '\\'
		|| nextCharacter === '_'
		|| nextCharacter === '\\'
		|| isBeforeFileExtension;
}

function isPropertyAccessMatch(commentValue, match) {
	const previousCharacter = commentValue[match.index - 1] ?? '';
	const characterBeforePrevious = commentValue[match.index - 2] ?? '';
	const nextCharacter = commentValue[match.index + match[0].length] ?? '';
	const line = getCommentLine(commentValue, match.index);
	const lineStart = commentValue.lastIndexOf('\n', match.index - 1) + 1;
	const indexInLine = match.index - lineStart;
	const lineBeforeMatch = line.slice(0, indexInLine);
	const lineAfterMatch = line.slice(indexInLine + match[0].length);
	const isMemberAccessProperty = !match[0].includes('.')
		&& /(?:^|[^\w$])[\w$]+\s*(?:\?\.|\.|\s+\.)\s*$/v.test(lineBeforeMatch)
		&& /^\s*(?:$|[\(.\[])/v.test(lineAfterMatch);
	const isMemberAccessObject = !match[0].includes('.')
		&& (dotMemberAccessAfterMatchPattern.test(lineAfterMatch)
			|| bracketMemberAccessAfterMatchPattern.test(lineAfterMatch)
			|| spacedBracketMemberAccessAfterMatchPattern.test(lineAfterMatch));

	return commentValue.slice(match.index - 2, match.index) === '?.'
		|| commentValue.slice(match.index + match[0].length, match.index + match[0].length + 2) === '?.'
		|| (previousCharacter === '[' && (isIdentifierLikeCharacter(characterBeforePrevious) || commentValue.slice(match.index - 3, match.index) === '?.['))
		|| nextCharacter === '['
		|| isMemberAccessProperty
		|| isMemberAccessObject;
}

function isMixedCase(text) {
	return text !== text.toLowerCase() && text !== text.toUpperCase();
}

function normalizeForCasingComparison(text) {
	return text.replaceAll(/[^\p{Letter}\p{Number}]/gv, '').toLowerCase();
}

function isCasingOnlyChange(value, replacement) {
	return normalizeForCasingComparison(value) === normalizeForCasingComparison(replacement);
}

function shouldSkipMatch(commentValue, match) {
	return isPathLikeMatch(commentValue, match)
		|| isPropertyAccessMatch(commentValue, match)
		|| commentValue[match.index - 1] === '-'
		|| commentValue[match.index + match[0].length] === '-'
		|| commentValue[match.index + match[0].length] === '(';
}

function getReplacementProblem(comment, sourceCode, replacements, checkUniformCase) {
	const valueStart = getCommentValueStart(comment, sourceCode);
	if (valueStart === undefined) {
		return;
	}

	let bestProblem;
	const searchableCommentValue = getSearchableCommentValue(comment.value);

	for (const replacement of replacements) {
		replacement.regex.lastIndex = 0;

		let match;
		while ((match = replacement.regex.exec(searchableCommentValue))) {
			if (match[0] === '') {
				replacement.regex.lastIndex++;
				continue;
			}

			if (match[0] === replacement.replacement) {
				continue;
			}

			if (match[0].includes(maskCharacter)) {
				continue;
			}

			// When `checkUniformCase` is `false`, casing-style replacements (the match and replacement are the same word in a different case) only re-case tokens that already mix upper- and lower-case, for example `Json` → `JSON`; all-lowercase and all-uppercase tokens are left alone, as their casing is often intentional. Replacements that change the actual letters (such as `application` → `app` or a custom typo fix) always apply.
			if (!checkUniformCase && isCasingOnlyChange(match[0], replacement.replacement) && !isMixedCase(match[0])) {
				continue;
			}

			if (shouldSkipMatch(comment.value, match)) {
				continue;
			}

			const start = valueStart + match.index;
			if (bestProblem && start >= bestProblem.replacementRange[0]) {
				break;
			}

			const end = start + match[0].length;
			bestProblem = {
				replacementRange: [start, end],
				value: match[0],
				replacement: replacement.replacement,
			};

			break;
		}
	}

	return bestProblem;
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {checkUniformCase = true} = context.options[0] ?? {};
	const replacements = prepareReplacements(context.options[0]);

	if (replacements.length === 0) {
		return;
	}

	let checked = false;

	onRoot(context, function * (node) {
		if (checked) {
			return;
		}

		checked = true;

		const {sourceCode} = context;
		const comments = getRuleComments(context);

		// Carry bracket depth across adjacent line comments so that a commented-out multi-line code construct spanning several `//` comments is not rewritten on its continuation lines.
		let continuationDepth = 0;
		let previousLineCommentRangeEnd;

		for (const comment of comments) {
			if (comment.type === 'Shebang' || isEslintDirective(context, comment)) {
				continuationDepth = 0;
				previousLineCommentRangeEnd = undefined;
				continue;
			}

			const range = sourceCode.getRange(comment);
			const isAdjacentLineComment = comment.type === 'Line'
				&& previousLineCommentRangeEnd !== undefined
				&& /^[^\S\n]*\n[^\S\n]*$/v.test(sourceCode.text.slice(previousLineCommentRangeEnd, range[0]));

			if (!isAdjacentLineComment) {
				continuationDepth = 0;
			}

			if (continuationDepth <= 0) {
				const problem = getReplacementProblem(comment, sourceCode, replacements, checkUniformCase);
				if (problem) {
					yield {
						node,
						loc: {
							start: sourceCode.getLocFromIndex(problem.replacementRange[0]),
							end: sourceCode.getLocFromIndex(problem.replacementRange[1]),
						},
						messageId: MESSAGE_ID,
						data: {
							value: problem.value,
							replacement: problem.replacement,
						},
						fix: fixer => fixer.replaceTextRange(problem.replacementRange, problem.replacement),
					};
				}
			}

			// Update continuation state for the next adjacent line comment.
			if (comment.type === 'Line') {
				continuationDepth = getNextBracketDepth(continuationDepth, comment.value);
				previousLineCommentRangeEnd = range[1];
			} else {
				continuationDepth = 0;
				previousLineCommentRangeEnd = undefined;
			}
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkUniformCase: {
				type: 'boolean',
				description: 'Whether to also re-case all-lowercase and all-uppercase tokens. When `false`, only tokens that already mix upper- and lower-case (for example, `Github`) are corrected.',
			},
			extendDefaultReplacements: {
				type: 'boolean',
				description: 'Whether to extend the default replacements.',
			},
			replacements: {
				type: 'object',
				propertyNames: {
					minLength: 1,
				},
				additionalProperties: {
					anyOf: [
						{
							enum: [
								false,
							],
						},
						{
							type: 'string',
							minLength: 1,
						},
						{
							type: 'object',
							required: [
								'replacement',
							],
							properties: {
								replacement: {
									type: 'string',
									minLength: 1,
								},
								caseSensitive: {
									type: 'boolean',
								},
							},
							additionalProperties: false,
						},
					],
				},
				description: 'Custom comment content replacements.',
			},
		},
	},
];

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce better comment content.',
			// TODO: Add back to `recommended` once the rule is more mature.
			recommended: false,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{checkUniformCase: true, extendDefaultReplacements: true, replacements: {}}],
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
