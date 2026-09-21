import {clone, ident, walk} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'lowercase-css';
const messages = {
	[MESSAGE_ID]: 'Use lowercase for CSS {{type}} `{{value}}`.',
};

const hexadecimalColorPattern = /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;
const uppercaseAsciiPattern = /[A-Z]/g;
const fontFeatureValueAtRules = new Set([
	'annotation',
	'character-variant',
	'ornaments',
	'styleset',
	'stylistic',
	'swash',
]);

const toAsciiLowerCase = value => value.replaceAll(uppercaseAsciiPattern, character => character.toLowerCase());
const decodeIdentifier = value => ident.decode(value);
const normalizeIdentifier = value => toAsciiLowerCase(decodeIdentifier(value));
const isCustomIdentifier = value => decodeIdentifier(value).startsWith('--');

function getProblem(node, range, {type, value, replacement}, context) {
	return {
		node,
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		data: {type, value},
		fix: fixer => fixer.replaceTextRange(range, replacement),
	};
}

function getIdentifierProblem(node, range, type, context) {
	const value = context.sourceCode.text.slice(...range);
	const decodedValue = decodeIdentifier(value);
	const lowercaseValue = toAsciiLowerCase(decodedValue);
	if (decodedValue === lowercaseValue) {
		return;
	}

	return getProblem(node, range, {type, value, replacement: ident.encode(lowercaseValue)}, context);
}

function getFeatureNameRange(node, sourceCode) {
	const text = sourceCode.getText(node);
	let index = 0;

	while (index < text.length) {
		if (text[index] === '(' || text[index].trim() === '') {
			index++;
			continue;
		}

		if (text.startsWith('/*', index)) {
			index = text.indexOf('*/', index + 2) + 2;
			continue;
		}

		break;
	}

	const [start] = sourceCode.getRange(node);
	return [start + index, start + index + node.name.length];
}

function getDeclaration(node, sourceCode) {
	return sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Declaration');
}

function isInCustomProperty(node, sourceCode) {
	const declaration = getDeclaration(node, sourceCode);
	return Boolean(declaration && isCustomIdentifier(declaration.property));
}

function isInUrlPayload(node, sourceCode) {
	return sourceCode.getAncestors(node).some(ancestor => ancestor.type === 'Url' || (ancestor.type === 'Function' && normalizeIdentifier(ancestor.name) === 'url'));
}

function isInPreservedValue(node, sourceCode) {
	return isInCustomProperty(node, sourceCode) || isInUrlPayload(node, sourceCode);
}

function getBlockOwner(node, sourceCode) {
	const parent = sourceCode.getParent(node);
	return parent?.type === 'Block' ? sourceCode.getParent(parent) : undefined;
}

function isFontFeatureValueDefinition(declaration, sourceCode) {
	const owner = getBlockOwner(declaration, sourceCode);
	if (
		owner?.type !== 'Atrule'
		|| !fontFeatureValueAtRules.has(normalizeIdentifier(owner.name))
	) {
		return false;
	}

	const outerOwner = getBlockOwner(owner, sourceCode);
	return outerOwner?.type === 'Atrule' && normalizeIdentifier(outerOwner.name) === 'font-feature-values';
}

function getDeclarationMatcher(declaration, sourceCode) {
	const owner = getBlockOwner(declaration, sourceCode);
	const declarationName = normalizeIdentifier(declaration.property);

	if (owner?.type === 'Atrule') {
		const ownerName = normalizeIdentifier(owner.name);
		if (sourceCode.lexer.getAtrule(ownerName)?.descriptors) {
			return value => sourceCode.lexer.matchAtruleDescriptor(ownerName, declarationName, value);
		}
	}

	return value => sourceCode.lexer.matchProperty(declarationName, value);
}

function normalizeMatchNode(node) {
	switch (node.type) {
		case 'Dimension': {
			node.unit = normalizeIdentifier(node.unit);
			break;
		}

		case 'Function':
		case 'Identifier': {
			node.name = normalizeIdentifier(node.name);
			break;
		}

		case 'Hash': {
			node.value = decodeIdentifier(node.value);
			break;
		}

		default:
	}
}

function getValueMatch(matchValue, candidate, target, sourceCode) {
	if (!sourceCode.getText(candidate).includes('\\')) {
		return {match: matchValue(candidate), target};
	}

	const normalizedCandidate = clone(candidate);
	const [targetStart, targetEnd] = sourceCode.getRange(target);
	let normalizedTarget;
	walk(normalizedCandidate, node => {
		normalizeMatchNode(node);
		if (node.type !== target.type) {
			return;
		}

		const [nodeStart, nodeEnd] = sourceCode.getRange(node);
		if (nodeStart === targetStart && nodeEnd === targetEnd) {
			normalizedTarget = node;
		}
	});

	return {match: matchValue(normalizedCandidate), target: normalizedTarget};
}

