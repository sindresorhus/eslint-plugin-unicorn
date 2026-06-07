import {getStaticValue} from '@eslint-community/eslint-utils';
import regjsparser from 'regjsparser';
import {
	isRegexLiteral,
	isNewExpression,
	isMethodCall,
	isStringLiteral,
} from './ast/index.js';
import {escapeString, getParenthesizedText} from './utils/index.js';

const {parse: parseRegExp} = regjsparser;
const MESSAGE_ID_USE_REPLACE_ALL = 'method';
const MESSAGE_ID_USE_STRING = 'pattern';
const MESSAGE_ID_USE_REPLACE_ALL_OVER_SPLIT_JOIN = 'split-join';
const messages = {
	[MESSAGE_ID_USE_REPLACE_ALL]: 'Prefer `String#replaceAll()` over `String#replace()`.',
	[MESSAGE_ID_USE_STRING]: 'This pattern can be replaced with {{replacement}}.',
	[MESSAGE_ID_USE_REPLACE_ALL_OVER_SPLIT_JOIN]: 'Prefer `String#replaceAll()` over `String#split().join()`.',
};

const QUOTE = '\'';
const zeroLengthRegExpNodeTypes = new Set([
	'anchor',
	'reference',
]);

function getPatternReplacement(node) {
	if (!isRegexLiteral(node)) {
		return;
	}

	const {pattern, flags} = node.regex;
	if (flags.replace('u', '').replace('v', '') !== 'g') {
		return;
	}

	const tree = parseRegExpLiteral(node);
	if (!tree) {
		return;
	}

	const parts = tree.type === 'alternative' ? tree.body : [tree];
	if (parts.some(part => part.type !== 'value')) {
		return;
	}

	return QUOTE
		+ parts.map(part => {
			const {kind, codePoint, raw} = part;

			if (kind === 'controlLetter') {
				if (codePoint === 13) {
					return String.raw`\r`;
				}

				if (codePoint === 10) {
					return String.raw`\n`;
				}

				if (codePoint === 9) {
					return String.raw`\t`;
				}

				return String.raw`\u{${codePoint.toString(16)}}`;
			}

			if (kind === 'octal') {
				return String.raw`\u{${codePoint.toString(16)}}`;
			}

			let character = raw;
			if (kind === 'identifier') {
				character = character.slice(1);
			}

			if (character === QUOTE || character === '\\') {
				return `\\${character}`;
			}

			return character;
		}).join('')
		+ QUOTE;
}

const isRegExpWithGlobalFlag = (node, scope) => {
	if (isRegexLiteral(node)) {
		return node.regex.flags.includes('g');
	}

	if (
		isNewExpression(node, {name: 'RegExp'})
		&& node.arguments[0]?.type !== 'SpreadElement'
		&& node.arguments[1]?.type === 'Literal'
		&& typeof node.arguments[1].value === 'string'
	) {
		return node.arguments[1].value.includes('g');
	}

	const staticResult = getStaticValue(node, scope);

	// Don't know if there is `g` flag
	if (!staticResult) {
		return false;
	}

	const {value} = staticResult;
	return (
		Object.prototype.toString.call(value) === '[object RegExp]'
		&& value.global
	);
};

const parseRegExpLiteral = node => {
	const {pattern, flags} = node.regex;

	try {
		return parseRegExp(pattern, flags, {
			unicodePropertyEscape: flags.includes('u'),
			unicodeSet: flags.includes('v'),
			namedGroups: true,
			lookbehind: true,
		});
	} catch {}
};

const getBodyMinimumLength = body => {
	let length = 0;

	for (const node of body) {
		length += getMinimumConsumedLength(node);
	}

	return length;
};

