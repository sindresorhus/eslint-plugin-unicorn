import {ident} from '@eslint/css-tree';

const MESSAGE_ID_ERROR = 'no-duplicate-properties/error';
const MESSAGE_ID_SUGGESTION = 'no-duplicate-properties/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Duplicate property `{{property}}`. The first declaration is on line {{line}}.',
	[MESSAGE_ID_SUGGESTION]: 'Remove the duplicate declaration.',
};

const toAsciiLowerCase = value => value.replaceAll(/[A-Z]/g, character => character.toLowerCase());

const getPropertyKey = property => {
	const decodedProperty = ident.decode(property);
	return decodedProperty.startsWith('--')
		? decodedProperty
		: toAsciiLowerCase(decodedProperty);
};

const isLinebreakCharacter = character => '\n\f\r'.includes(character);
const isWhitespaceCharacter = character => ' \t\n\f\r'.includes(character);

const getLocationAfterText = (start, text) => {
	let {line, column} = start;
	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		if (!isLinebreakCharacter(character)) {
			column++;
			continue;
		}

		line++;
		column = 1;
		if (character === '\r' && text[index + 1] === '\n') {
			index++;
		}
	}

	return {line, column};
};

const getLineEnd = (text, index) => {
	while (index < text.length && !isLinebreakCharacter(text[index])) {
		index++;
	}

	return index;
};

const getLinebreakEnd = (text, index) => text[index] === '\r' && text[index + 1] === '\n'
	? index + 2
	: index + 1;

const getLineBounds = (text, index, line, lineBounds) => {
	let bounds = lineBounds.get(line);
	if (!bounds) {
		let lineStart = index;
		while (lineStart > 0 && !isLinebreakCharacter(text[lineStart - 1])) {
			lineStart--;
		}

		bounds = [lineStart, getLineEnd(text, index)];
		lineBounds.set(line, bounds);
	}

	return bounds;
};

const containsOnlyHorizontalWhitespace = (text, start, end) => {
	for (let index = start; index < end; index++) {
		if (text[index] !== ' ' && text[index] !== '\t') {
			return false;
		}
	}

	return true;
};

const hasCommentInRange = (commentRanges, [start, end]) => {
	let lowerIndex = 0;
	let upperIndex = commentRanges.length;

	while (lowerIndex < upperIndex) {
		const middleIndex = Math.floor((lowerIndex + upperIndex) / 2);
		if (commentRanges[middleIndex][0] < start) {
			lowerIndex = middleIndex + 1;
		} else {
			upperIndex = middleIndex;
		}
	}

	const commentRange = commentRanges[lowerIndex];
	return Boolean(commentRange && commentRange[0] < end && commentRange[1] <= end);
};

const wouldRetargetDisableNextLine = (location, removalRange, text, disableNextLineTargetLines) =>
	disableNextLineTargetLines.has(location.start.line)
	&& location.start.line !== location.end.line
	&& removalRange[1] < getLineEnd(text, removalRange[1]);

const getDeclarationRemovalRange = (declaration, sourceCode, lineBounds, disableNextLineTargetLines) => {
	const {text} = sourceCode;
	const location = sourceCode.getLoc(declaration);
	let [start, end] = sourceCode.getRange(declaration);
	let endLine = location.end.line;
	if (text[end] === ';') {
		end++;
	} else {
		while (end > start && isWhitespaceCharacter(text[end - 1])) {
			end--;
			if (
				isLinebreakCharacter(text[end])
				&& !(text[end] === '\r' && text[end + 1] === '\n')
			) {
				endLine--;
			}
		}
	}

	const [lineStart] = getLineBounds(text, start, location.start.line, lineBounds);
	const [, lineEnd] = getLineBounds(text, end, endLine, lineBounds);

	if (
		containsOnlyHorizontalWhitespace(text, lineStart, start)
		&& containsOnlyHorizontalWhitespace(text, end, lineEnd)
	) {
		let removalEnd = lineEnd;
		if (
			lineEnd < text.length
			&& !disableNextLineTargetLines.has(location.start.line)
		) {
			removalEnd = getLinebreakEnd(text, lineEnd);
		}

		return [lineStart, removalEnd];
	}

	while (text[end] === ' ' || text[end] === '\t') {
		end++;
	}

	if (end === lineEnd) {
		while (start > lineStart && (text[start - 1] === ' ' || text[start - 1] === '\t')) {
			start--;
		}
	}

	return [start, end];
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const lineBounds = new Map();
	const commentRanges = (sourceCode.comments ?? []).map(comment => sourceCode.getRange(comment));
	const disableNextLineTargetLines = new Set();
	for (const directive of sourceCode.getDisableDirectives().directives) {
		if (directive.type === 'disable-next-line') {
			disableNextLineTargetLines.add(sourceCode.getLoc(directive.node).end.line + 1);
		}
	}

	context.on('Block', function * (block) {
		const firstDeclarations = new Map();

		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const propertyKey = getPropertyKey(declaration.property);
			const firstDeclaration = firstDeclarations.get(propertyKey);
			if (!firstDeclaration) {
				firstDeclarations.set(propertyKey, declaration);
				continue;
			}

			const declarationLocation = sourceCode.getLoc(declaration);
			const removalRange = getDeclarationRemovalRange(declaration, sourceCode, lineBounds, disableNextLineTargetLines);
			const omitSuggestion = hasCommentInRange(commentRanges, removalRange)
				|| wouldRetargetDisableNextLine(declarationLocation, removalRange, sourceCode.text, disableNextLineTargetLines);
			yield {
				node: declaration,
				loc: {
					start: declarationLocation.start,
					end: getLocationAfterText(declarationLocation.start, declaration.property),
				},
				messageId: MESSAGE_ID_ERROR,
				data: {
					property: declaration.property,
					line: String(sourceCode.getLoc(firstDeclaration).start.line),
				},
				suggest: omitSuggestion
					? []
					: [
						{
							messageId: MESSAGE_ID_SUGGESTION,
							fix: fixer => fixer.removeRange(removalRange),
						},
					],
			};
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow duplicate properties within CSS declaration blocks.',
			recommended: false,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
