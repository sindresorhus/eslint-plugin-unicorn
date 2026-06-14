import {getStaticStringValue, isMemberExpression} from './ast/index.js';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';

const MESSAGE_ID = 'no-unsafe-dom-html';
const messages = {
	[MESSAGE_ID]: 'Do not use unsafe DOM HTML APIs.',
};

const htmlAssignmentProperties = new Set([
	'innerHTML',
	'outerHTML',
	'srcdoc',
]);

const htmlMethods = new Set([
	'createContextualFragment',
	'insertAdjacentHTML',
	'setHTMLUnsafe',
]);

const getStaticPropertyName = memberExpression => {
	const {property} = memberExpression;

	if (
		!memberExpression.computed
		&& property.type === 'Identifier'
	) {
		return property.name;
	}

	return getStaticStringValue(property);
};

const unwrapChainExpression = node =>
	node.type === 'ChainExpression'
		? node.expression
		: node;

const getHtmlAssignmentProperty = node => {
	if (!isMemberExpression(node)) {
		return;
	}

	const property = getStaticPropertyName(node);
	return htmlAssignmentProperties.has(property) ? property : undefined;
};

const getHtmlMethod = node => {
	node = unwrapChainExpression(node);

	if (!isMemberExpression(node)) {
		return;
	}

	const method = getStaticPropertyName(node);

	return htmlMethods.has(method) ? method : undefined;
};

const isSrcdocSetAttributeCall = callExpression => {
	const callee = unwrapChainExpression(callExpression.callee);

	return isMemberExpression(callee)
		&& getStaticPropertyName(callee) === 'setAttribute'
		&& callExpression.arguments.length >= 2
		&& getStaticStringValue(callExpression.arguments[0])?.toLowerCase() === 'srcdoc';
};

const createGlobalHtmlMethodTracker = object => new GlobalReferenceTracker({
	object,
	type: GlobalReferenceTracker.CALL,
	handle: ({node}) => ({
		node: node.callee,
		messageId: MESSAGE_ID,
	}),
});

const globalHtmlMethodTrackers = [
	createGlobalHtmlMethodTracker('Document.parseHTMLUnsafe'),
	createGlobalHtmlMethodTracker('document.write'),
	createGlobalHtmlMethodTracker('document.writeln'),
];

const isHtmlSetter = node => {
	const {parent} = node;

	return (
		parent.type === 'AssignmentExpression'
		&& parent.left === node
	)
	|| (
		parent.type === 'AssignmentPattern'
		&& parent.left === node
	)
	|| (
		(
			parent.type === 'ForInStatement'
			|| parent.type === 'ForOfStatement'
		)
		&& parent.left === node
	)
	|| (
		parent.type === 'ArrayPattern'
		&& parent.elements.includes(node)
	)
	|| (
		parent.type === 'RestElement'
		&& parent.argument === node
	)
	|| (
		parent.type === 'Property'
		&& parent.value === node
		&& parent.parent.type === 'ObjectPattern'
		&& parent.parent.properties.includes(parent)
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	for (const tracker of globalHtmlMethodTrackers) {
		tracker.listen({context});
	}

	context.on('MemberExpression', node => {
		const property = getHtmlAssignmentProperty(node);
		if (
			!property
			|| !isHtmlSetter(node)
		) {
			return;
		}

		return {
			node: node.property,
			messageId: MESSAGE_ID,
		};
	});

	context.on('CallExpression', node => {
		const method = getHtmlMethod(node.callee);
		if (
			!method
			&& !isSrcdocSetAttributeCall(node)
		) {
			return;
		}

		return {
			node: unwrapChainExpression(node.callee).property,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unsafe DOM HTML APIs.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
