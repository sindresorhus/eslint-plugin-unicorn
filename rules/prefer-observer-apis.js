import {findVariable} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isCallExpression,
	isFunction,
	isMethodCall,
	isReferenceIdentifier,
} from './ast/index.js';
import {
	isGlobalIdentifier,
	isLeftHandSide,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	isUnknownType,
} from './utils/types.js';

const messages = {
	resize: 'Prefer ResizeObserver over a resize listener with layout reads.',
	scroll: 'Prefer IntersectionObserver over a scroll listener with layout reads.',
};

const observerMessageIds = new Set(Object.keys(messages));
const globalObjectNames = new Set(['globalThis', 'self', 'window']);
const layoutMethodNames = new Set(['getBoundingClientRect', 'getClientRects']);
const elementLayoutPropertyNames = new Set([
	'clientHeight',
	'clientLeft',
	'clientTop',
	'clientWidth',
	'offsetHeight',
	'offsetLeft',
	'offsetParent',
	'offsetTop',
	'offsetWidth',
	'scrollHeight',
	'scrollWidth',
]);
const viewportPropertyNames = new Set(['innerHeight', 'innerWidth']);
const visualViewportPropertyNames = new Set(['height', 'width']);
const domTypeNames = new Set([
	'Document',
	'Element',
	'HTMLElement',
	'Node',
	'SVGElement',
	'VisualViewport',
	'Window',
]);

const isDomTypeName = name =>
	domTypeNames.has(name)
	|| /^HTML\w*Element$/.test(name)
	|| /^SVG\w*Element$/.test(name);

const isKnownNonDomType = (type, checker, program) => {
	if (isUnknownType(type)) {
		return false;
	}

	if (isNullishType(type) || type.intrinsicName) {
		return true;
	}

	if (type.isUnion()) {
		return type.types.every(type => isKnownNonDomType(type, checker, program));
	}

	if (type.isIntersection()) {
		return type.types.every(type => isKnownNonDomType(type, checker, program));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isKnownNonDomType(constraint, checker, program);
	}

	const symbol = getTypeSymbol(type);
	if (!symbol) {
		return false;
	}

	const baseTypes = getBaseTypes(type, checker);
	if (baseTypes.some(type => !isKnownNonDomType(type, checker, program))) {
		return false;
	}

	if (!isDefaultLibrarySymbol(symbol, program)) {
		return true;
	}

	return !isDomTypeName(symbol.getName());
};

const isKnownNonDomNode = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const {program} = parserServices;
		const checker = program.getTypeChecker();
		return isKnownNonDomType(
			parserServices.getTypeAtLocation(node),
			checker,
			program,
		);
	} catch {
		return false;
	}
};

const getPropertyName = memberExpression => {
	if (
		!memberExpression.computed
		&& memberExpression.property.type === 'Identifier'
	) {
		return memberExpression.property.name;
	}

	return getStaticStringValue(unwrapTypeScriptExpression(memberExpression.property));
};

const getPatternPropertyName = property => {
	if (property.type !== 'Property') {
		return;
	}

	if (
		!property.computed
		&& property.key.type === 'Identifier'
	) {
		return property.key.name;
	}

	return getStaticStringValue(unwrapTypeScriptExpression(property.key));
};

const hasObjectPatternProperty = (objectPattern, propertyNames) =>
	objectPattern.properties.some(property => propertyNames.has(getPatternPropertyName(property)));

const isGlobalObject = (node, context) =>
	node.type === 'Identifier'
	&& globalObjectNames.has(node.name)
	&& isGlobalIdentifier(node, context);

const isWriteOnlyLeftHandSide = node =>
	isLeftHandSide(node)
	&& node.parent.type !== 'UpdateExpression'
	&& !(
		node.parent.type === 'AssignmentExpression'
		&& node.parent.left === node
		&& node.parent.operator !== '='
	);

const isGlobalDocument = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		return node.name === 'document' && isGlobalIdentifier(node, context);
	}

	return (
		node.type === 'MemberExpression'
		&& getPropertyName(node) === 'document'
		&& isGlobalObject(unwrapTypeScriptExpression(node.object), context)
	);
};

const isGlobalVisualViewport = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		return node.name === 'visualViewport' && isGlobalIdentifier(node, context);
	}

	return (
		node.type === 'MemberExpression'
		&& getPropertyName(node) === 'visualViewport'
		&& isGlobalObject(unwrapTypeScriptExpression(node.object), context)
	);
};

