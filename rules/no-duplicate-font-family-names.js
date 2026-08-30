import {ident} from '@eslint/css-tree/utils';
import {toLocation} from './utils/index.js';

const MESSAGE_ID = 'no-duplicate-font-family-names';
const messages = {
	[MESSAGE_ID]: 'Remove duplicate font family name `{{fontFamilyName}}`.',
};

const genericFontFamilyNames = new Set([
	'-apple-system',
	'blinkmacsystemfont',
	'cursive',
	'fantasy',
	'math',
	'monospace',
	'sans-serif',
	'serif',
	'system-ui',
	'ui-monospace',
	'ui-rounded',
	'ui-sans-serif',
	'ui-serif',
]);

const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();

const getCommaSeparatedGroups = value => {
	const groups = [];
	let nodes = [];
	let previousComma;

	for (const node of value.children) {
		if (node.type === 'Operator' && node.value === ',') {
			groups.push({nodes, previousComma, nextComma: node});
			nodes = [];
			previousComma = node;
			continue;
		}

		nodes.push(node);
	}

	groups.push({nodes, previousComma, nextComma: undefined});

	return groups;
};

const getGenericFunctionName = node => {
	if (
		node.type !== 'Function'
		|| normalizeCssIdentifier(node.name) !== 'generic'
		|| node.children.length !== 1
		|| node.children.at(0).type !== 'Identifier'
	) {
		return;
	}

	return `generic(${ident.decode(node.children.at(0).name)})`;
};

const getFontFamily = (nodes, matchResult) => {
	if (nodes.length === 1 && nodes[0].type === 'String') {
		const {value: name} = nodes[0];
		return {name, key: `family:${name.toLowerCase()}`};
	}

	if (nodes.length === 1) {
		const name = getGenericFunctionName(nodes[0]);
		if (name) {
			return {name, key: `generic:${name.toLowerCase()}`};
		}
	}

	if (nodes.length === 0 || nodes.some(node => node.type !== 'Identifier')) {
		return;
	}

	const name = nodes.map(node => ident.decode(node.name)).join(' ');
	const normalizedName = name.toLowerCase();
	const isGeneric = nodes.length === 1
		&& (matchResult?.isType(nodes[0], 'generic-family') || genericFontFamilyNames.has(normalizedName));

	return {
		name,
		key: `${isGeneric ? 'generic' : 'family'}:${normalizedName}`,
	};
};

const getFontShorthandGroups = (value, matchResult) => {
	if (!matchResult.matched) {
		return [];
	}

	return getCommaSeparatedGroups(value).map(group => ({
		...group,
		nodes: group.nodes.filter(node => matchResult.isProperty(node, 'font-family')),
	}));
};

const hasCommentInRange = (range, sourceCode) => sourceCode.comments.some(comment => {
	const commentRange = sourceCode.getRange(comment);
	return commentRange[0] < range[1] && commentRange[1] > range[0];
});

const isInStyleRule = (node, sourceCode) => {
	for (let ancestor = sourceCode.getParent(node); ancestor; ancestor = sourceCode.getParent(ancestor)) {
		if (ancestor.type === 'Rule') {
			return true;
		}
	}

	return false;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', function * (declaration) {
		const property = normalizeCssIdentifier(declaration.property);
		if (property !== 'font' && property !== 'font-family') {
			return;
		}

		if (!isInStyleRule(declaration, sourceCode)) {
			return;
		}

		const matchResult = sourceCode.lexer.matchProperty(property, declaration.value);
		const groups = property === 'font'
			? getFontShorthandGroups(declaration.value, matchResult)
			: getCommaSeparatedGroups(declaration.value);
		const seenFontFamilies = new Set();

		for (const group of groups) {
			const fontFamily = getFontFamily(group.nodes, matchResult.matched ? matchResult : undefined);
			if (!fontFamily) {
				continue;
			}

			if (!seenFontFamilies.has(fontFamily.key)) {
				seenFontFamilies.add(fontFamily.key);
				continue;
			}

			const firstNode = group.nodes[0];
			const lastNode = group.nodes.at(-1);
			const familyRange = [sourceCode.getRange(firstNode)[0], sourceCode.getRange(lastNode)[1]];
			const previousCommaStart = sourceCode.getRange(group.previousComma)[0];
			const nextCommaStart = group.nextComma ? sourceCode.getRange(group.nextComma)[0] : familyRange[1];
			const commentRangeEnd = group.nextComma ? nextCommaStart : sourceCode.getRange(declaration.value)[1];

			yield {
				node: firstNode,
				loc: toLocation(familyRange, context),
				messageId: MESSAGE_ID,
				data: {fontFamilyName: fontFamily.name},
				* fix(fixer, {abort}) {
					if (hasCommentInRange([previousCommaStart, commentRangeEnd], sourceCode)) {
						return abort();
					}

					yield fixer.removeRange([previousCommaStart, nextCommaStart]);
				},
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
			description: 'Disallow duplicate font family names.',
			recommended: 'unopinionated',
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
