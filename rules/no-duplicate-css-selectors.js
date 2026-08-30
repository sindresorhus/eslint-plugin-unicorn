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

const keyframesNamePattern = /^-(?:o|moz|webkit)-keyframes$|^keyframes$/iu;

const getRange = (node, sourceCode) => {
	const {start, end} = sourceCode.getLoc(node);
	return [start.offset, end.offset];
};

const hasCommentInRange = (sourceCode, [start, end]) => sourceCode.comments.some(comment => {
	const [commentStart, commentEnd] = getRange(comment, sourceCode);
	return commentStart < end && commentEnd > start;
});

const getDuplicateSelectorFix = (selectors, index, block, sourceCode) => {
	const selector = selectors[index];
	const previousSelector = selectors[index - 1];
	const nextSelector = selectors[index + 1];
	const [, previousSelectorEnd] = getRange(previousSelector, sourceCode);
	const [selectorStart, selectorEnd] = getRange(selector, sourceCode);
	const [commentCheckEnd] = getRange(nextSelector ?? block, sourceCode);
	const separator = sourceCode.text.slice(previousSelectorEnd, selectorStart);
	const removalRange = [previousSelectorEnd, selectorEnd];
	const commentCheckRange = [previousSelectorEnd, commentCheckEnd];

	if (!/^\s*,\s*$/u.test(separator) || hasCommentInRange(sourceCode, commentCheckRange)) {
		return;
	}

	return fixer => fixer.removeRange(removalRange);
};

const getContextPart = (node, getAnonymousLayerIdentifier) => {
	if (node.type === 'Rule') {
		return ['rule', generate(node.prelude)];
	}

	const name = node.name.toLowerCase();
	if (name === 'layer' && !node.prelude) {
		return ['anonymous-layer', getAnonymousLayerIdentifier(node)];
	}

	return ['at-rule', name, node.prelude ? generate(node.prelude) : ''];
};

const getContextKey = (rule, sourceCode, getAnonymousLayerIdentifier) => {
	const context = [];
	let node = sourceCode.getParent(rule);

	while (node) {
		if (node.type === 'Atrule') {
			if (keyframesNamePattern.test(node.name)) {
				return;
			}

			context.push(getContextPart(node, getAnonymousLayerIdentifier));
		} else if (node.type === 'Rule') {
			context.push(getContextPart(node, getAnonymousLayerIdentifier));
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
	const anonymousLayerIds = new WeakMap();
	let nextAnonymousLayerIdentifier = 0;

	const getAnonymousLayerIdentifier = node => {
		let identifier = anonymousLayerIds.get(node);
		if (identifier === undefined) {
			identifier = nextAnonymousLayerIdentifier++;
			anonymousLayerIds.set(node, identifier);
		}

		return identifier;
	};

	context.on('Rule', function * (rule) {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const contextKey = getContextKey(rule, sourceCode, getAnonymousLayerIdentifier);
		if (contextKey === undefined) {
			return;
		}

		const selectors = rule.prelude.children;
		const seenSelectors = new Map();

		for (const [index, selector] of selectors.entries()) {
			const selectorKey = generate(selector);
			const firstSelector = seenSelectors.get(selectorKey);

			if (!firstSelector) {
				seenSelectors.set(selectorKey, selector);
				continue;
			}

			yield {
				node: selector,
				messageId: DUPLICATE_SELECTOR,
				data: {line: String(sourceCode.getLoc(firstSelector).start.line)},
				fix: getDuplicateSelectorFix(selectors, index, rule.block, sourceCode),
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
