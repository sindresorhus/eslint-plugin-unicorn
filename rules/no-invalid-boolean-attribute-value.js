import {findVariable} from '@eslint-community/eslint-utils';
import {parse, ident} from '@eslint/css-tree';
import {isCallExpression, isMemberExpression} from './ast/index.js';
import {getArgumentRemovalRange, removeArgument} from './fix/index.js';
import {
	getStaticValueForControlFlow,
	isGlobalIdentifier,
	wouldRemoveComments,
	withTypeInformation,
} from './utils/index.js';
import {
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	isUnknownType,
} from './utils/types.js';

const MESSAGE_ID = 'no-invalid-boolean-attribute-value';
const MESSAGE_ID_REMOVE = 'no-invalid-boolean-attribute-value/remove';
const MESSAGE_ID_EMPTY = 'no-invalid-boolean-attribute-value/empty';
const messages = {
	[MESSAGE_ID]: 'Invalid value for boolean attribute `{{attribute}}`. Use an empty string or the attribute name; remove the attribute to represent false.',
	[MESSAGE_ID_REMOVE]: 'Remove the `{{attribute}}` attribute.',
	[MESSAGE_ID_EMPTY]: 'Set the `{{attribute}}` attribute to an empty string.',
};

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const windowNames = new Set(['globalThis', 'self', 'window']);
const ambiguousSelectorTags = new Set(['a', 'script', 'style', 'title']);

// Native HTML tags and interfaces. Generic HTMLElement annotations cannot establish a native tag.
const htmlElementTagsByType = new Map([
	['HTMLAnchorElement', 'a'],
	['HTMLElement', 'abbr address article aside b bdi bdo cite code dd dfn dt em figcaption figure footer header hgroup i kbd main mark nav noscript rp rt ruby s samp search section small strong sub summary sup u var wbr'],
	['HTMLAreaElement', 'area'],
	['HTMLAudioElement', 'audio'],
	['HTMLBaseElement', 'base'],
	['HTMLQuoteElement', 'blockquote q'],
	['HTMLBodyElement', 'body'],
	['HTMLBRElement', 'br'],
	['HTMLButtonElement', 'button'],
	['HTMLCanvasElement', 'canvas'],
	['HTMLTableCaptionElement', 'caption'],
	['HTMLTableColElement', 'col colgroup'],
	['HTMLDataElement', 'data'],
	['HTMLDataListElement', 'datalist'],
	['HTMLModElement', 'del ins'],
	['HTMLDetailsElement', 'details'],
	['HTMLDialogElement', 'dialog'],
	['HTMLDivElement', 'div'],
	['HTMLDListElement', 'dl'],
	['HTMLEmbedElement', 'embed'],
	['HTMLFieldSetElement', 'fieldset'],
	['HTMLFormElement', 'form'],
	['HTMLHeadingElement', 'h1 h2 h3 h4 h5 h6'],
	['HTMLHeadElement', 'head'],
	['HTMLHRElement', 'hr'],
	['HTMLHtmlElement', 'html'],
	['HTMLIFrameElement', 'iframe'],
	['HTMLImageElement', 'img'],
	['HTMLInputElement', 'input'],
	['HTMLLabelElement', 'label'],
	['HTMLLegendElement', 'legend'],
	['HTMLLIElement', 'li'],
	['HTMLLinkElement', 'link'],
	['HTMLMapElement', 'map'],
	['HTMLMenuElement', 'menu'],
	['HTMLMetaElement', 'meta'],
	['HTMLMeterElement', 'meter'],
	['HTMLObjectElement', 'object'],
	['HTMLOListElement', 'ol'],
	['HTMLOptGroupElement', 'optgroup'],
	['HTMLOptionElement', 'option'],
	['HTMLOutputElement', 'output'],
	['HTMLParagraphElement', 'p'],
	['HTMLPictureElement', 'picture'],
	['HTMLPreElement', 'pre'],
	['HTMLProgressElement', 'progress'],
	['HTMLScriptElement', 'script'],
	['HTMLSelectElement', 'select'],
	['HTMLSelectedContentElement', 'selectedcontent'],
	['HTMLSlotElement', 'slot'],
	['HTMLSourceElement', 'source'],
	['HTMLSpanElement', 'span'],
	['HTMLStyleElement', 'style'],
	['HTMLTableElement', 'table'],
	['HTMLTableSectionElement', 'tbody tfoot thead'],
	['HTMLTableCellElement', 'td th'],
	['HTMLTemplateElement', 'template'],
	['HTMLTextAreaElement', 'textarea'],
	['HTMLTimeElement', 'time'],
	['HTMLTitleElement', 'title'],
	['HTMLTableRowElement', 'tr'],
	['HTMLTrackElement', 'track'],
	['HTMLUListElement', 'ul'],
	['HTMLVideoElement', 'video'],
]);
const htmlElementTypesByTag = new Map([...htmlElementTagsByType].flatMap(([type, tags]) => tags.split(' ').map(tag => [tag, type])));
const nativeElementTypes = new Set(htmlElementTagsByType.keys().filter(type => type !== 'HTMLElement'));

