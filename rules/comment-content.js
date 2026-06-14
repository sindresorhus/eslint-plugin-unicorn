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

function isInFencedCodeBlock(text, index, {allowIndented = false} = {}) {
	const fencePattern = allowIndented
		? /^[\t ]*(?:\*\s?)?(?<fence>`{3,}|~{3,})/gmv
		: /^ {0,3}(?<fence>`{3,}|~{3,})/gmv;
	let activeFence;

	for (const {groups} of text.slice(0, index).matchAll(fencePattern)) {
		const {fence} = groups;

		if (!activeFence) {
			activeFence = {
				character: fence[0],
				size: fence.length,
			};
			continue;
		}

		if (fence[0] === activeFence.character && fence.length >= activeFence.size) {
			activeFence = undefined;
		}
	}

	return Boolean(activeFence);
}

function getMarkdownHtmlComments(sourceCode) {
	const comments = [];
	const {text} = sourceCode;

	for (let index = 0; index < text.length; index++) {
		if (!text.startsWith('<!--', index)) {
			continue;
		}

		if (isInFencedCodeBlock(text, index)) {
			continue;
		}

		const end = text.indexOf('-->', index + 4);
		const range = [index, end === -1 ? text.length : end + 3];
		comments.push({
			type: 'Block',
			value: text.slice(index + 4, range[1] - 3),
			range,
		});
		index = range[1] - 1;
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

const urlPattern = /\b(?:[a-z][\d+\-.a-z]*:\/\/|www\.)\S+|\b[\u{2D}0-9a-z]+\.(?!js\b)[a-z]{2,}(?:\.[a-z]{2,})?\b/giv;
const mimeTypePattern = /\b(?:application|audio|font|image|message|model|multipart|text|video)\/[\da-z][\d+\-.a-z]*\b/giv;
const codeLikeLineStartPattern = /^(?:import|export|const|let|var|type|interface|class|function|return|await|throw)\b/v;
const controlFlowLikeLineStartPattern = /^(?:(?:if|for|while|switch|catch)\s*\(|else(?:\s+if\s*\(|\s*(?:\{|$))|(?:try|do|finally)\s*(?:\{|$)|(?:case\b[^:]+|default\s*):)/v;
const bracketMemberAccessLinePattern = /^(?:[\w$]+:\s*)?[\w$]+(?:(?:\??\.\s*)?\[[^\]]+\](?:\s*\.[\w$]|\s*$)|\s+\[[^\]]+\]\s*\.[\w$])/v;
const chainedBracketMemberAccessLinePattern = /^(?:[\w$]+:\s*)?[$_a-z][\w$]*\s*(?:\??\.\s*)?\[[^\]]+\]\s*\[[^\]]+\]\s*$/v;
const markdownInlineLinkPattern = /(?:^|[\s\(])\[[^\]]+\]\([^\)]+\)/gv;
const markdownLinkPattern = /(?:^|[\s\(])\[[^\]]+\](?::\s*\S+(?:\s+(?:"[^"]*"|'[^']*'|\([^\)]+\)))?|(?:\[[^\]]+\])+|\([^\)]+\))/gv;
const memberCallLinePattern = /^(?:[*+\-]|\d+\.)?\s*(?:\(\s*)?(?:(?:[\w$]+:|[\w$]+\s*=)\s*)?[\w$]+\s*(?:(?:(?:\?\.|\.)\s*[\w$]+|\??\.\s*\[[^\]]+\])\s*(?:\?\.\s*)?\(|\s*\[[^\]]+\]\()/v;
const shellPromptLinePattern = /^(?:[*+\-]|\d+\.)?\s*\$\s+\S+/v;
const secondaryShellPromptLinePattern = /^(?:[*+\-]|\d+\.)?\s*>\s*(?:bun|curl|deno|docker|git|node(?:js)?|npm|npx|pnpm|yarn)\b/v;
const listMarkerPattern = /^(?:[*+\-]|\d+\.)\s*/v;
const dotMemberAccessAfterMatchPattern = /^(?:\?\.|\.|\s+\.)\s*[\w$]+(?:\s*(?:\[|\.[\w$]|\()|\s*$)/v;
const bracketMemberAccessAfterMatchPattern = /^(?:\?\.\s*)?\[[^\]]+\](?:\s*(?:\[|\.[\w$]|\()|\s*$)/v;
const spacedBracketMemberAccessAfterMatchPattern = /^\s+\[[^\]]+\]\s*(?:\[|\.[\w$])/v;
const pathTerminatorCharacters = '"\'`<>';
const packageSpecifierTerminatorCharacters = '"\'`()[]{}<>,';
const maskCharacter = '\uFFFF';

function isIdentifierLikeCharacter(character) {
	return Boolean(character) && /[\p{Letter}\p{Number}_]/v.test(character);
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

function maskBackticks(characters, text) {
	let openingDelimiter;

	for (const delimiter of text.matchAll(/`+/gv)) {
		const start = delimiter.index;
		const end = start + delimiter[0].length;

		if (!openingDelimiter) {
			openingDelimiter = {
				start,
				end,
				size: delimiter[0].length,
			};
			continue;
		}

		if (delimiter[0].length !== openingDelimiter.size) {
			continue;
		}

		maskRange(characters, openingDelimiter.start, end);
		openingDelimiter = undefined;
	}
}

function maskQuotedStrings(characters, text) {
	let quote;
	let quoteStart;

	for (let index = 0; index < text.length; index++) {
		const character = text[index];

		if (character === '\\') {
			index++;
			continue;
		}

		if (quote) {
			if (character === quote) {
				maskRange(characters, quoteStart, index + 1);
				quote = undefined;
				quoteStart = undefined;
			}

			continue;
		}

		if (character === '"') {
			quote = character;
			quoteStart = index;
			continue;
		}

		if (character === '\'' && !isIdentifierLikeCharacter(text[index - 1])) {
			quote = character;
			quoteStart = index;
		}
	}

	if (quoteStart !== undefined) {
		maskRange(characters, quoteStart, text.length);
	}
}

function getCommentLine(commentValue, index) {
	const start = commentValue.lastIndexOf('\n', index - 1) + 1;
	const end = commentValue.indexOf('\n', index);

	return commentValue.slice(start, end === -1 ? commentValue.length : end);
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

function getPackageSpecifierText(commentValue, match) {
	let start = match.index;
	let end = match.index + match[0].length;

	while (start > 0 && !isPackageSpecifierTerminator(commentValue[start - 1])) {
		start--;
	}

	while (end < commentValue.length && !isPackageSpecifierTerminator(commentValue[end])) {
		end++;
	}

	return commentValue.slice(start, end);
}

function isSlashPairProse(text) {
	const parts = text.replace(/[!.?]$/v, '').split('/');

	if (parts.length !== 2) {
		return false;
	}

	return parts.every(part => defaultReplacementTermPatterns.some(pattern => pattern.test(part)));
}

function isPackageSpecifierMatch(commentValue, match) {
	const text = getPackageSpecifierText(commentValue, match);

	return text.includes('/')
		&& !text.includes('://')
		&& !isSlashPairProse(text)
		&& /^(?:@[\w\-.]+(?:\/[\w\-.]+)+(?:[#?@][\w\-.]+)?|[\w\-.]+\/[\w\-.]+(?:[#?@][\w\-.]+|(?:\/[\w\-.]+)+)?)$/v.test(text);
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
	const inner = text.slice(1, -1);

	for (const character of inner) {
		if (character === open || character === close) {
			return false;
		}
	}

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
	if (line.endsWith(',')) {
		line = line.slice(0, -1).trimEnd();
	}

	if (!isSimpleWrappedValue(line, '{', '}')) {
		return false;
	}

	const [key, value] = line.slice(1, -1).split(':');

	return key.trim() !== '' && value !== undefined && value.trim() !== '';
}

function isIgnoredCommentLine(line) {
	line = cleanCommentLine(line);

	return codeLikeLineStartPattern.test(line)
		|| controlFlowLikeLineStartPattern.test(line)
		|| bracketMemberAccessLinePattern.test(line)
		|| chainedBracketMemberAccessLinePattern.test(line)
		|| isCommandLine(line)
		|| isStructuredKeyValueLine(line)
		|| isObjectLiteralLine(line)
		|| /;\s*$/v.test(line)
		|| line.includes('=>')
		|| memberCallLinePattern.test(removeMarkdownInlineLinks(line));
}

function maskIgnoredLines(characters, text) {
	let start = 0;

	while (start < text.length) {
		const lineEnd = text.indexOf('\n', start);
		const end = lineEnd === -1 ? text.length : lineEnd;

		if (isIgnoredCommentLine(text.slice(start, end))) {
			maskRange(characters, start, end);
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
			const lineEnd = text.indexOf('\n', index);
			const end = lineEnd === -1 ? text.length : lineEnd;

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
		const lineEnd = text.indexOf('\n', lineStart);
		const end = lineEnd === -1 ? text.length : lineEnd;
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

		const tagEnd = text.indexOf('>', tagStart + 1);
		if (tagEnd === -1) {
			break;
		}

		if (/^<\/?[a-z][\w\-:]*(?:\s|\/?>)/iv.test(text.slice(tagStart, tagEnd + 1))) {
			maskRange(characters, tagStart, tagEnd + 1);
		}

		start = tagEnd + 1;
	}
}

function getSearchableCommentValue(commentValue) {
	/*
	Mask ignored comment regions with fixed-width sentinel characters before running replacement regexes. This keeps every index identical to the original comment for autofix, prevents custom replacements from treating masked regions as normal whitespace, and keeps region-level exclusions out of the per-match skip path. Only neighbor-sensitive cases such as filenames, paths, package specifiers, slash pairs, member access, and punctuation-adjacent matches remain match-local checks.
	*/
	const characters = Array.from({length: commentValue.length}, (_element, index) => commentValue[index]);

	maskFencedCodeBlocks(characters, commentValue);
	maskJsdocExamples(characters, commentValue);
	maskBackticks(characters, commentValue);
	maskQuotedStrings(characters, commentValue);
	maskPattern(characters, commentValue, urlPattern);
	maskPattern(characters, commentValue, mimeTypePattern);
	maskPattern(characters, commentValue, markdownLinkPattern);
	maskMarkupTags(characters, commentValue);
	maskIgnoredLines(characters, commentValue);

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

function shouldSkipMatch(commentValue, match) {
	return isPathLikeMatch(commentValue, match)
		|| isPackageSpecifierMatch(commentValue, match)
		|| isPropertyAccessMatch(commentValue, match)
		|| commentValue[match.index - 1] === '-'
		|| commentValue[match.index + match[0].length] === '-'
		|| commentValue[match.index + match[0].length] === '(';
}

function getReplacementProblem(comment, sourceCode, replacements) {
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

		for (const comment of comments) {
			if (comment.type === 'Shebang' || isEslintDirective(context, comment)) {
				continue;
			}

			const problem = getReplacementProblem(comment, sourceCode, replacements);
			if (!problem) {
				continue;
			}

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
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
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
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{extendDefaultReplacements: true, replacements: {}}],
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
