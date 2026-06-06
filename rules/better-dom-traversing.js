import {isMethodCall, isMemberExpression, isNumericLiteral} from './ast/index.js';
import {escapeString, getParenthesizedText, isNodeValueNotDomNode} from './utils/index.js';

const MESSAGE_ID_FIRST_CHILD = 'first-child';
const MESSAGE_ID_FIRST_ELEMENT_CHILD = 'first-element-child';
const MESSAGE_ID_QUERY_SELECTOR = 'query-selector';
const MESSAGE_ID_CLOSEST = 'closest';
const MESSAGE_ID_MERGE_QUERY_SELECTOR = 'merge-query-selector';
const SUGGESTION_ID_FIRST_CHILD = 'suggestion-first-child';
const SUGGESTION_ID_FIRST_ELEMENT_CHILD = 'suggestion-first-element-child';
const SUGGESTION_ID_MERGE_QUERY_SELECTOR = 'suggestion-merge-query-selector';
const QUERY_SELECTOR_CALL = {
	method: 'querySelector',
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
};

const messages = {
	[MESSAGE_ID_FIRST_CHILD]: 'Prefer `.firstChild` over `.childNodes[0]`.',
	[MESSAGE_ID_FIRST_ELEMENT_CHILD]: 'Prefer `.firstElementChild` over `.children[0]`.',
	[MESSAGE_ID_QUERY_SELECTOR]: 'Consider `.querySelector()` over positional child traversal.',
	[MESSAGE_ID_CLOSEST]: 'Consider `.closest()` over chaining `.parentElement`.',
	[MESSAGE_ID_MERGE_QUERY_SELECTOR]: 'Consider merging chained `.querySelector()` calls.',
	[SUGGESTION_ID_FIRST_CHILD]: 'Switch to `.firstChild`.',
	[SUGGESTION_ID_FIRST_ELEMENT_CHILD]: 'Switch to `.firstElementChild`.',
	[SUGGESTION_ID_MERGE_QUERY_SELECTOR]: 'Merge the `.querySelector()` calls.',
};

const isNonOptionalMemberExpression = node =>
	node.type === 'MemberExpression'
	&& !node.optional;

const isDomCollectionMemberExpression = (node, property) =>
	isMemberExpression(node, {
		property,
		optional: false,
		computed: false,
	});

const isNumericIndexMemberExpression = node =>
	isNonOptionalMemberExpression(node)
	&& node.computed
	&& isNumericLiteral(node.property)
	&& Number.isInteger(node.property.value)
	&& node.property.value >= 0;

const getIndexedDomCollectionName = node => {
	if (!isNumericIndexMemberExpression(node)) {
		return;
	}

	if (isDomCollectionMemberExpression(node.object, 'childNodes')) {
		return 'childNodes';
	}

	if (isDomCollectionMemberExpression(node.object, 'children')) {
		return 'children';
	}
};

const isNestedIndexedDomCollection = node =>
	node.parent?.type === 'MemberExpression'
	&& node.parent.object === node
	&& isDomCollectionMemberExpression(node.parent, 'children')
	&& isNumericIndexMemberExpression(node.parent.parent);

const hasCommentsInside = (node, sourceCode) =>
	sourceCode.getCommentsInside(node).length > 0;

const getFirstChildSuggestion = (node, replacement, messageId, sourceCode) => {
	if (hasCommentsInside(node, sourceCode)) {
		return;
	}

	const [, end] = sourceCode.getRange(node);
	const [start] = sourceCode.getRange(node.object.property);

	return [
		{
			messageId,
			fix: fixer => fixer.replaceTextRange([start, end], replacement),
		},
	];
};

const isParentElementMemberExpression = node =>
	isMemberExpression(node, {
		property: 'parentElement',
		optional: false,
		computed: false,
	});

const getParentElementChainRoot = node => {
	while (isParentElementMemberExpression(node)) {
		node = node.object;
	}

	return node;
};

const isOutermostParentElementChain = node =>
	!isParentElementMemberExpression(node.parent)
	|| node.parent.object !== node;

const isStaticSelector = node =>
	(node.type === 'Literal' && typeof node.value === 'string')
	|| (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis[0].value.cooked !== undefined);

