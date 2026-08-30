import {ident} from '@eslint/css-tree';

const MESSAGE_ID = 'no-nesting-with-mixed-specificity';
const messages = {
	[MESSAGE_ID]: 'Do not nest rules under selector lists with mixed specificity.',
};

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

const normalizeIdentifier = identifier => ident.decode(identifier).toLowerCase();

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
	const selectors = selectorArgument?.type === 'Selector' ? [selectorArgument] : selectorArgument?.children ?? [];
	const results = selectors.map(selector => getSelectorSpecificity(selector, nestingSpecificity));

	return {
		specificity: getMaximumSpecificity(results.map(({specificity}) => specificity)),
		hasNestingSelector: results.some(({hasNestingSelector}) => hasNestingSelector),
	};
};

const getPseudoClassSpecificity = (node, nestingSpecificity) => {
	const name = normalizeIdentifier(node.name);
	const selectorArgumentResult = getSelectorArgumentSpecificity(getSelectorArgument(node), nestingSpecificity);

	if (name === 'where') {
		return {
			specificity: ZERO_SPECIFICITY,
			hasNestingSelector: selectorArgumentResult.hasNestingSelector,
		};
	}

	if (SELECTOR_LIST_PSEUDO_CLASSES.has(name)) {
		return selectorArgumentResult;
	}

	if (
		NTH_PSEUDO_CLASSES.has(name)
		|| name === 'host'
		|| name === 'host-context'
	) {
		return {
			specificity: addSpecificity([0, 1, 0], selectorArgumentResult.specificity),
			hasNestingSelector: selectorArgumentResult.hasNestingSelector,
		};
	}

	return {
		specificity: LEGACY_PSEUDO_ELEMENTS.has(name) ? [0, 0, 1] : [0, 1, 0],
		hasNestingSelector: false,
	};
};

const getPseudoElementSpecificity = (node, nestingSpecificity) => {
	const selectorArgumentResult = normalizeIdentifier(node.name) === 'slotted'
		? getSelectorArgumentSpecificity(getSelectorArgument(node), nestingSpecificity)
		: {specificity: ZERO_SPECIFICITY, hasNestingSelector: false};

	return {
		specificity: addSpecificity([0, 0, 1], selectorArgumentResult.specificity),
		hasNestingSelector: selectorArgumentResult.hasNestingSelector,
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

const getRuleSpecificities = (rule, nestingSpecificity, isNested) => rule.prelude.children.map(selector => {
	const result = getSelectorSpecificity(selector, nestingSpecificity);
	return isNested && !result.hasNestingSelector
		? addSpecificity(nestingSpecificity, result.specificity)
		: result.specificity;
});

const hasMixedSpecificity = specificities => specificities.some(specificity => compareSpecificity(specificity, specificities[0]) !== 0);

const getParentStyleRule = (rule, sourceCode) => {
	let ancestor = sourceCode.getParent(rule);

	while (ancestor) {
		if (ancestor.type === 'Rule') {
			return ancestor;
		}

		if (
			ancestor.type === 'Atrule'
			&& !TRANSPARENT_GROUP_RULES.has(normalizeIdentifier(ancestor.name))
		) {
			return;
		}

		ancestor = sourceCode.getParent(ancestor);
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const ruleSpecificities = new WeakMap();

	context.on('Rule', rule => {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const parentRule = getParentStyleRule(rule, sourceCode);
		const parentSpecificities = parentRule && ruleSpecificities.get(parentRule);
		const nestingSpecificity = getMaximumSpecificity(parentSpecificities ?? []);
		const specificities = getRuleSpecificities(rule, nestingSpecificity, Boolean(parentRule));
		ruleSpecificities.set(rule, specificities);

		if (parentSpecificities && hasMixedSpecificity(parentSpecificities)) {
			return {
				node: rule.prelude,
				messageId: MESSAGE_ID,
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
			description: 'Disallow nesting under selector lists with mixed specificity.',
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