const isViewportPropertyRead = (memberExpression, context) => {
	const propertyName = getPropertyName(memberExpression);
	const object = unwrapTypeScriptExpression(memberExpression.object);

	return (
		viewportPropertyNames.has(propertyName)
		&& isGlobalObject(object, context)
	)
	|| (
		visualViewportPropertyNames.has(propertyName)
		&& isGlobalVisualViewport(object, context)
	);
};

const isNonElementLayoutObject = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	return isGlobalObject(node, context)
		|| isGlobalDocument(node, context)
		|| isGlobalVisualViewport(node, context);
};

const isElementLayoutPropertyRead = (memberExpression, context) =>
	elementLayoutPropertyNames.has(getPropertyName(memberExpression))
	&& !isNonElementLayoutObject(memberExpression.object, context)
	&& !isKnownNonDomNode(memberExpression.object, context);

const isViewportIdentifierRead = (node, context) =>
	isReferenceIdentifier(node)
	&& viewportPropertyNames.has(node.name)
	&& !isWriteOnlyLeftHandSide(node)
	&& isGlobalIdentifier(node, context);

const isLayoutPropertyRead = (node, context) =>
	isViewportIdentifierRead(node, context)
	|| (
		node.type === 'MemberExpression'
		&& !isWriteOnlyLeftHandSide(node)
		&& (
			isViewportPropertyRead(node, context)
			|| isElementLayoutPropertyRead(node, context)
		)
	);

const isLayoutDestructuringRead = (pattern, source, context) => {
	const initializer = unwrapTypeScriptExpression(source);
	return (
		hasObjectPatternProperty(pattern, viewportPropertyNames)
		&& isGlobalObject(initializer, context)
	)
	|| (
		hasObjectPatternProperty(pattern, visualViewportPropertyNames)
		&& isGlobalVisualViewport(initializer, context)
	)
	|| (
		hasObjectPatternProperty(pattern, elementLayoutPropertyNames)
		&& !isNonElementLayoutObject(initializer, context)
		&& !isKnownNonDomNode(source, context)
	);
};

const isLayoutDestructuringNode = (node, context) => {
	if (
		node.type === 'VariableDeclarator'
		&& node.id.type === 'ObjectPattern'
		&& node.init
	) {
		return isLayoutDestructuringRead(node.id, node.init, context);
	}

	if (
		node.type === 'AssignmentExpression'
		&& node.left.type === 'ObjectPattern'
	) {
		return isLayoutDestructuringRead(node.left, node.right, context);
	}

	return false;
};

const isLayoutMethodCall = (node, context) =>
	isCallExpression(node, {
		argumentsLength: 0,
	})
	&& node.callee.type === 'MemberExpression'
	&& layoutMethodNames.has(getPropertyName(node.callee))
	&& !isNonElementLayoutObject(node.callee.object, context)
	&& !isKnownNonDomNode(node.callee.object, context);

const containsLayoutRead = (node, context, root = node) => {
	if (!node) {
		return false;
	}

	if (node !== root && isFunction(node)) {
		return false;
	}

	if (
		isLayoutMethodCall(node, context)
		|| isLayoutPropertyRead(node, context)
		|| isLayoutDestructuringNode(node, context)
	) {
		return true;
	}

	const keys = context.sourceCode.visitorKeys[node.type] ?? [];
	for (const key of keys) {
		const child = node[key];
		if (Array.isArray(child)) {
			if (child.some(node => containsLayoutRead(node, context, root))) {
				return true;
			}

			continue;
		}

		if (containsLayoutRead(child, context, root)) {
			return true;
		}
	}

	return false;
};

const getListenerFunction = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (isFunction(node)) {
		return node;
	}

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (definition.type === 'FunctionName') {
		return definition.node;
	}

	const initializer = definition.node.init && unwrapTypeScriptExpression(definition.node.init);
	if (
		definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& initializer
		&& isFunction(initializer)
	) {
		return initializer;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'addEventListener',
			minimumArguments: 2,
			maximumArguments: 3,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		if (isKnownNonDomNode(node.callee.object, context)) {
			return;
		}

		const [eventNameNode, listenerNode] = node.arguments;
		const eventName = getStaticStringValue(unwrapTypeScriptExpression(eventNameNode));
		if (
			!eventName
			|| !observerMessageIds.has(eventName)
		) {
			return;
		}

		const listener = getListenerFunction(listenerNode, context);
		if (!listener || !containsLayoutRead(listener.body, context)) {
			return;
		}

		return {
			node: eventNameNode,
			messageId: eventName,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer observer APIs over resize and scroll listeners with layout reads.',
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
