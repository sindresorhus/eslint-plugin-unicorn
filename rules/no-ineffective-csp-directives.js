import {decodeHTMLAttribute} from 'entities';
import {isStringLiteral} from './ast/index.js';
import {getStaticValueForControlFlow, isHtmlRcdataNode, toLocation} from './utils/index.js';

const MESSAGE_ID = 'no-ineffective-csp-directives';
const messages = {
	[MESSAGE_ID]: 'The CSP directive `{{directive}}` is ignored in `<meta>` elements. Deliver it through the `Content-Security-Policy` HTTP response header instead.',
};

const ineffectiveDirectives = new Set([
	'frame-ancestors',
	'sandbox',
	'report-uri',
]);

function * getProblems(value, node, location) {
	const reportedDirectives = new Set();

	for (const token of value.split(';')) {
		const directive = token.match(/^[\t\n\f\r ]*([^\t\n\f\r ]+)/u)?.[1].toLowerCase();
		if (!ineffectiveDirectives.has(directive) || reportedDirectives.has(directive)) {
			continue;
		}

		reportedDirectives.add(directive);
		yield {
			node,
			...location && {loc: location},
			messageId: MESSAGE_ID,
			data: {directive},
		};
	}
}

const getHtmlAttributes = (node, context) => {
	// The HTML parser stops reading attributes at an unquoted `/` and can mistake a quoted `>` for the tag's end, so read the complete opening tag.
	const start = context.sourceCode.getRange(node.openStart)[1];
	const source = context.sourceCode.text.slice(start).match(/^(?:[^"'<>]|"[^"]*"|'[^']*')*>/u)?.[0];
	if (!source) {
		return;
	}

	const templateDelimiters = Object.keys(context.languageOptions?.templateEngineSyntax ?? {});
	if (templateDelimiters.some(delimiter => source.includes(delimiter))) {
		return;
	}

	const attributes = new Map();
	const attributePattern = /([^\t\n\f\r /=>]+)(?:[\t\n\f\r ]*=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r "'<>`]+)))?/dgu;
	for (const match of source.matchAll(attributePattern)) {
		const name = match[1].toLowerCase();
		if (!['http-equiv', 'content'].includes(name) || attributes.has(name)) {
			continue;
		}

		const valueIndex = [2, 3, 4].find(index => match[index] !== undefined);
		const value = match[valueIndex];
		if (value === undefined) {
			attributes.set(name, undefined);
			continue;
		}

		const range = match.indices[valueIndex].map(index => start + index);
		attributes.set(name, {value: decodeHTMLAttribute(value), location: toLocation(range, context)});
	}

	return attributes;
};

const getJsxAttributeValue = (attribute, context) => {
	const {value} = attribute;
	if (isStringLiteral(value)) {
		return value.value;
	}

	if (value?.type === 'JSXExpressionContainer') {
		const staticValue = getStaticValueForControlFlow(value.expression, context)?.value;
		if (typeof staticValue === 'string') {
			return staticValue;
		}
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Tag', node => {
		if (node.name.toLowerCase() !== 'meta' || isHtmlRcdataNode(node)) {
			return;
		}

		const attributes = getHtmlAttributes(node, context);
		if (attributes?.get('http-equiv')?.value.toLowerCase() !== 'content-security-policy') {
			return;
		}

		const content = attributes.get('content');
		if (content) {
			return getProblems(content.value, node, content.location);
		}
	});

	context.on('JSXOpeningElement', node => {
		if (
			node.name.type !== 'JSXIdentifier'
			|| node.name.name !== 'meta'
			|| node.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')
		) {
			return;
		}

		const headerAttributes = node.attributes.filter(attribute => attribute.name.type === 'JSXIdentifier' && ['httpEquiv', 'http-equiv'].includes(attribute.name.name));
		const contentAttributes = node.attributes.filter(attribute => attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'content');
		if (headerAttributes.length !== 1 || contentAttributes.length !== 1) {
			return;
		}

		const header = getJsxAttributeValue(headerAttributes[0], context);
		if (header?.toLowerCase() !== 'content-security-policy') {
			return;
		}

		const contentAttribute = contentAttributes[0];
		const content = getJsxAttributeValue(contentAttribute, context);
		if (content !== undefined) {
			return getProblems(content, contentAttribute.value);
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
			description: 'Disallow ineffective CSP directives in `<meta>` elements.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
			'html/html',
		],
	},
};

export default config;
