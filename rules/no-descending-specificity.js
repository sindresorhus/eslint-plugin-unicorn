import {
	find,
	generate,
	ident,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	compareSpecificity,
	getMaximumSpecificity,
	getParentStyleRule,
	getRuleSelectorSpecificity,
	getRuleSpecificities,
	hasAncestorStyleRule,
	hasLeadingCombinator,
	hasScopeAncestor,
	normalizeCssIdentifier,
} from './shared/css-selector-specificity.js';

const MESSAGE_ID = 'no-descending-specificity';
const messages = {
	[MESSAGE_ID]: 'Expected selector `{{selector}}` to come before `{{previousSelector}}` on line {{line}} because both set `{{property}}`.',
};

const LEGACY_PSEUDO_ELEMENTS = new Set([
	'after',
	'before',
	'first-letter',
	'first-line',
]);
const keyframesNamePattern = /^(?:-(?:o|moz|webkit)-)?keyframes$/u;
const MAXIMUM_TERMINAL_KEYS = 64;
const MAXIMUM_TERMINAL_KEY_LENGTH = 1024;
const MAXIMUM_TERMINAL_KEY_ASSOCIATIONS = 256;

const getAtRuleContextPart = (atRule, sourceCode) => {
	const name = normalizeCssIdentifier(atRule.name);
	if (name === 'layer' && !atRule.prelude) {
		return ['anonymous-layer', sourceCode.getRange(atRule)[0]];
	}

	return ['at-rule', name, atRule.prelude ? generate(atRule.prelude) : ''];
};

const isInKeyframes = (rule, sourceCode) => {
	let ancestor = sourceCode.getParent(rule);

	while (ancestor) {
		if (
			ancestor.type === 'Atrule'
			&& keyframesNamePattern.test(normalizeCssIdentifier(ancestor.name))
		) {
			return true;
		}

		ancestor = sourceCode.getParent(ancestor);
	}

	return false;
};

const normalizeProperty = property => {
	const decodedProperty = ident.decode(property);
	return decodedProperty.startsWith('--') ? decodedProperty : normalizeCssIdentifier(property);
};

const getDeclarationRecordKey = ({contextIdentifier, property}) => JSON.stringify([contextIdentifier, property]);

const getTerminalCompoundNodes = selector => {
	const lastCombinatorIndex = selector.children.findLastIndex(node => node.type === 'Combinator');
	return selector.children.slice(lastCombinatorIndex + 1);
};

const isPseudoSelectorWithNestingSelector = node => (node.type === 'PseudoClassSelector' || node.type === 'PseudoElementSelector')
	&& Boolean(find(node, descendant => descendant.type === 'NestingSelector'));

const getTypeSelectorKey = name => {
	const tokens = [];
	tokenize(name, (type, start, end) => {
		const value = name.slice(start, end);
		tokens.push([type, type === tokenTypes.Ident ? ident.decode(value) : value]);
	});

	return JSON.stringify(tokens);
};

const compareTerminalKeyParts = (first, second) => {
	if (first === second) {
		return 0;
	}

	return first < second ? -1 : 1;
};

const getTerminalNodeKey = node => {
	switch (node.type) {
		case 'NestingSelector': {
			return;
		}

		case 'TypeSelector': {
			return `TypeSelector:${getTypeSelectorKey(node.name)}`;
		}

		case 'ClassSelector':
		case 'IdSelector': {
			return `${node.type}:${ident.decode(node.name)}`;
		}

		case 'PseudoClassSelector': {
			const name = normalizeCssIdentifier(node.name);
			return LEGACY_PSEUDO_ELEMENTS.has(name) ? `::${name}` : '';
		}

		case 'PseudoElementSelector': {
			return generate({...node, name: normalizeCssIdentifier(node.name)});
		}

		default: {
			return generate(node);
		}
	}
};

const joinTerminalKeyParts = (parts, parentKey = '') => {
	const parentParts = parentKey ? JSON.parse(parentKey) : [];
	const keyParts = new Set();
	let unnormalizedLength = 0;
	for (const part of parts) {
		unnormalizedLength += part === undefined ? parentKey.length : part.length;
		if (unnormalizedLength > MAXIMUM_TERMINAL_KEY_LENGTH) {
			return;
		}

		if (part === undefined) {
			for (const parentPart of parentParts) {
				keyParts.add(parentPart);
			}
		} else if (part !== '') {
			keyParts.add(part);
		}
	}

	if (keyParts.size === 0) {
		return;
	}

	const key = JSON.stringify([...keyParts].toSorted(compareTerminalKeyParts));
	return key.length <= MAXIMUM_TERMINAL_KEY_LENGTH ? key : undefined;
};

