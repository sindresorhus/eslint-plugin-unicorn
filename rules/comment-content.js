import {getComments, isEslintDisableOrEnableDirective, onRoot} from './utils/index.js';

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
	'\\bapplication\\b': 'app',
	'\\bapplications\\b': 'apps',
	'\\bbitcoin\\b': caseInsensitive('Bitcoin'),
	'\\bcss\\b': caseInsensitive('CSS'),
	'\\bdevops\\b': caseInsensitive('DevOps'),
	'\\bdiscord\\b': caseInsensitive('Discord'),
	'\\beslint(?:\\.js)?\\b': caseInsensitive('ESLint'),
	'\\bfacebook\\b': caseInsensitive('Facebook'),
	'\\bgithub\\b': caseInsensitive('GitHub'),
	'\\bgrunt(?:\\.js)?\\b': caseInsensitive('Grunt'),
	'\\bgulp(?:\\.js)?\\b': caseInsensitive('Gulp'),
	'\\bhtml\\b': caseInsensitive('HTML'),
	'\\bhttps\\b': caseInsensitive('HTTPS'),
	'\\bhttp\\b': caseInsensitive('HTTP'),
	'\\bios\\b': caseInsensitive('iOS'),
	'\\bjavascript\\b': caseInsensitive('JavaScript'),
	'\\bjpeg\\b': caseInsensitive('JPEG'),
	'\\bjpg\\b': caseInsensitive('JPG'),
	'\\bjquery\\b': caseInsensitive('jQuery'),
	'\\bnode\\.?js\\b': caseInsensitive('Node.js'),
	'\\bnpm\\b': caseInsensitive('npm'),
	'\\bpng\\b': caseInsensitive('PNG'),
	'\\breact(?:\\.?js)?\\b': caseInsensitive('React'),
	'\\breddit\\b': caseInsensitive('Reddit'),
	'\\bstack\\s?overflow\\b': caseInsensitive('Stack Overflow'),
	'\\bsvg\\b': caseInsensitive('SVG'),
	'\\btwitch(?:tv)?\\b': caseInsensitive('Twitch'),
	'\\btypescript\\b': caseInsensitive('TypeScript'),
	'\\burl\\b': caseInsensitive('URL'),
	'\\bvue(?:\\.?js)?\\b': caseInsensitive('Vue.js'),
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
		pattern,
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
		&& isEslintDisableOrEnableDirective(context, comment);
}

function shouldUseRawCommentFallback(context) {
	const filename = context.physicalFilename.toLowerCase();

	return filename.endsWith('.jsonc')
		|| filename.endsWith('.json5')
		|| filename.endsWith('.md')
		|| filename.endsWith('.markdown');
}

function getRawComments(sourceCode) {
	const comments = [];
	const {text} = sourceCode;
	let quote;

	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		const nextCharacter = text[index + 1];

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

		if (character === '"' || character === '\'' || character === '`') {
			quote = character;
			continue;
		}

		if (character === '/' && nextCharacter === '/') {
			const end = text.indexOf('\n', index + 2);
			const range = [index, end === -1 ? text.length : end];
			comments.push({
				type: 'Line',
				value: text.slice(index + 2, range[1]),
				range,
			});
			index = range[1];
			continue;
		}

		if (character === '/' && nextCharacter === '*') {
			const end = text.indexOf('*/', index + 2);
			const range = [index, end === -1 ? text.length : end + 2];
			comments.push({
				type: 'Block',
				value: text.slice(index + 2, range[1] - 2),
				range,
			});
			index = range[1] - 1;
		}

		if (character === '<' && text.startsWith('<!--', index)) {
			const end = text.indexOf('-->', index + 4);
			const range = [index, end === -1 ? text.length : end + 3];
			comments.push({
				type: 'Block',
				value: text.slice(index + 4, range[1] - 3),
				range,
			});
			index = range[1] - 1;
		}
	}

	return comments;
}

function normalizeComment(comment, sourceCode) {
	if (typeof comment.value === 'string') {
		return comment;
	}

	const range = sourceCode.getRange(comment);
	const text = sourceCode.text.slice(...range);

	if (text.startsWith('//')) {
		return {
			...comment,
			type: 'Line',
			value: text.slice(2),
			range,
		};
	}

	if (text.startsWith('/*')) {
		return {
			...comment,
			type: 'Block',
			value: text.slice(2, -2),
			range,
		};
	}

	return comment;
}

function getRuleComments(context) {
	const commentsFromHelper = getComments(context);
	const comments = (commentsFromHelper.length > 0 ? commentsFromHelper : context.sourceCode.comments ?? [])
		.map(comment => normalizeComment(comment, context.sourceCode));

	if (comments.length > 0 || !shouldUseRawCommentFallback(context)) {
		return comments;
	}

	return getRawComments(context.sourceCode);
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

const urlPattern = /\bhttps?:\/\/|www\./iv;
const codeCharacters = ['`', '{', '}', '(', ')', '[', ']'];
const shouldSkipComment = comment =>
	urlPattern.test(comment.value)
	|| codeCharacters.some(character => comment.value.includes(character));

function getReplacementProblem(comment, sourceCode, replacements) {
	if (shouldSkipComment(comment)) {
		return;
	}

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

			const start = valueStart + match.index;
			const end = start + match[0].length;

			if (bestProblem && start >= bestProblem.replacementRange[0]) {
				break;
			}

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