const getStaticSelectorValue = node => {
	if (node.type === 'Literal') {
		return node.value;
	}

	return node.quasis[0].value.cooked;
};

const getSelectorQuote = node =>
	node.type === 'Literal' && node.raw.startsWith('"') ? '"' : '\'';

const canMergeSelectorValues = selectors =>
	selectors.every(selector => !selector.includes(','));

const isQuerySelectorCall = node =>
	isMethodCall(node, QUERY_SELECTOR_CALL);

const isFollowedByStaticQuerySelectorCall = node =>
	node.parent?.type === 'MemberExpression'
	&& node.parent.object === node
	&& node.parent.parent?.callee === node.parent
	&& isQuerySelectorCall(node.parent.parent)
	&& isStaticSelector(node.parent.parent.arguments[0]);

const isPartOfChainExpression = node => {
	while (
		(node.parent?.type === 'MemberExpression' && node.parent.object === node)
		|| (node.parent?.type === 'CallExpression' && node.parent.callee === node)
	) {
		node = node.parent;
	}

	return node.parent?.type === 'ChainExpression';
};

const getQuerySelectorChain = node => {
	const calls = [];

	while (isQuerySelectorCall(node)) {
		const [selector] = node.arguments;
		if (!isStaticSelector(selector)) {
			break;
		}

		calls.push(node);
		node = node.callee.object;
	}

	if (
		calls.length < 2
		|| node.type === 'ChainExpression'
		|| isNodeValueNotDomNode(node)
	) {
		return;
	}

	const selectors = [];
	for (const call of calls) {
		selectors.unshift(getStaticSelectorValue(call.arguments[0]));
	}

	return {
		root: node,
		selectors,
		quoteNode: calls.at(-1).arguments[0],
	};
};

const getMergeQuerySelectorSuggestion = (node, querySelectorChain, context) => {
	const {sourceCode} = context;
	if (hasCommentsInside(node, sourceCode)) {
		return;
	}

	if (!canMergeSelectorValues(querySelectorChain.selectors)) {
		return;
	}

	const root = getParenthesizedText(querySelectorChain.root, context);
	const selector = querySelectorChain.selectors.join(' ');
	const replacement = `${root}.querySelector(${escapeString(selector, getSelectorQuote(querySelectorChain.quoteNode))})`;

	return [
		{
			messageId: SUGGESTION_ID_MERGE_QUERY_SELECTOR,
			fix: fixer => fixer.replaceText(node, replacement),
		},
	];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		const collectionName = getIndexedDomCollectionName(node);
		if (
			!collectionName
			|| isNodeValueNotDomNode(node.object.object)
			|| isNestedIndexedDomCollection(node)
		) {
			return;
		}

		const index = node.property.value;
		if (collectionName === 'childNodes' && index === 0) {
			return {
				node,
				messageId: MESSAGE_ID_FIRST_CHILD,
				suggest: getFirstChildSuggestion(node, 'firstChild', SUGGESTION_ID_FIRST_CHILD, sourceCode),
			};
		}

		if (collectionName === 'children' && index === 0) {
			return {
				node,
				messageId: MESSAGE_ID_FIRST_ELEMENT_CHILD,
				suggest: getFirstChildSuggestion(node, 'firstElementChild', SUGGESTION_ID_FIRST_ELEMENT_CHILD, sourceCode),
			};
		}

		if (collectionName === 'children') {
			return {
				node,
				messageId: MESSAGE_ID_QUERY_SELECTOR,
			};
		}
	});

	context.on('MemberExpression', node => {
		if (
			!isParentElementMemberExpression(node)
			|| !isParentElementMemberExpression(node.object)
			|| !isOutermostParentElementChain(node)
			|| isNodeValueNotDomNode(getParentElementChainRoot(node))
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_CLOSEST,
		};
	});

	context.on('CallExpression', node => {
		if (
			!isQuerySelectorCall(node)
			|| isFollowedByStaticQuerySelectorCall(node)
			|| isPartOfChainExpression(node)
		) {
			return;
		}

		const querySelectorChain = getQuerySelectorChain(node);
		if (!querySelectorChain) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_MERGE_QUERY_SELECTOR,
			suggest: getMergeQuerySelectorSuggestion(node, querySelectorChain, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer better DOM traversal APIs.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