function getMinimumConsumedLength(node) {
	if (zeroLengthRegExpNodeTypes.has(node.type)) {
		return 0;
	}

	if (
		[
			'value',
			'dot',
			'characterClass',
			'characterClassEscape',
			'unicodePropertyEscape',
		].includes(node.type)
	) {
		return 1;
	}

	if (node.type === 'alternative') {
		return getBodyMinimumLength(node.body);
	}

	if (node.type === 'disjunction') {
		return Math.min(...node.body.map(node => getMinimumConsumedLength(node)));
	}

	if (node.type === 'quantifier') {
		return node.min * getBodyMinimumLength(node.body);
	}

	if (node.type === 'group') {
		return node.behavior === 'ignore' ? getBodyMinimumLength(node.body) : 0;
	}

	return 0;
}

const hasCapturingGroup = node => {
	if (node.type === 'group' && node.behavior === 'normal') {
		return true;
	}

	return Array.isArray(node.body) && node.body.some(node => hasCapturingGroup(node));
};

const getRegExpLiteralWithGlobalFlag = node => {
	if (
		!isRegexLiteral(node)
		|| node.regex.flags.includes('y')
	) {
		return;
	}

	const tree = parseRegExpLiteral(node);
	if (
		!tree
		|| hasCapturingGroup(tree)
		|| getMinimumConsumedLength(tree) === 0
	) {
		return;
	}

	const {pattern, flags} = node.regex;
	return `/${pattern}/${flags.includes('g') ? flags : `g${flags}`}`;
};

const getStaticTemplateLiteralValue = node => {
	if (
		node.type !== 'TemplateLiteral'
		|| node.expressions.length > 0
	) {
		return;
	}

	return node.quasis[0].value.cooked;
};

const getStringNodeValue = node => {
	if (isStringLiteral(node)) {
		return node.value;
	}

	return getStaticTemplateLiteralValue(node);
};

const getSplitJoinReplacement = (node, context) => {
	if (
		!isMethodCall(node, {
			method: 'join',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isMethodCall(node.callee.object, {
			method: 'split',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| context.sourceCode.getCommentsInside(node).length > 0
	) {
		return;
	}

	const splitCall = node.callee.object;
	const [separator] = splitCall.arguments;
	const [replacement] = node.arguments;
	const separatorValue = getStringNodeValue(separator);
	let searchText;

	if (typeof separatorValue === 'string') {
		if (separatorValue.length === 0) {
			return;
		}

		searchText = escapeString(separatorValue);
	} else {
		searchText = getRegExpLiteralWithGlobalFlag(separator);

		if (!searchText) {
			return;
		}
	}

	const replacementValue = getStringNodeValue(replacement);
	if (typeof replacementValue !== 'string') {
		return;
	}

	return `${getParenthesizedText(splitCall.callee.object, context)}.replaceAll(${searchText}, ${escapeString(replacementValue.replaceAll('$', '$$$$'))})`;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		const splitJoinReplacement = getSplitJoinReplacement(node, context);
		if (splitJoinReplacement) {
			return {
				node: node.callee.property,
				messageId: MESSAGE_ID_USE_REPLACE_ALL_OVER_SPLIT_JOIN,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, splitJoinReplacement),
			};
		}

		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			argumentsLength: 2,
			optionalCall: false,
		})) {
			return;
		}

		const {
			arguments: [pattern],
			callee: {property},
		} = node;

		if (!isRegExpWithGlobalFlag(pattern, context.sourceCode.getScope(pattern))) {
			return;
		}

		const methodName = property.name;
		const patternReplacement = getPatternReplacement(pattern);

		if (methodName === 'replaceAll') {
			if (!patternReplacement) {
				return;
			}

			return {
				node: pattern,
				messageId: MESSAGE_ID_USE_STRING,
				data: {
					// Show `This pattern can be replaced with a string literal.` for long strings
					replacement: patternReplacement.length < 20 ? patternReplacement : 'a string literal',
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(pattern, patternReplacement),
			};
		}

		return {
			node: property,
			messageId: MESSAGE_ID_USE_REPLACE_ALL,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixer.insertTextAfter(property, 'All');

				if (!patternReplacement) {
					return;
				}

				yield fixer.replaceText(pattern, patternReplacement);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#replaceAll()` over regex searches with the global flag and `String#split().join()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
