import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isCallExpression,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import {
	isKnownNonDomNode,
	isNodeValueNotDomNode,
	isSameReference,
	isValueNotUsable,
	mayBeHtmlTemplateElement,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	shouldReportReplaceChildrenReceiver,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-dom-node-replace-children';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over manually emptying DOM children.',
};

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

const isInnerHTMLMemberExpression = node =>
	isMemberExpression(node)
	&& getStaticPropertyName(node) === 'innerHTML';

const isEmptyString = node => getStaticStringValue(node) === '';

const getStaticString = node => getStaticStringValue(unwrapTypeScriptExpression(node));

const isStaticMethodCall = (node, method, options) =>
	isCallExpression(node, {
		...options,
		optional: false,
	})
	&& isMemberExpression(node.callee, {optional: false})
	&& getStaticPropertyName(node.callee) === method;

const isUnknownOrHtmlNamespace = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	const string = getStaticStringValue(node);
	if (string !== undefined) {
		return string === HTML_NAMESPACE;
	}

	const result = getStaticValue(node, context.sourceCode.getScope(node));
	return !result || result.value === HTML_NAMESPACE;
};

const mayCreateHtmlTemplateElement = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (
		isStaticMethodCall(node, 'createElement', {
			minimumArguments: 1,
			maximumArguments: 2,
		})
	) {
		return getStaticString(node.arguments[0])?.toLowerCase() === 'template';
	}

	if (
		!isStaticMethodCall(node, 'createElementNS', {
			minimumArguments: 2,
			maximumArguments: 3,
		})
		|| getStaticString(node.arguments[1])?.toLowerCase() !== 'template'
	) {
		return false;
	}

	return isUnknownOrHtmlNamespace(node.arguments[0], context);
};

const getOnlyBodyStatement = node => {
	if (node.body.type !== 'BlockStatement') {
		return node.body;
	}

	return node.body.body.length === 1
		? node.body.body[0]
		: undefined;
};

const getChildNodeMemberExpression = node => {
	if (
		isMemberExpression(node, {
			properties: ['firstChild', 'lastChild'],
			optional: false,
		})
	) {
		return node;
	}
};

const containsChainExpression = (node, sourceCode) => {
	if (node.type === 'ChainExpression') {
		return true;
	}

	const keys = sourceCode.visitorKeys[node.type] ?? [];
	for (const key of keys) {
		const child = node[key];
		if (Array.isArray(child)) {
			for (const childNode of child) {
				if (childNode && containsChainExpression(childNode, sourceCode)) {
					return true;
				}
			}

			continue;
		}

		if (child && containsChainExpression(child, sourceCode)) {
			return true;
		}
	}

	return false;
};

const getParentNodeText = (parentNode, context) => {
	const {sourceCode} = context;

	return (
		parentNode.type !== 'Super'
		&& shouldAddParenthesesToMemberExpressionObject(parentNode, context)
	)
		? `(${sourceCode.getText(parentNode)})`
		: sourceCode.getText(parentNode);
};

const getReplaceChildrenStatement = (node, parentNode, context) => {
	const parentNodeText = getParentNodeText(parentNode, context);
	return `${needsSemicolon(context.sourceCode.getTokenBefore(node), context, parentNodeText) ? ';' : ''}${parentNodeText}.replaceChildren();`;
};

const shouldSkipParentNode = (parentNode, context, options) => {
	const {sourceCode} = context;

	return isNodeValueNotDomNode(parentNode)
		|| isKnownNonDomNode(parentNode, context, {
			allowNullishInMixedUnion: true,
			treatMixedUnionAsNonTarget: true,
		})
		|| containsChainExpression(parentNode, sourceCode)
		|| !shouldReportReplaceChildrenReceiver(context, parentNode, options);
};

const shouldSkipInnerHTMLParentNode = (parentNode, context) =>
	shouldSkipParentNode(parentNode, context, {checkInnerHTML: true});

const getInnerHTMLProblem = (context, node) => {
	if (
		node.operator !== '='
		|| !isInnerHTMLMemberExpression(node.left)
		|| !isEmptyString(node.right)
	) {
		return;
	}

	const parentNode = node.left.object;
	if (
		shouldSkipInnerHTMLParentNode(parentNode, context)
		|| mayCreateHtmlTemplateElement(parentNode, context)
		|| mayBeHtmlTemplateElement(context, parentNode)
	) {
		return;
	}

	const replacement = getReplaceChildrenStatement(node.parent, parentNode, context);
	const fix = (
		node.parent.type === 'ExpressionStatement'
		&& isValueNotUsable(node)
		&& !wouldRemoveComments(context, node.parent, [parentNode])
	)
		? fixer => fixer.replaceText(node.parent, replacement)
		: undefined;

	return {
		node: node.left.property,
		messageId: MESSAGE_ID,
		data: {
			replacement: `${getParentNodeText(parentNode, context)}.replaceChildren()`,
		},
		fix,
	};
};

const getRemoveChildLoopProblem = (context, node) => {
	const childNode = getChildNodeMemberExpression(node.test);
	if (!childNode) {
		return;
	}

	const bodyStatement = getOnlyBodyStatement(node);
	if (bodyStatement?.type !== 'ExpressionStatement') {
		return;
	}

	const {expression} = bodyStatement;
	if (
		!isMethodCall(expression, {
			method: 'removeChild',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isSameReference(childNode.object, expression.callee.object)
		|| !isSameReference(childNode, expression.arguments[0])
	) {
		return;
	}

	const parentNode = childNode.object;
	if (shouldSkipParentNode(parentNode, context)) {
		return;
	}

	const replacement = getReplaceChildrenStatement(node, parentNode, context);
	const fix = wouldRemoveComments(context, node, [parentNode])
		? undefined
		: fixer => fixer.replaceText(node, replacement);

	return {
		node,
		messageId: MESSAGE_ID,
		data: {
			replacement: `${getParentNodeText(parentNode, context)}.replaceChildren()`,
		},
		fix,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('AssignmentExpression', node => getInnerHTMLProblem(context, node));
	context.on('WhileStatement', node => getRemoveChildLoopProblem(context, node));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.replaceChildren()` when emptying DOM children.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
