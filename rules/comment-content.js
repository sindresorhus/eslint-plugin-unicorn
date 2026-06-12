import {getComments, isEslintDisableOrEnableDirective, normalizeComment, onRoot} from './utils/index.js';

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

function isInMarkdownFencedCodeBlock(text, index) {
	const fencePattern = /^ {0,3}(?<fence>`{3,}|~{3,})/gmv;
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

		if (isInMarkdownFencedCodeBlock(text, index)) {
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
		.map(comment => normalizeComment(comment, context.sourceCode));

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

function isInsideUrl(commentValue, match) {
	urlPattern.lastIndex = 0;

	for (const urlMatch of commentValue.matchAll(urlPattern)) {
		const start = urlMatch.index;
		const end = start + urlMatch[0].length;

		if (match.index >= start && match.index < end) {
			return true;
		}
	}

	return false;
}

function isInsideBackticks(commentValue, match) {
	let start = commentValue.indexOf('`');

	while (start !== -1) {
		const end = commentValue.indexOf('`', start + 1);
		if (end === -1) {
			return false;
		}

		if (match.index > start && match.index < end) {
			return true;
		}

		start = commentValue.indexOf('`', end + 1);
	}

	return false;
}

function isInsideQuotedString(commentValue, match) {
	let quote;

	for (let index = 0; index < match.index; index++) {
		const character = commentValue[index];

		if (character === '\\') {
			index++;
			continue;
		}

		if (quote) {
			if (character === quote) {
				quote = undefined;
			}

			continue;
		}

		if (character === '"') {
			quote = character;
			continue;
		}

		if (character === '\'' && !/[\p{Letter}\p{Number}_]/v.test(commentValue[index - 1])) {
			quote = character;
		}
	}

	return Boolean(quote);
}

function isInsideMimeType(commentValue, match) {
	mimeTypePattern.lastIndex = 0;

	for (const mimeTypeMatch of commentValue.matchAll(mimeTypePattern)) {
		const start = mimeTypeMatch.index;
		const end = start + mimeTypeMatch[0].length;

		if (match.index >= start && match.index < end) {
			return true;
		}
	}

	return false;
}

function shouldSkipMatch(commentValue, match) {
	return isInsideUrl(commentValue, match)
		|| isInsideBackticks(commentValue, match)
		|| isInsideQuotedString(commentValue, match)
		|| isInsideMimeType(commentValue, match)
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

	for (const replacement of replacements) {
		replacement.regex.lastIndex = 0;

		let match;
		while ((match = replacement.regex.exec(comment.value))) {
			if (match[0] === '') {
				replacement.regex.lastIndex++;
				continue;
			}

			if (match[0] === replacement.replacement) {
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