function isValueKeyword(node, declaration, sourceCode) {
	const matchValue = getDeclarationMatcher(declaration, sourceCode);
	const completeMatch = getValueMatch(matchValue, declaration.value, node, sourceCode);

	if (!completeMatch.match.error) {
		return completeMatch.match.isKeyword(completeMatch.target);
	}

	const ancestors = sourceCode.getAncestors(node);
	const declarationIndex = ancestors.lastIndexOf(declaration);
	const candidates = [node, ...ancestors.slice(declarationIndex + 2).toReversed()];

	for (const candidate of candidates) {
		const {match, target} = getValueMatch(matchValue, candidate, node, sourceCode);
		if (!match.error && match.isKeyword(target)) {
			return true;
		}
	}

	return false;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', node => {
		if (
			isCustomIdentifier(node.property)
			|| isFontFeatureValueDefinition(node, sourceCode)
		) {
			return;
		}

		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start, start + node.property.length], 'property', context);
	});

	context.on('Atrule', node => {
		if (isCustomIdentifier(node.name)) {
			return;
		}

		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start + 1, start + 1 + node.name.length], 'at-rule name', context);
	});

	context.on('Dimension', node => {
		if (isInPreservedValue(node, sourceCode)) {
			return;
		}

		const [, end] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [end - node.unit.length, end], 'unit', context);
	});

	context.on('Function', node => {
		if (
			isInPreservedValue(node, sourceCode)
			|| isCustomIdentifier(node.name)
		) {
			return;
		}

		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start, start + node.name.length], 'function name', context);
	});

	context.on('Url', node => {
		if (isInPreservedValue(node, sourceCode)) {
			return;
		}

		const text = sourceCode.getText(node);
		const nameLength = text.indexOf('(');
		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start, start + nameLength], 'function name', context);
	});

	for (const [nodeType, type, colonCount] of [
		['PseudoClassSelector', 'pseudo-class name', 1],
		['PseudoElementSelector', 'pseudo-element name', 2],
	]) {
		context.on(nodeType, node => {
			if (isCustomIdentifier(node.name)) {
				return;
			}

			const [start] = sourceCode.getRange(node);
			return getIdentifierProblem(node, [start + colonCount, start + colonCount + node.name.length], type, context);
		});
	}

	context.on('Feature', node => {
		if (
			node.kind !== 'media'
			|| isCustomIdentifier(node.name)
		) {
			return;
		}

		return getIdentifierProblem(node, getFeatureNameRange(node, sourceCode), 'media feature name', context);
	});

	context.on('FeatureRange', function * (node) {
		if (node.kind !== 'media') {
			return;
		}

		const atRule = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Atrule');
		if (!atRule) {
			return;
		}

		const match = sourceCode.lexer.matchAtrulePrelude(normalizeIdentifier(atRule.name), atRule.prelude);
		if (match.error) {
			return;
		}

		for (const candidate of [node.left, node.middle, node.right]) {
			if (
				candidate?.type !== 'Identifier'
				|| !match.isType(candidate, 'mf-name')
				|| isCustomIdentifier(candidate.name)
			) {
				continue;
			}

			const problem = getIdentifierProblem(candidate, sourceCode.getRange(candidate), 'media feature name', context);
			if (problem) {
				yield problem;
			}
		}
	});

	context.on('Identifier', node => {
		if (
			isInPreservedValue(node, sourceCode)
			|| isCustomIdentifier(node.name)
		) {
			return;
		}

		const declaration = getDeclaration(node, sourceCode);
		if (
			!declaration
			|| isCustomIdentifier(declaration.property)
			|| !isValueKeyword(node, declaration, sourceCode)
		) {
			return;
		}

		return getIdentifierProblem(node, sourceCode.getRange(node), 'value keyword', context);
	});

	context.on('Hash', node => {
		if (isInPreservedValue(node, sourceCode)) {
			return;
		}

		const [start, end] = sourceCode.getRange(node);
		const range = [start + 1, end];
		const value = sourceCode.text.slice(...range);
		const decodedValue = decodeIdentifier(value);
		const replacement = toAsciiLowerCase(decodedValue);
		if (
			!hexadecimalColorPattern.test(decodedValue)
			|| decodedValue === replacement
		) {
			return;
		}

		return getProblem(node, range, {type: 'hexadecimal color', value: `#${value}`, replacement}, context);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce lowercase CSS syntax.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