const getTerminalKeys = (selector, parentTerminalKeys) => {
	if (find(selector, isPseudoSelectorWithNestingSelector)) {
		return [];
	}

	const nodes = getTerminalCompoundNodes(selector);
	const hasNestingSelector = nodes.some(node => node.type === 'NestingSelector');
	const parts = nodes.map(node => getTerminalNodeKey(node));

	if (!hasNestingSelector) {
		const key = joinTerminalKeyParts(parts);
		return key ? [key] : [];
	}

	if (parentTerminalKeys.length === 0) {
		return [];
	}

	const terminalKeys = new Set();
	for (const parentKey of parentTerminalKeys) {
		const key = joinTerminalKeyParts(parts, parentKey);
		if (!key) {
			return [];
		}

		terminalKeys.add(key);
	}

	return [...terminalKeys];
};

const getResolvableTerminalKeys = (selector, parentTerminalKeys, canResolveAgainstParent) => canResolveAgainstParent && canMatchSelector(selector)
	? getTerminalKeys(selector, parentTerminalKeys)
	: [];

const hasRawNode = selector => Boolean(find(selector, node => node.type === 'Raw'));

const getRuleTerminalKeys = analyses => {
	const terminalKeys = new Set();
	for (const analysis of analyses) {
		if (!canBeRepresentedByNestingSelector(analysis.selector)) {
			continue;
		}

		for (const terminalKey of analysis.terminalKeys) {
			terminalKeys.add(terminalKey);
			if (terminalKeys.size > MAXIMUM_TERMINAL_KEYS) {
				return [];
			}
		}
	}

	return [...terminalKeys];
};

const getStrongerEntry = (first, second) => {
	if (!first) {
		return second;
	}

	if (!second) {
		return first;
	}

	return compareSpecificity(first.specificity, second.specificity) >= 0 ? first : second;
};

const getStrongestEntriesByRule = (entries = [], entry) => {
	const sameRuleEntry = entries.find(candidate => candidate.rule === entry.rule);
	const candidates = entries.filter(candidate => candidate.rule !== entry.rule);
	candidates.push(getStrongerEntry(sameRuleEntry, entry));
	candidates.sort((first, second) => compareSpecificity(second.specificity, first.specificity));
	// Two distinct rules are enough to find the strongest entry after excluding the current selector list.
	return candidates.slice(0, 2);
};

const getStrongestEntryFromDifferentRule = (entries, rule) => entries?.find(entry => entry.rule !== rule);

const getConflict = (analysis, record, entriesByTerminalKey) => {
	const {property, important, rule} = record;
	for (const terminalKey of analysis.terminalKeys) {
		const entriesByProperty = entriesByTerminalKey.get(terminalKey);
		if (!entriesByProperty) {
			continue;
		}

		const entries = entriesByProperty.get(property);
		if (!entries) {
			continue;
		}

		const previousImportantEntry = getStrongestEntryFromDifferentRule(entries.important, rule);
		const previousEntry = important
			? previousImportantEntry
			: getStrongerEntry(getStrongestEntryFromDifferentRule(entries.normal, rule), previousImportantEntry);
		if (
			previousEntry
			&& compareSpecificity(analysis.specificity, previousEntry.specificity) < 0
		) {
			return previousEntry;
		}
	}
};

function * getSelectorProblems(analyses, record, entriesByTerminalKey, reportedSelectors) {
	const {property} = record;
	for (const analysis of analyses) {
		if (reportedSelectors.has(analysis.selector)) {
			continue;
		}

		const previousEntry = getConflict(analysis, record, entriesByTerminalKey);
		if (!previousEntry) {
			continue;
		}

		reportedSelectors.add(analysis.selector);
		yield {
			node: analysis.selector,
			messageId: MESSAGE_ID,
			data: {
				selector: analysis.selectorText,
				previousSelector: previousEntry.selector,
				line: String(previousEntry.line),
				property,
			},
		};
	}
}