// https://html.spec.whatwg.org/multipage/indices.html#attributes-3
const globalBooleanAttributes = new Set(['autofocus', 'headingreset', 'inert', 'itemscope']);
const booleanAttributeTypes = new Map([
	['allowfullscreen', ['HTMLIFrameElement']],
	['alpha', ['HTMLInputElement']],
	['async', ['HTMLScriptElement']],
	['autoplay', ['HTMLAudioElement', 'HTMLVideoElement']],
	['checked', ['HTMLInputElement']],
	['controls', ['HTMLAudioElement', 'HTMLVideoElement', 'HTMLImageElement']],
	['default', ['HTMLTrackElement']],
	['defer', ['HTMLScriptElement']],
	['disabled', ['HTMLButtonElement', 'HTMLInputElement', 'HTMLOptGroupElement', 'HTMLOptionElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLFieldSetElement', 'HTMLLinkElement']],
	['formnovalidate', ['HTMLButtonElement', 'HTMLInputElement']],
	['ismap', ['HTMLImageElement']],
	['loop', ['HTMLAudioElement', 'HTMLVideoElement']],
	['multiple', ['HTMLInputElement', 'HTMLSelectElement']],
	['muted', ['HTMLAudioElement', 'HTMLVideoElement']],
	['nomodule', ['HTMLScriptElement']],
	['novalidate', ['HTMLFormElement']],
	['open', ['HTMLDetailsElement', 'HTMLDialogElement']],
	['playsinline', ['HTMLVideoElement']],
	['readonly', ['HTMLInputElement', 'HTMLTextAreaElement']],
	['required', ['HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement']],
	['reversed', ['HTMLOListElement']],
	['selected', ['HTMLOptionElement']],
	['shadowrootclonable', ['HTMLTemplateElement']],
	['shadowrootcustomelementregistry', ['HTMLTemplateElement']],
	['shadowrootdelegatesfocus', ['HTMLTemplateElement']],
	['shadowrootserializable', ['HTMLTemplateElement']],
]);

const toAsciiLowerCase = string => string.replaceAll(/[A-Z]/g, character => character.toLowerCase());

const getStaticString = (node, context) => {
	const result = getStaticValueForControlFlow(node, context);
	return typeof result?.value === 'string' ? result.value : undefined;
};

const getMemberName = (node, context) => {
	if (node.computed) {
		return getStaticString(node.property, context);
	}

	return node.property.type === 'Identifier' ? node.property.name : undefined;
};

const getVariableDefinition = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	return {variable, definition: variable?.defs.length === 1 ? variable.defs[0] : undefined};
};

const getVariableInitializer = definition => definition?.type === 'Variable'
	&& definition.node.id === definition.name
	? definition.node.init
	: undefined;

