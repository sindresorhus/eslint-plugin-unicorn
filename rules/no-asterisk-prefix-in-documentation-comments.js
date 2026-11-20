import {
	getComments,
	getCommentRange,
	getLinePrefix,
	linebreakPattern,
	onRoot,
	reindentText,
} from './utils/index.js';

const MESSAGE_ID = 'no-asterisk-prefix-in-documentation-comments';
const messages = {
	[MESSAGE_ID]: 'Remove asterisk prefixes and shared indentation from this comment.',
};

// A line with only whitespace or the closing delimiter
const isBlankLine = line => /^[\t ]*(?:\*\/)?$/v.test(line);

const getFixedCommentText = (text, linePrefix, isJavaScriptComment) => {
	const lines = text.split(linebreakPattern);

	// Changes to the last line can activate or deactivate a TypeScript suppression directive.
	if (isJavaScriptComment && /@ts-(?:expect-error|ignore)/v.test(lines.at(-1))) {
		return text;
	}

	const prefixIndentations = new Set(lines.slice(1)
		.filter(line => !isBlankLine(line))
		.map(line => {
			const indentation = /^([\t ]+)\*/v.exec(line)?.[1];
			return indentation?.startsWith(linePrefix) && indentation.length > linePrefix.length ? indentation : undefined;
		}));

	// When asterisk prefixes are inconsistent, the asterisks may be content, like the indented Markdown list markers left by a previous fix.
	if (prefixIndentations.size > 1) {
		return text;
	}

	const [prefixIndentation] = prefixIndentations;
	let fixedText = text;

	if (prefixIndentation !== undefined) {
		const [linebreak] = text.match(linebreakPattern);
		fixedText = text
			.replaceAll(/^[\t ]+\*(?!\/)[\t ]?/gmv, () => linePrefix)
			// Documentation parsers can consume a leading asterisk as decoration on a continuation line.
			.replace(/^(\/\*\*?!?)[\t ]+(?=[^\s*])/v, (_, openingDelimiter) => `${openingDelimiter}${linebreak}${linePrefix}`)
			.replace(/(?<=\S)[\t ]+\*\/$/v, () => `${linebreak}${linePrefix}*/`);
	}

	fixedText = fixedText.replace(/^([\t ]*)\*\/$/mv, (line, indentation) => (
		prefixIndentation !== undefined || (indentation.length > linePrefix.length && indentation.startsWith(linePrefix))
			? `${linePrefix}*/`
			: line
	));

	let sharedIndentation;

	for (const line of fixedText.split(linebreakPattern).slice(1)) {
		if (isBlankLine(line)) {
			continue;
		}

		const indentation = /^[\t ]*/v.exec(line)[0];
		sharedIndentation ??= indentation;

		const maximumSharedLength = Math.min(indentation.length, sharedIndentation.length);
		let sharedLength = 0;
		while (sharedLength < maximumSharedLength && indentation[sharedLength] === sharedIndentation[sharedLength]) {
			sharedLength++;
		}

		sharedIndentation = sharedIndentation.slice(0, sharedLength);
	}

	if (sharedIndentation?.startsWith(linePrefix) && sharedIndentation.length > linePrefix.length) {
		return reindentText(fixedText, sharedIndentation, linePrefix);
	}

	return fixedText;
};

const getProblem = (context, comment) => {
	const {sourceCode} = context;
	const range = getCommentRange(context, comment);
	const text = sourceCode.text.slice(...range);
	const isJavaScriptComment = comment.type === 'Block' && sourceCode.ast.type === 'Program';
	const isJavaScriptDocumentationComment = text.startsWith('/**') && text[3] !== '*';

	if (!text.startsWith('/*') || (isJavaScriptComment && !isJavaScriptDocumentationComment) || !linebreakPattern.test(text)) {
		return;
	}

	const linePrefix = getLinePrefix(context, range[0]);

	if (!/^[\t ]*$/v.test(linePrefix)) {
		return;
	}

	const fixedText = getFixedCommentText(text, linePrefix, isJavaScriptComment);

	if (text === fixedText) {
		return;
	}

	return {
		node: comment,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(range, fixedText),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	onRoot(context, function * () {
		for (const comment of getComments(context)) {
			const problem = getProblem(context, comment);

			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'layout',
		docs: {
			description: 'Disallow asterisk prefixes and shared indentation in multiline comments.',
			recommended: true,
		},
		fixable: 'whitespace',
		schema: [],
		messages,
		languages: [
			'js/js',
			'css/css',
			'json/json',
			'json/jsonc',
			'json/json5',
			'soml/soml',
		],
	},
};

export default config;
