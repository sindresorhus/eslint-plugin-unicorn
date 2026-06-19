import {
	isMethodCall,
	isRegexLiteral,
	isStringLiteral,
} from '../ast/index.js';

const REGEXP_ESCAPE_FLAGS = 'g';
const REGEXP_ESCAPE_REPLACEMENT = String.raw`\$&`;
const MINIMUM_REGEXP_ESCAPE_CHARACTER_COUNT = 8;
const REGEXP_ESCAPE_CHARACTERS = new Set(String.raw`\^$.*+?()[]{}|/-`);

const getCharacterClassCharacters = pattern => {
	if (!pattern.startsWith('[') || !pattern.endsWith(']') || pattern.startsWith('[^')) {
		return;
	}

	const characters = new Set();
	const characterClass = pattern.slice(1, -1);

	for (let index = 0; index < characterClass.length; index++) {
		let character = characterClass[index];
		let escaped = false;

		if (character === '\\') {
			index++;
			character = characterClass[index];
			escaped = true;

			if (!character) {
				return;
			}
		}

		if (
			character === '-'
			&& !escaped
			&& index !== 0
			&& index !== characterClass.length - 1
		) {
			return;
		}

		if (
			character === ']'
			&& !escaped
			&& index !== 0
		) {
			return;
		}

		if (!REGEXP_ESCAPE_CHARACTERS.has(character)) {
			return;
		}

		characters.add(character);
	}

	return characters;
};

const isRegExpEscapePattern = node =>
	isRegexLiteral(node)
	&& node.regex.flags.includes(REGEXP_ESCAPE_FLAGS)
	&& !node.regex.flags.includes('y')
	&& getCharacterClassCharacters(node.regex.pattern)?.size >= MINIMUM_REGEXP_ESCAPE_CHARACTER_COUNT;

const isRegExpEscapeReplacement = node =>
	isStringLiteral(node)
	&& node.value === REGEXP_ESCAPE_REPLACEMENT;

const isRegExpEscapeReplaceCall = node =>
	isMethodCall(node, {
		method: 'replace',
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	&& isRegExpEscapePattern(node.arguments[0])
	&& isRegExpEscapeReplacement(node.arguments[1]);

export {isRegExpEscapeReplaceCall};