function isDocument(node, context, visitedVariables = new Set()) {
	if (node.type === 'Identifier') {
		if (node.name === 'document' && isGlobalIdentifier(node, context)) {
			return true;
		}

		const {variable, definition} = getVariableDefinition(node, context);
		const initializer = definition?.parent?.kind === 'const' ? getVariableInitializer(definition) : undefined;
		if (!initializer || visitedVariables.has(variable)) {
			return false;
		}

		visitedVariables.add(variable);
		return isDocument(initializer, context, visitedVariables);
	}

	return isMemberExpression(node, {optional: false})
		&& getMemberName(node, context) === 'document'
		&& node.object.type === 'Identifier'
		&& windowNames.has(node.object.name)
		&& isGlobalIdentifier(node.object, context);
}

function getSelectorTag(selector) {
	try {
		const selectors = parse(selector, {context: 'selectorList'}).children.toArray();
		if (selectors.length !== 1) {
			return;
		}

		const nodes = selectors[0].children.toArray();
		if (
			nodes[0]?.type !== 'TypeSelector'
			|| nodes.slice(1).some(node => node.type !== 'ClassSelector' && node.type !== 'IdSelector')
		) {
			return;
		}

		const tag = toAsciiLowerCase(ident.decode(nodes[0].name));
		return ambiguousSelectorTags.has(tag) ? undefined : tag;
	} catch {
		// Unparseable and unsupported selectors do not establish a native HTML receiver.
	}
}

function getTypesFromAnnotation(node, context, visitedTypes = new Set()) {
	if (node?.type === 'TSTypeAnnotation' || node?.type === 'TSParenthesizedType') {
		return getTypesFromAnnotation(node.typeAnnotation, context, visitedTypes);
	}

	if (node?.type === 'TSNullKeyword' || node?.type === 'TSUndefinedKeyword') {
		return new Set();
	}

	if (node?.type === 'TSUnionType') {
		const types = new Set();
		for (const member of node.types) {
			const memberTypes = getTypesFromAnnotation(member, context, visitedTypes);
			if (!memberTypes) {
				return;
			}

			for (const type of memberTypes) {
				types.add(type);
			}
		}

		return types;
	}

	if (node?.type !== 'TSTypeReference' || node.typeName.type !== 'Identifier') {
		return;
	}

	const {variable, definition} = getVariableDefinition(node.typeName, context);
	if (!variable?.defs.length) {
		return nativeElementTypes.has(node.typeName.name) ? new Set([node.typeName.name]) : undefined;
	}

	if (definition?.node.type !== 'TSTypeAliasDeclaration' || visitedTypes.has(variable)) {
		return;
	}

	visitedTypes.add(variable);
	const types = getTypesFromAnnotation(definition.node.typeAnnotation, context, visitedTypes);
	visitedTypes.delete(variable);
	return types;
}

function getNativeTypes(type, program) {
	if (isUnknownType(type)) {
		return;
	}

	if (isNullishType(type)) {
		return new Set();
	}

	if (type.isUnion()) {
		const types = new Set();
		for (const member of type.types) {
			const memberTypes = getNativeTypes(member, program);
			if (!memberTypes) {
				return;
			}

			for (const type of memberTypes) {
				types.add(type);
			}
		}

		return types;
	}

	const symbol = getTypeSymbol(type);
	if (
		!nativeElementTypes.has(symbol?.getName())
		|| !isDefaultLibrarySymbol(symbol, program)
	) {
		return;
	}

	return new Set([symbol.getName()]);
}

// Type information is optional, including when a project cannot be resolved.
const getTypesFromTypeInformation = (node, context) =>
	withTypeInformation(node, context, ({type, program}) => getNativeTypes(type, program));

