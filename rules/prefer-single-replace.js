import regjsparser from 'regjsparser';
import {isMethodCall, isStringLiteral, isRegexLiteral} from './ast/index.js';
import {getParenthesizedText} from './utils/index.js';

const {parse: parseRegExp} = regjsparser;

const MESSAGE_ID = 'prefer-single-replace';
const messages = {
	[MESSAGE_ID]: 'Combine these single-character replacements into a single `replaceAll()` with a regular expression.',
};

// `i`/`y` change matching, `u`/`v` change escape and class semantics. `m`/`s` only affect `^`/`$`/`.`, so they are irrelevant to a single literal character and safe to drop.
const safeRegexFlags = new Set(['g', 'm', 's']);

// Characters that are always special inside a character class, plus line terminators (a raw line terminator is a syntax error in a regex literal).
const characterClassEscapes = new Map([
	['\\', String.raw`\\`],
	[']', String.raw`\]`],
	['\n', String.raw`\n`],
	['\r', String.raw`\r`],
	['\t', String.raw`\t`],
	['\f', String.raw`\f`],
	['\v', String.raw`\v`],
	['\u2028', String.raw`\u2028`],
	['\u2029', String.raw`\u2029`],
]);

// Escapes a single character for use inside a character class. `^` and `-` are only special depending on position, so they are escaped only when necessary (avoids tripping `no-useless-escape` on the output).
function escapeCharacterClassCharacter(character, isFirst, isLast) {
	if (characterClassEscapes.has(character)) {
		return characterClassEscapes.get(character);
	}

	// `^` is only special as the first character (negation).
	if (character === '^') {
		return isFirst ? String.raw`\^` : '^';
	}

	// `-` denotes a range unless it is the first or last character.
	if (character === '-') {
		return isFirst || isLast ? '-' : String.raw`\-`;
	}

	const codePoint = character.codePointAt(0);
	if (codePoint < 0x20 || codePoint === 0x7F) {
		return String.raw`\x${codePoint.toString(16).toUpperCase().padStart(2, '0')}`;
	}

	return character;
}

// Returns the single literal character a regex node matches, or `undefined`.
function getRegexCharacter(node) {
	if (node.type === 'value') {
		return String.fromCodePoint(node.codePoint);
	}

	if (node.type === 'alternative' && node.body.length === 1) {
		return getRegexCharacter(node.body[0]);
	}

	if (
		node.type === 'characterClass'
		&& !node.negative
		&& node.body.length === 1
	) {
		return getRegexCharacter(node.body[0]);
	}
}

function getRegexLiteralCharacter({pattern, flags}) {
	if (!flags.includes('g')) {
		return;
	}

	for (const flag of flags) {
		if (!safeRegexFlags.has(flag)) {
			return;
		}
	}

	let tree;
	try {
		tree = parseRegExp(pattern, flags, {namedGroups: true, lookbehind: true});
	} catch {
		// Invalid regular expression.
		return;
	}

	return getRegexCharacter(tree);
}

// Returns the single character a `replace`/`replaceAll` call globally replaces, or `undefined`.
function getCharacter(call) {
	if (!isMethodCall(call, {
		methods: ['replace', 'replaceAll'],
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})) {
		return;
	}

	const [search] = call.arguments;

	if (isStringLiteral(search)) {
		// `String#replace()` with a string only replaces the first occurrence, so it has no character-class equivalent.
		if (call.callee.property.name !== 'replaceAll') {
			return;
		}

		// A single UTF-16 code unit, so it is safe inside a non-`u` character class.
		return search.value.length === 1 ? search.value : undefined;
	}

	if (isRegexLiteral(search)) {
		return getRegexLiteralCharacter(search.regex);
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (getCharacter(node) === undefined) {
			return;
		}

		const replacement = node.arguments[1];
		if (!isStringLiteral(replacement)) {
			return;
		}

		const replacementValue = replacement.value;

		// `$\`` (prematch) and `$'` (postmatch) depend on the surrounding text, which differs once the sequential passes are merged into one.
		if (replacementValue.includes('$`') || replacementValue.includes('$\'')) {
			return;
		}

		const isMergeableCall = call =>
			getCharacter(call) !== undefined
			&& isStringLiteral(call.arguments[1])
			&& call.arguments[1].value === replacementValue;

		// Report only at the outermost call of a same-replacement chain.
		const {parent} = node;
		if (
			parent.type === 'MemberExpression'
			&& parent.object === node
			&& parent.parent.type === 'CallExpression'
			&& parent.parent.callee === parent
			&& isMergeableCall(parent.parent)
		) {
			return;
		}

		const characters = [];
		let current = node;
		while (isMergeableCall(current)) {
			characters.push(getCharacter(current));
			current = current.callee.object;
		}

		if (characters.length < 2) {
			return;
		}

		const baseReceiver = current;

		characters.reverse();
		const uniqueCharacters = [...new Set(characters)];

		// Collapsing sequential passes into one is only equivalent when the replacement does not reintroduce a searched character (e.g. `replaceAll('a', 'ab').replaceAll('b', 'ab')`).
		if (uniqueCharacters.some(character => replacementValue.includes(character))) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		// Replacing the whole chain would drop any comments inside it.
		if (sourceCode.getCommentsInside(node).length === 0) {
			const characterClass = uniqueCharacters
				.map((character, index) => escapeCharacterClassCharacter(character, index === 0, index === uniqueCharacters.length - 1))
				.join('');
			const base = getParenthesizedText(baseReceiver, context);
			const replacementText = getParenthesizedText(replacement, context);

			problem.fix = fixer => fixer.replaceText(node, `${base}.replaceAll(/[${characterClass}]/g, ${replacementText})`);
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce combining multiple single-character replacements into a single `String#replaceAll()` with a regular expression.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
