import {getStaticStringValue, isMethodCall, isMemberExpression} from './ast/index.js';
import {isNodeValueNotDomNode, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-selector-as-dom-name';
const messages = {
	[MESSAGE_ID]: 'Do not use selector syntax in DOM names.',
};

const classListMethods = ['add', 'remove', 'contains', 'toggle', 'replace'];

const simpleSelectorPattern = /^[#.]-?[A-Z_a-z][\w-]*$/u;
const selectorPrefixes = new Set(['.', '#']);

const isClassList = node => isMemberExpression(node, {
	property: 'classList',
	computed: false,
});

const isSelectorAsDomName = value => selectorPrefixes.has(value?.[0]);

const isNotDomNode = node => isNodeValueNotDomNode(unwrapTypeScriptExpression(node));

const getDomNameValue = node =>
	getStaticStringValue(node)
	?? (
		node.type === 'TemplateLiteral'
		&& node.quasis[0].value.cooked
	);

const getPrefixRange = (node, sourceCode) => {
	const [start] = sourceCode.getRange(node);
	return [start + 1, start + 2];
};

const getFix = (node, value, expectedPrefix, sourceCode) => {
	const prefixRange = getPrefixRange(node, sourceCode);

	if (
		!value.startsWith(expectedPrefix)
		|| sourceCode.text[prefixRange[0]] !== expectedPrefix
	) {
		return;
	}

	if (
		node.type === 'TemplateLiteral'
		&& node.expressions.length > 0
	) {
		if (
			node.expressions.length !== 1
			|| node.quasis[0].value.cooked !== expectedPrefix
			|| node.quasis[1].value.cooked !== ''
		) {
			return;
		}

		return fixer => fixer.removeRange(prefixRange);
	}

	if (!simpleSelectorPattern.test(value)) {
		return;
	}

	return fixer => fixer.removeRange(prefixRange);
};

const getProblem = (node, value, expectedPrefix, sourceCode) => ({
	node,
	messageId: MESSAGE_ID,
	fix: getFix(node, value, expectedPrefix, sourceCode),
});

const toDomNameArguments = (arguments_, expectedPrefix) => arguments_.map(node => ({node, expectedPrefix}));

const getDomNameArguments = node => {
	if (
		isMethodCall(node, {
			methods: classListMethods,
		})
		&& isClassList(node.callee.object)
		&& !isNotDomNode(node.callee.object.object)
	) {
		const method = node.callee.property.name;

		if (method === 'add' || method === 'remove') {
			return toDomNameArguments(node.arguments, '.');
		}

		if (method === 'replace') {
			if (node.arguments[0]?.type === 'SpreadElement') {
				return [];
			}

			return toDomNameArguments(node.arguments.slice(0, 2), '.');
		}

		return toDomNameArguments(node.arguments.slice(0, 1), '.');
	}

	if (
		isMethodCall(node, {
			methods: ['getElementById', 'getElementsByClassName'],
			argumentsLength: 1,
		})
		&& !isNotDomNode(node.callee.object)
	) {
		const prefix = node.callee.property.name === 'getElementById' ? '#' : '.';
		return toDomNameArguments(node.arguments, prefix);
	}

	return [];
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', function * (node) {
		for (const {node: argument, expectedPrefix} of getDomNameArguments(node)) {
			if (argument.type === 'SpreadElement') {
				continue;
			}

			const staticArgument = unwrapTypeScriptExpression(argument);
			const value = getDomNameValue(staticArgument);
			if (isSelectorAsDomName(value)) {
				yield getProblem(staticArgument, value, expectedPrefix, sourceCode);
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow selector syntax in DOM names.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
