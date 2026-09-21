import {
	ident,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';

const ZERO_SPECIFICITY = [0, 0, 0];
const TRANSPARENT_GROUP_RULES = new Set([
	'container',
	'layer',
	'media',
	'supports',
]);
const SELECTOR_LIST_PSEUDO_CLASSES = new Set([
	'has',
	'is',
	'not',
]);
const FORGIVING_SELECTOR_LIST_PSEUDO_CLASSES = new Set([
	'is',
	'where',
]);
const NTH_PSEUDO_CLASSES = new Set([
	'nth-child',
	'nth-last-child',
]);
const LEGACY_PSEUDO_ELEMENTS = new Set([
	'after',
	'before',
	'first-letter',
	'first-line',
]);

const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();

const addSpecificity = (first, second) => first.map((value, index) => value + second[index]);

const compareSpecificity = (first, second) => {
	for (const [index, value] of first.entries()) {
		if (value !== second[index]) {
			return value - second[index];
		}
	}

	return 0;
};

const getMaximumSpecificity = specificities => {
	let maximum = ZERO_SPECIFICITY;

	for (const specificity of specificities) {
		if (compareSpecificity(specificity, maximum) > 0) {
			maximum = specificity;
		}
	}

	return maximum;
};

const getSelectorArgument = node => {
	const child = node.children?.[0];
	if (child?.type === 'SelectorList' || child?.type === 'Selector') {
		return child;
	}

	if (child?.type === 'Nth') {
		return child.selector;
	}
};

const isSelectorRepresentable = (selector, allowPseudoElements) => selector.children.every(node => {
	if (
		node.type !== 'PseudoClassSelector'
		&& node.type !== 'PseudoElementSelector'
	) {
		return true;
	}

	if (node.type === 'PseudoElementSelector' && !allowPseudoElements) {
		return false;
	}

	const name = normalizeCssIdentifier(node.name);
	if (LEGACY_PSEUDO_ELEMENTS.has(name)) {
		return allowPseudoElements;
	}

	const selectorArgument = getSelectorArgument(node);
	if (!selectorArgument) {
		return true;
	}

	const selectors = selectorArgument.type === 'Selector' ? [selectorArgument] : selectorArgument.children;
	return node.type === 'PseudoClassSelector' && FORGIVING_SELECTOR_LIST_PSEUDO_CLASSES.has(name)
		? selectors.some(selector => isSelectorRepresentable(selector, false))
		: selectors.every(selector => isSelectorRepresentable(selector, false));
});

const canMatchSelector = selector => isSelectorRepresentable(selector, true);
const canBeRepresentedByNestingSelector = selector => isSelectorRepresentable(selector, false);

const hasNestingSelectorInRawArgument = argument => {
	if (argument?.type !== 'Raw') {
		return false;
	}

	let hasNestingSelector = false;
	tokenize(argument.value, (type, start) => {
		hasNestingSelector ||= type === tokenTypes.Delim && argument.value[start] === '&';
	});

	return hasNestingSelector;
};

const getSelectorSpecificity = (selector, nestingSpecificity) => {
	let specificity = ZERO_SPECIFICITY;
	let hasNestingSelector = false;

	for (const child of selector.children ?? []) {
		const result = getNodeSpecificity(child, nestingSpecificity);
		specificity = addSpecificity(specificity, result.specificity);
		hasNestingSelector ||= result.hasNestingSelector;
	}

	return {specificity, hasNestingSelector};
};

const getSelectorArgumentSpecificity = (selectorArgument, nestingSpecificity) => {
	const selectors = (selectorArgument?.type === 'Selector' ? [selectorArgument] : selectorArgument?.children ?? [])
		.filter(selector => canBeRepresentedByNestingSelector(selector));
	const results = selectors.map(selector => getSelectorSpecificity(selector, nestingSpecificity));

	return {
		specificity: getMaximumSpecificity(results.map(({specificity}) => specificity)),
		hasNestingSelector: results.some(({hasNestingSelector}) => hasNestingSelector),
	};
};

const getPseudoClassSpecificity = (node, nestingSpecificity) => {
	const name = normalizeCssIdentifier(node.name);
	const argument = node.children?.[0];
	const selectorArgumentResult = getSelectorArgumentSpecificity(getSelectorArgument(node), nestingSpecificity);
	const hasNestingSelector = selectorArgumentResult.hasNestingSelector || hasNestingSelectorInRawArgument(argument);

	if (name === 'where') {
		return {
			specificity: ZERO_SPECIFICITY,
			hasNestingSelector,
		};
	}

	if (SELECTOR_LIST_PSEUDO_CLASSES.has(name)) {
		return {...selectorArgumentResult, hasNestingSelector};
	}

	if (
		NTH_PSEUDO_CLASSES.has(name)
		|| name === 'host'
		|| name === 'host-context'
	) {
		return {
			specificity: addSpecificity([0, 1, 0], selectorArgumentResult.specificity),
			hasNestingSelector,
		};
	}

	return {
		specificity: LEGACY_PSEUDO_ELEMENTS.has(name) ? [0, 0, 1] : [0, 1, 0],
		hasNestingSelector,
	};
};

const getPseudoElementSpecificity = (node, nestingSpecificity) => {
	const argument = node.children?.[0];
	const selectorArgumentResult = getSelectorArgumentSpecificity(getSelectorArgument(node), nestingSpecificity);

	return {
		specificity: addSpecificity([0, 0, 1], selectorArgumentResult.specificity),
		hasNestingSelector: selectorArgumentResult.hasNestingSelector || hasNestingSelectorInRawArgument(argument),
	};
};

const getNodeSpecificity = (node, nestingSpecificity) => {
	switch (node.type) {
		case 'IdSelector': {
			return {specificity: [1, 0, 0], hasNestingSelector: false};
		}

		case 'ClassSelector':
		case 'AttributeSelector': {
			return {specificity: [0, 1, 0], hasNestingSelector: false};
		}

		case 'TypeSelector': {
			const isUniversal = node.name === '*' || node.name.endsWith('|*');
			return {specificity: isUniversal ? ZERO_SPECIFICITY : [0, 0, 1], hasNestingSelector: false};
		}

		case 'PseudoClassSelector': {
			return getPseudoClassSpecificity(node, nestingSpecificity);
		}

		case 'PseudoElementSelector': {
			return getPseudoElementSpecificity(node, nestingSpecificity);
		}

		case 'NestingSelector': {
			return {specificity: nestingSpecificity, hasNestingSelector: true};
		}

		default: {
			return {specificity: ZERO_SPECIFICITY, hasNestingSelector: false};
		}
	}
};

const getRuleSelectorSpecificity = (selector, nestingSpecificity) => {
	const {specificity, hasNestingSelector} = getSelectorSpecificity(selector, nestingSpecificity);
	const hasImpliedNestingSelector = !hasNestingSelector || selector.children.at(0)?.type === 'Combinator';

	return hasImpliedNestingSelector
		? addSpecificity(nestingSpecificity, specificity)
		: specificity;
};

const getRuleSpecificities = (rule, nestingSpecificity) => rule.prelude.children
	.filter(selector => canBeRepresentedByNestingSelector(selector))
	.map(selector => getRuleSelectorSpecificity(selector, nestingSpecificity));

const getParentStyleRule = (rule, context) => {
	const {sourceCode} = context;
	let ancestor = sourceCode.getParent(rule);

	while (ancestor) {
		if (ancestor.type === 'Rule') {
			return ancestor;
		}

		if (
			ancestor.type === 'Atrule'
			&& !TRANSPARENT_GROUP_RULES.has(normalizeCssIdentifier(ancestor.name))
		) {
			return;
		}

		ancestor = sourceCode.getParent(ancestor);
	}
};

export {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	compareSpecificity,
	getMaximumSpecificity,
	getParentStyleRule,
	getRuleSelectorSpecificity,
	getRuleSpecificities,
	normalizeCssIdentifier,
};