function getReceiverTypes(node, context, visitedVariables = new Set()) {
	if (['ChainExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'ParenthesizedExpression'].includes(node.type)) {
		return getReceiverTypes(node.expression, context, visitedVariables);
	}

	if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
		return getTypesFromAnnotation(node.typeAnnotation, context)
			?? getTypesFromTypeInformation(node, context);
	}

	if (node.type === 'Identifier') {
		const {variable, definition} = getVariableDefinition(node, context);
		if (visitedVariables.has(variable)) {
			return;
		}

		const initializer = getVariableInitializer(definition);
		if (initializer) {
			visitedVariables.add(variable);
			const types = getReceiverTypes(initializer, context, visitedVariables);
			visitedVariables.delete(variable);
			// Preserve origin exclusions for mutable bindings, but rely on types for their native identity.
			if (types && (definition.parent.kind === 'const' || types.size === 0)) {
				return types;
			}
		}

		return getTypesFromAnnotation(definition?.name?.typeAnnotation, context)
			?? getTypesFromTypeInformation(node, context);
	}

	if (isCallExpression(node) && isMemberExpression(node.callee)) {
		const method = getMemberName(node.callee, context);
		if (!['createElement', 'createElementNS', 'querySelector'].includes(method)) {
			return getTypesFromTypeInformation(node, context);
		}

		if (!isDocument(node.callee.object, context)) {
			return new Set();
		}

		let tag;
		if (method === 'createElement' && node.arguments.length === 1) {
			const name = getStaticString(node.arguments[0], context);
			tag = name === undefined ? undefined : toAsciiLowerCase(name);
		} else if (
			method === 'createElementNS'
			&& node.arguments.length === 2
			&& getStaticString(node.arguments[0], context) === HTML_NAMESPACE
		) {
			tag = getStaticString(node.arguments[1], context);
		} else if (method === 'querySelector' && node.arguments.length === 1) {
			const selector = getStaticString(node.arguments[0], context);
			tag = selector === undefined ? undefined : getSelectorTag(selector);
		}

		const type = htmlElementTypesByTag.get(tag);
		// An empty set prevents inferred query/creation types from bypassing these exclusions.
		return new Set(type ? [type] : []);
	}

	return getTypesFromTypeInformation(node, context);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isCallExpression(node, {argumentsLength: 2})
			|| !isMemberExpression(node.callee)
			|| getMemberName(node.callee, context) !== 'setAttribute'
		) {
			return;
		}

		const [nameNode, valueNode] = node.arguments;
		const attributeName = getStaticString(nameNode, context);
		if (attributeName === undefined) {
			return;
		}

		const attribute = toAsciiLowerCase(attributeName);
		if (!globalBooleanAttributes.has(attribute) && !booleanAttributeTypes.has(attribute)) {
			return;
		}

		const result = getStaticValueForControlFlow(valueNode, context);
		if (!result || (result.value !== null && ['object', 'function', 'symbol'].includes(typeof result.value))) {
			return;
		}

		const value = toAsciiLowerCase(String(result.value));
		if (value === '' || value === attribute) {
			return;
		}

		const receiverTypes = getReceiverTypes(node.callee.object, context);
		if (
			!receiverTypes?.size
			|| (!globalBooleanAttributes.has(attribute) && [...receiverTypes].some(type => !booleanAttributeTypes.get(attribute).includes(type)))
		) {
			return;
		}

		const problem = {node: valueNode, messageId: MESSAGE_ID, data: {attribute}};
		const shouldRemove = value === 'false';
		const {sourceCode} = context;
		const removalRange = shouldRemove
			? [getArgumentRemovalRange(valueNode, context)[0], sourceCode.getRange(sourceCode.getLastToken(node))[0]]
			: sourceCode.getRange(valueNode);
		if (
			wouldRemoveComments(context, removalRange)
			|| (shouldRemove && wouldRemoveComments(context, node.callee.property))
		) {
			return problem;
		}

		problem.suggest = [{
			messageId: shouldRemove ? MESSAGE_ID_REMOVE : MESSAGE_ID_EMPTY,
			data: {attribute},
			* fix(fixer) {
				if (shouldRemove) {
					yield fixer.replaceText(node.callee.property, node.callee.computed ? '\'removeAttribute\'' : 'removeAttribute');
					yield removeArgument(fixer, valueNode, context);
				} else {
					yield fixer.replaceText(valueNode, '\'\'');
				}
			},
		}];
		return problem;
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
			description: 'Disallow invalid values for HTML boolean attributes.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