const addEntry = (analysis, record, entriesByTerminalKey) => {
	const {property, important} = record;
	const entry = {
		rule: record.rule,
		selector: analysis.selectorText,
		line: analysis.line,
		specificity: analysis.specificity,
	};

	for (const terminalKey of analysis.terminalKeys) {
		let entriesByProperty = entriesByTerminalKey.get(terminalKey);
		if (!entriesByProperty) {
			entriesByProperty = new Map();
			entriesByTerminalKey.set(terminalKey, entriesByProperty);
		}

		let entries = entriesByProperty.get(property);
		if (!entries) {
			entries = {};
			entriesByProperty.set(property, entries);
		}

		const priority = important ? 'important' : 'normal';
		entries[priority] = getStrongestEntriesByRule(entries[priority], entry);
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const ruleSpecificities = new WeakMap();
	const ruleTerminalKeys = new WeakMap();
	const analysesByRule = new WeakMap();
	const declarationRecords = [];
	const entriesByContext = new Map();
	const contextIdentifierByNode = new WeakMap();
	const contextIdentifierByKey = new Map();
	const reportedSelectors = new Set();
	const getAtRuleContextIdentifier = node => {
		const cachedIdentifier = contextIdentifierByNode.get(node);
		if (cachedIdentifier !== undefined) {
			return cachedIdentifier;
		}

		const parent = sourceCode.getParent(node);
		let identifier = parent ? getAtRuleContextIdentifier(parent) : 0;
		if (node.type === 'Atrule') {
			const key = JSON.stringify([identifier, getAtRuleContextPart(node, sourceCode)]);
			let nestedIdentifier = contextIdentifierByKey.get(key);
			if (nestedIdentifier === undefined) {
				nestedIdentifier = contextIdentifierByKey.size + 1;
				contextIdentifierByKey.set(key, nestedIdentifier);
			}

			identifier = nestedIdentifier;
		}

		contextIdentifierByNode.set(node, identifier);
		return identifier;
	};

	context.on('Rule', rule => {
		if (
			rule.prelude.type !== 'SelectorList'
			|| isInKeyframes(rule, sourceCode)
		) {
			return;
		}

		const parentRule = getParentStyleRule(rule, context);
		const parentSpecificities = parentRule && ruleSpecificities.get(parentRule);
		const parentTerminalKeys = parentRule ? ruleTerminalKeys.get(parentRule) ?? [] : [];
		const nestingSpecificity = getMaximumSpecificity(parentSpecificities ?? []);
		const hasUnresolvedParent = !parentRule && hasAncestorStyleRule(rule, context);
		const isScoped = hasScopeAncestor(rule, context);
		const allowsRelativeSelector = Boolean(parentRule) || isScoped;
		const hasUnresolvedSelectorList = rule.prelude.children.some(selector => hasRawNode(selector)
			|| !canMatchSelector(selector)
			|| (!allowsRelativeSelector && hasLeadingCombinator(selector))
			|| (isScoped && Boolean(find(selector, node => (!parentRule && node.type === 'NestingSelector')
				|| (node.type === 'PseudoClassSelector' && normalizeCssIdentifier(node.name) === 'scope')))));
		const canResolveAgainstParent = !hasUnresolvedParent && (!parentRule || parentSpecificities?.length > 0);

		const analyses = [];
		let terminalKeyAssociationCount = 0;
		let exceedsTerminalKeyBudget = false;
		if (!hasUnresolvedSelectorList) {
			for (const selector of rule.prelude.children) {
				const terminalKeys = getResolvableTerminalKeys(selector, parentTerminalKeys, canResolveAgainstParent);
				terminalKeyAssociationCount += terminalKeys.length;
				if (terminalKeyAssociationCount > MAXIMUM_TERMINAL_KEY_ASSOCIATIONS) {
					analyses.length = 0;
					exceedsTerminalKeyBudget = true;
					break;
				}

				analyses.push({
					line: sourceCode.getLoc(selector).start.line,
					selector,
					selectorText: generate(selector),
					specificity: getRuleSelectorSpecificity(selector, nestingSpecificity),
					terminalKeys,
				});
			}
		}

		const specificities = hasUnresolvedParent || hasUnresolvedSelectorList || exceedsTerminalKeyBudget || parentSpecificities?.length === 0 ? [] : getRuleSpecificities(rule, nestingSpecificity);
		ruleSpecificities.set(rule, specificities);
		ruleTerminalKeys.set(rule, getRuleTerminalKeys(analyses));
		analysesByRule.set(rule, analyses);
	});

	context.on('Declaration', declaration => {
		let rule = sourceCode.getParent(declaration);
		let isDirectlyScoped = false;
		while (rule && rule.type !== 'Rule') {
			isDirectlyScoped ||= rule.type === 'Atrule' && normalizeCssIdentifier(rule.name) === 'scope';
			rule = sourceCode.getParent(rule);
		}

		if (isDirectlyScoped || !analysesByRule.has(rule)) {
			return;
		}

		declarationRecords.push({
			contextIdentifier: getAtRuleContextIdentifier(sourceCode.getParent(declaration)),
			important: Boolean(declaration.important),
			property: normalizeProperty(declaration.property),
			rule,
		});
	});

	context.onExit('StyleSheet', function * () {
		const importantKeysByRule = new WeakMap();
		for (const record of declarationRecords) {
			if (!record.important) {
				continue;
			}

			let importantKeys = importantKeysByRule.get(record.rule);
			if (!importantKeys) {
				importantKeys = new Set();
				importantKeysByRule.set(record.rule, importantKeys);
			}

			importantKeys.add(getDeclarationRecordKey(record));
		}

		for (const record of declarationRecords) {
			const {contextIdentifier, important, property, rule} = record;
			const key = getDeclarationRecordKey(record);
			let entriesByTerminalKey = entriesByContext.get(contextIdentifier);
			if (!entriesByTerminalKey) {
				entriesByTerminalKey = new Map();
				entriesByContext.set(contextIdentifier, entriesByTerminalKey);
			}

			const analyses = analysesByRule.get(rule);
			if (important || !importantKeysByRule.get(rule)?.has(key)) {
				yield * getSelectorProblems(analyses, record, entriesByTerminalKey, reportedSelectors);
			}

			for (const analysis of analyses) {
				addEntry(analysis, record, entriesByTerminalKey);
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
		type: 'problem',
		docs: {
			description: 'Disallow lower-specificity selectors from following higher-specificity selectors that set the same property.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
