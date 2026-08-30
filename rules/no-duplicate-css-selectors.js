import {generate} from '@eslint/css-tree';

/**
@import * as ESLint from 'eslint';
*/

const DUPLICATE_SELECTOR = 'duplicate-selector';
const DUPLICATE_SELECTOR_LIST = 'duplicate-selector-list';
const messages = {
	[DUPLICATE_SELECTOR]: 'This selector duplicates the selector on line {{line}}.',
	[DUPLICATE_SELECTOR_LIST]: 'This selector list duplicates the selector list on line {{line}}.',
};

const keyframesNamePattern = /^(?:-(?:o|moz|webkit)-)?keyframes$/iu;

const hasCommentInRange = (sourceCode, [start, end]) => sourceCode.comments.some(comment => {
	const [commentStart, commentEnd] = sourceCode.getRange(comment);
	return commentStart < end && commentEnd > start;
});

const getDuplicateSelectorRemovalRange = (selectors, index, block, sourceCode) => {
	const selector = selectors[index];
	const previousSelector = selectors[index - 1];
	const nextSelector = selectors[index + 1];
	const [, previousSelectorEnd] = sourceCode.getRange(previousSelector);
	const [selectorStart, selectorEnd] = sourceCode.getRange(selector);
	const [commentCheckEnd] = sourceCode.getRange(nextSelector ?? block);
	const separator = sourceCode.text.slice(previousSelectorEnd, selectorStart);
	const removalRange = [previousSelectorEnd, selectorEnd];
	const commentCheckRange = [previousSelectorEnd, commentCheckEnd];

	if (!/^\s*,\s*$/u.test(separator) || hasCommentInRange(sourceCode, commentCheckRange)) {
		return;
	}

	return removalRange;
};

const getDuplicateSelectorsFix = (rule, duplicates, sourceCode) => {
	const removalRanges = duplicates.map(({removalRange}) => removalRange).filter(Boolean);
	if (removalRanges.length === 0) {
		return;
	}

	const [selectorListStart, selectorListEnd] = sourceCode.getRange(rule.prelude);
	let replacement = sourceCode.text.slice(selectorListStart, selectorListEnd);
	for (const [start, end] of removalRanges.toReversed()) {
		replacement = replacement.slice(0, start - selectorListStart) + replacement.slice(end - selectorListStart);
	}

	return fixer => fixer.replaceText(rule.prelude, replacement);
};

const getContextPart = (node, sourceCode) => {
	if (node.type === 'Rule') {
		return ['rule', generate(node.prelude)];
	}

	const name = node.name.toLowerCase();
	if (name === 'layer' && !node.prelude) {
		return ['anonymous-layer', sourceCode.getRange(node)[0]];
	}

	return ['at-rule', name, node.prelude ? generate(node.prelude) : ''];
};

const getContextKey = (rule, sourceCode) => {
	const context = [];
	let node = sourceCode.getParent(rule);

	while (node) {
		if (node.type === 'Atrule') {
			if (keyframesNamePattern.test(node.name)) {
				return;
			}

			context.push(getContextPart(node, sourceCode));
		} else if (node.type === 'Rule') {
			context.push(getContextPart(node, sourceCode));
		}

		node = sourceCode.getParent(node);
	}

	return JSON.stringify(context.toReversed());
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const selectorListsByContext = new Map();

	context.on('Rule', function * (rule) {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const contextKey = getContextKey(rule, sourceCode);
		if (contextKey === undefined) {
			return;
		}

		const selectors = rule.prelude.children;
		const seenSelectors = new Map();
		const duplicates = [];

		for (const [index, selector] of selectors.entries()) {
			const selectorKey = generate(selector);
			const firstSelector = seenSelectors.get(selectorKey);

			if (!firstSelector) {
				seenSelectors.set(selectorKey, selector);
				continue;
			}

			duplicates.push({
				selector,
				firstSelector,
				removalRange: getDuplicateSelectorRemovalRange(selectors, index, rule.block, sourceCode),
			});
		}

		const duplicateSelectorsFix = getDuplicateSelectorsFix(rule, duplicates, sourceCode);
		for (const {selector, firstSelector, removalRange} of duplicates) {
			yield {
				node: selector,
				messageId: DUPLICATE_SELECTOR,
				data: {line: String(sourceCode.getLoc(firstSelector).start.line)},
				fix: removalRange ? duplicateSelectorsFix : undefined,
			};
		}

		let selectorLists = selectorListsByContext.get(contextKey);
		if (!selectorLists) {
			selectorLists = new Map();
			selectorListsByContext.set(contextKey, selectorLists);
		}

		const selectorListKey = generate(rule.prelude);
		const firstSelectorList = selectorLists.get(selectorListKey);
		if (!firstSelectorList) {
			selectorLists.set(selectorListKey, rule.prelude);
			return;
		}

		yield {
			node: rule.prelude,
			messageId: DUPLICATE_SELECTOR_LIST,
			data: {line: String(sourceCode.getLoc(firstSelectorList).start.line)},
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow duplicate CSS selectors.',
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
