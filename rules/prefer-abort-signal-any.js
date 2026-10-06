import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isCallExpression,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {
	getBaseTypes,
	getConstVariableInitializer,
	getSingleStatement,
	getTypeSymbol,
	isArray,
	isDefaultLibrarySymbol,
	isGlobalIdentifier,
	isNullishType,
	isSameReference,
	isUnknownType,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';
import {
	getAbortControllerProblem,
	getAbortReference,
	getNextStatement,
	getSignalMembers,
	hasCommentBetween,
	isAbortControllerDeclarator,
	isStatementCommentFree,
} from './shared/abort-controller.js';

const MESSAGE_ID = 'prefer-abort-signal-any';
const SUGGESTION_ID = 'prefer-abort-signal-any/suggestion';
const listenerOptionNames = new Set([
	'capture',
	'once',
	'passive',
]);
const typeScriptArrayTypeExpressionWrappers = new Set([
	'TSAsExpression',
	'TSTypeAssertion',
	'TSSatisfiesExpression',
]);

const messages = {
	[MESSAGE_ID]: 'Prefer `AbortSignal.any()` over manually forwarding abort events between signals.',
	[SUGGESTION_ID]: 'Replace with `AbortSignal.any()`.',
};

const isAbortSignalType = (type, checker, program) => {
	if (isUnknownType(type)) {
		return;
	}

	if (isNullishType(type)) {
		return false;
	}

	if (type.isUnion()) {
		const types = type.types.filter(type => !isNullishType(type));
		if (types.length === 0) {
			return false;
		}

		const states = types.map(type => isAbortSignalType(type, checker, program));
		if (states.every(Boolean)) {
			return true;
		}

		return states.every(state => state === false) ? false : undefined;
	}

	if (type.isIntersection()) {
		const states = type.types.map(type => isAbortSignalType(type, checker, program));
		if (states.some(Boolean)) {
			return true;
		}

		return states.every(state => state === false) ? false : undefined;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isAbortSignalType(constraint, checker, program);
	}

	const symbol = getTypeSymbol(type);
	if (
		symbol
		&& isDefaultLibrarySymbol(symbol, program)
	) {
		return symbol.getName() === 'AbortSignal';
	}

	const baseTypes = getBaseTypes(type, checker).map(type => isAbortSignalType(type, checker, program));
	if (baseTypes.some(Boolean)) {
		return true;
	}

	return baseTypes.length > 0 && baseTypes.every(state => state === false) ? false : undefined;
};

const getAbortSignalTypeState = (node, context) =>
	withTypeInformation(node, context, ({type, checker, program}) => isAbortSignalType(type, checker, program));

const hasFullTypeInformation = context => Boolean(context.sourceCode.parserServices?.program);

const isAbortSignalStaticCall = (node, properties) =>
	isCallExpression(node, {
		optional: false,
	})
	&& isMemberExpression(node.callee, {
		object: 'AbortSignal',
		properties,
		computed: false,
		optional: false,
	});

const isAbortSignalCall = node => isAbortSignalStaticCall(node, ['any', 'timeout']);

const isAbortSignalAnyCall = node => isAbortSignalStaticCall(node, ['any']);

const isKnownAlreadyAbortedSignal = node => isAbortSignalStaticCall(unwrapTypeScriptExpression(node), ['abort']);

const isControllerSignal = (node, controllerName) => {
	node = unwrapTypeScriptExpression(node);

	return isMemberExpression(node, {
		property: 'signal',
		computed: false,
		optional: false,
	})
	&& node.object.type === 'Identifier'
	&& node.object.name === controllerName;
};

const getConstantInitializer = (node, context) => getConstVariableInitializer(unwrapTypeScriptExpression(node), context);

const isPossiblyMutatedConstantArray = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs[0];
	if (
		!variable
		|| variable.defs.length !== 1
		|| definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
	) {
		return false;
	}

	if (!definition.node.init) {
		return false;
	}

	const [, initializerEnd] = context.sourceCode.getRange(definition.node.init);
	const [nodeStart] = context.sourceCode.getRange(node);

	return variable.references.some(reference => {
		if (
			reference.init
			|| reference.identifier === node
		) {
			return false;
		}

		const [referenceStart] = context.sourceCode.getRange(reference.identifier);
		return referenceStart > initializerEnd && referenceStart < nodeStart;
	});
};

const isArrayStaticCall = (node, property, context) =>
	isCallExpression(node, {
		optional: false,
	})
	&& isMemberExpression(node.callee, {
		object: 'Array',
		property,
		computed: false,
		optional: false,
	})
	&& isGlobalIdentifier(node.callee.object, context);

const isArrayConstructorExpression = (node, context) =>
	(
		isCallExpression(node, {
			name: 'Array',
			optional: false,
		})
		|| isNewExpression(node, {
			name: 'Array',
		})
	)
	&& isGlobalIdentifier(node.callee, context);

// Whether the source can contain the controller's own signal or an already aborted signal. A source that cannot be resolved counts as one.
const hasUnsupportedSignalSource = (node, controllerName, context, seen = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (seen.has(node)) {
		return false;
	}

	seen.add(node);

	if (node.type === 'SpreadElement') {
		return true;
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.some(element => element && hasUnsupportedSignalSource(element, controllerName, context, seen));
	}

	if (isArrayStaticCall(node, 'of', context)) {
		return node.arguments.some(argument => hasUnsupportedSignalSource(argument, controllerName, context, seen));
	}

	if (isArrayConstructorExpression(node, context)) {
		return node.arguments.some(argument => hasUnsupportedSignalSource(argument, controllerName, context, seen));
	}

	if (isArrayStaticCall(node, 'from', context)) {
		if (node.arguments.length !== 1) {
			return true;
		}

		const [source] = node.arguments;
		if (source.type === 'SpreadElement') {
			return true;
		}

		const initializer = getConstantInitializer(source, context);
		if (initializer) {
			if (!isArray(initializer, context)) {
				return true;
			}

			if (isPossiblyMutatedConstantArray(source, context)) {
				return true;
			}

			return hasUnsupportedSignalSource(initializer, controllerName, context, seen);
		}

		const unwrappedSource = unwrapTypeScriptExpression(source);
		return unwrappedSource.type !== 'ArrayExpression' || hasUnsupportedSignalSource(unwrappedSource, controllerName, context, seen);
	}

	if (isAbortSignalAnyCall(node)) {
		return node.arguments[0] && hasUnsupportedSignalSource(node.arguments[0], controllerName, context, seen);
	}

	const initializer = getConstantInitializer(node, context);
	if (initializer) {
		if (
			isArray(initializer, context)
			&& isPossiblyMutatedConstantArray(node, context)
		) {
			return true;
		}

		return hasUnsupportedSignalSource(initializer, controllerName, context, seen);
	}

	return isControllerSignal(node, controllerName) || isKnownAlreadyAbortedSignal(node);
};

const isSignalLikeName = name => name === 'signal' || name.endsWith('Signal');

// Only called with identifiers
const isSignalLikeExpression = (node, context) => {
	const typeState = getAbortSignalTypeState(node, context);
	if (typeState === true) {
		return true;
	}

	if (typeState === false) {
		return false;
	}

	return !hasFullTypeInformation(context) && isSignalLikeName(node.name);
};

const isDirectBridgeSource = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		return isSignalLikeExpression(node, context);
	}

	return isAbortSignalCall(node)
		&& node.arguments.every(argument => argument.type !== 'SpreadElement' && !hasSideEffect(argument, context.sourceCode));
};

const getKnownArrayFromSource = (node, context) => {
	if (
		!isArrayStaticCall(node, 'from', context)
		|| node.arguments.length !== 1
	) {
		return;
	}

	const [source] = node.arguments;
	if (source.type === 'SpreadElement') {
		return;
	}

	const unwrappedSource = unwrapTypeScriptExpression(source);
	if (unwrappedSource.type === 'ArrayExpression') {
		return unwrappedSource;
	}

	const initializer = getConstantInitializer(source, context);
	if (
		initializer
		&& isArray(initializer, context)
		&& !isPossiblyMutatedConstantArray(source, context)
	) {
		return initializer;
	}
};

const getKnownArrayElements = (node, context, seen = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (seen.has(node)) {
		return;
	}

	seen.add(node);

	// Spread elements never get here, `hasUnsupportedSignalSource()` already rejects them
	if (node.type === 'ArrayExpression') {
		return node.elements.every(Boolean) ? node.elements : undefined;
	}

	if (
		isArrayStaticCall(node, 'of', context)
		|| isArrayConstructorExpression(node, context)
	) {
		return node.arguments;
	}

	const arrayFromSource = getKnownArrayFromSource(node, context);
	if (arrayFromSource) {
		return getKnownArrayElements(arrayFromSource, context, seen);
	}

	const initializer = getConstantInitializer(node, context);
	if (
		initializer
		&& isArray(initializer, context)
		&& !isPossiblyMutatedConstantArray(node, context)
	) {
		return getKnownArrayElements(initializer, context, seen);
	}
};

const isAllowedArrayCompositionSource = (node, context) => {
	const elements = getKnownArrayElements(node, context);

	return !elements || (elements.length > 1 && elements.every(element => isDirectBridgeSource(element, context)));
};

const isAllowedForOfArraySource = (node, context, seen = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (seen.has(node)) {
		return false;
	}

	seen.add(node);

	if (
		node.type === 'Identifier'
		|| node.type === 'ArrayExpression'
		|| isArrayStaticCall(node, 'of', context)
		|| isArrayConstructorExpression(node, context)
	) {
		return true;
	}

	const arrayFromSource = getKnownArrayFromSource(node, context);
	if (arrayFromSource) {
		return isAllowedForOfArraySource(arrayFromSource, context, seen);
	}

	return false;
};

const getTypeName = typeName => typeName.type === 'TSQualifiedName' ? typeName.right.name : typeName.name;

const isConstAssertion = typeAnnotation =>
	typeAnnotation?.type === 'TSTypeReference'
	&& getTypeName(typeAnnotation.typeName) === 'const';

const getTupleElementTypeAnnotation = typeAnnotation => {
	if (typeAnnotation.type === 'TSNamedTupleMember') {
		return typeAnnotation.elementType;
	}

	return typeAnnotation;
};

const isAbortSignalTypeReferenceAnnotation = (typeAnnotation, context, visitedTypeVariables) => {
	const typeName = getTypeName(typeAnnotation.typeName);
	if (typeName === 'AbortSignal') {
		return true;
	}

	if (
		!typeName
		|| typeAnnotation.typeName.type !== 'Identifier'
	) {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	if (!variable || visitedTypeVariables.has(variable)) {
		return false;
	}

	visitedTypeVariables.add(variable);
	const definition = variable.defs[0];
	const isAbortSignal = definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isAbortSignalTypeAnnotation(definition.node.typeAnnotation, context, visitedTypeVariables);
	visitedTypeVariables.delete(variable);
	return isAbortSignal;
};

const isAbortSignalTypeAnnotation = (typeAnnotation, context, visitedTypeVariables = new Set()) =>
	typeAnnotation.type === 'TSTypeReference'
	&& isAbortSignalTypeReferenceAnnotation(typeAnnotation, context, visitedTypeVariables);

const getAbortSignalArrayTypeReferenceAnnotationState = (typeAnnotation, context, visitedTypeVariables) => {
	const typeName = getTypeName(typeAnnotation.typeName);
	const typeArguments = (typeAnnotation.typeArguments ?? typeAnnotation.typeParameters)?.params;
	if (
		(
			typeName === 'Array'
			|| typeName === 'ReadonlyArray'
		)
		&& typeArguments?.length === 1
	) {
		return isAbortSignalTypeAnnotation(typeArguments[0], context, visitedTypeVariables);
	}

	if (
		!typeName
		|| typeAnnotation.typeName.type !== 'Identifier'
	) {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	if (!variable || visitedTypeVariables.has(variable)) {
		return;
	}

	visitedTypeVariables.add(variable);
	const definition = variable.defs[0];
	let typeAnnotationState;
	if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		typeAnnotationState = getAbortSignalArrayTypeAnnotationState(definition.node.typeAnnotation, context, visitedTypeVariables);
	}

	visitedTypeVariables.delete(variable);
	return typeAnnotationState;
};

const getAbortSignalArrayTypeAnnotationState = (typeAnnotation, context, visitedTypeVariables = new Set()) => {
	if (typeAnnotation?.type === 'TSTypeAnnotation') {
		typeAnnotation = typeAnnotation.typeAnnotation;
	}

	if (typeAnnotation?.type === 'TSTypeOperator') {
		return typeAnnotation.operator === 'readonly'
			? getAbortSignalArrayTypeAnnotationState(typeAnnotation.typeAnnotation, context, visitedTypeVariables)
			: undefined;
	}

	if (typeAnnotation?.type === 'TSArrayType') {
		return isAbortSignalTypeAnnotation(typeAnnotation.elementType, context, visitedTypeVariables);
	}

	if (typeAnnotation?.type === 'TSTupleType') {
		return typeAnnotation.elementTypes.length > 0
			&& typeAnnotation.elementTypes.every(elementType => isAbortSignalTypeAnnotation(getTupleElementTypeAnnotation(elementType), context, visitedTypeVariables));
	}

	if (typeAnnotation?.type !== 'TSTypeReference') {
		return;
	}

	return getAbortSignalArrayTypeReferenceAnnotationState(typeAnnotation, context, visitedTypeVariables);
};

const isReadonlyArrayTypeAnnotation = (typeAnnotation, context, visitedTypeVariables = new Set()) => {
	if (typeAnnotation?.type === 'TSTypeAnnotation') {
		typeAnnotation = typeAnnotation.typeAnnotation;
	}

	if (typeAnnotation?.type === 'TSTypeOperator') {
		return typeAnnotation.operator === 'readonly'
			&& (
				typeAnnotation.typeAnnotation.type === 'TSArrayType'
				|| typeAnnotation.typeAnnotation.type === 'TSTupleType'
			);
	}

	if (typeAnnotation?.type !== 'TSTypeReference') {
		return false;
	}

	if (getTypeName(typeAnnotation.typeName) === 'ReadonlyArray') {
		return true;
	}

	if (typeAnnotation.typeName.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	if (!variable || visitedTypeVariables.has(variable)) {
		return false;
	}

	visitedTypeVariables.add(variable);
	const definition = variable.defs[0];
	return definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isReadonlyArrayTypeAnnotation(definition.node.typeAnnotation, context, visitedTypeVariables);
};

const isReadonlyArrayType = (type, checker, program, seen = new Set()) => {
	if (
		!type
		|| isUnknownType(type)
		|| isNullishType(type)
		|| seen.has(type)
	) {
		return false;
	}

	seen.add(type);

	if (type.isUnion()) {
		return type.types.some(type => isReadonlyArrayType(type, checker, program, seen));
	}

	if (type.isIntersection()) {
		return type.types.some(type => isReadonlyArrayType(type, checker, program, seen));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isReadonlyArrayType(constraint, checker, program, seen);
	}

	const symbol = getTypeSymbol(type);
	if (
		symbol
		&& isDefaultLibrarySymbol(symbol, program)
		&& symbol.getName() === 'ReadonlyArray'
	) {
		return true;
	}

	const typeText = checker.typeToString(type);
	if (typeText.startsWith('readonly ') || typeText.startsWith('ReadonlyArray<')) {
		return true;
	}

	return getBaseTypes(type, checker).some(type => isReadonlyArrayType(type, checker, program, seen));
};

const isReadonlyArrayTypeFromTypeInformation = (node, context) =>
	withTypeInformation(node, context, ({type, checker, program}) => isReadonlyArrayType(type, checker, program)) ?? false;

const needsArrayCopyForAbortSignalAny = (node, context, seen = new Set()) => {
	if (seen.has(node)) {
		return false;
	}

	seen.add(node);
	if (typeScriptArrayTypeExpressionWrappers.has(node.type)) {
		return isConstAssertion(node.typeAnnotation)
			|| isReadonlyArrayTypeAnnotation(node.typeAnnotation, context)
			|| needsArrayCopyForAbortSignalAny(node.expression, context, seen);
	}

	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs[0];
	return Boolean(
		(
			definition?.name?.typeAnnotation
			&& isReadonlyArrayTypeAnnotation(definition.name.typeAnnotation, context)
		)
		|| (
			definition?.type === 'Variable'
			&& definition.node.init
			&& needsArrayCopyForAbortSignalAny(definition.node.init, context, seen)
		)
		|| isReadonlyArrayTypeFromTypeInformation(node, context),
	);
};

const isForOfArray = (node, context, seen = new Set()) => {
	if (seen.has(node)) {
		return false;
	}

	seen.add(node);

	if (typeScriptArrayTypeExpressionWrappers.has(node.type)) {
		const typeAnnotationState = getAbortSignalArrayTypeAnnotationState(node.typeAnnotation, context);
		return typeAnnotationState ?? isForOfArray(node.expression, context, seen);
	}

	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs[0];
		if (definition?.name?.typeAnnotation) {
			const typeAnnotationState = getAbortSignalArrayTypeAnnotationState(definition.name.typeAnnotation, context);
			if (typeAnnotationState !== undefined) {
				return typeAnnotationState;
			}
		}

		if (
			definition?.type === 'Variable'
			&& definition.node.init
			&& isForOfArray(definition.node.init, context, seen)
		) {
			return true;
		}
	}

	return isArray(node, context);
};

const getAbortSignalAnyArgumentText = (node, context) => {
	const text = context.sourceCode.getText(node);
	if (!needsArrayCopyForAbortSignalAny(node, context)) {
		return text;
	}

	const unwrappedNode = unwrapTypeScriptExpression(node);
	if (unwrappedNode.type === 'ArrayExpression') {
		return context.sourceCode.getText(unwrappedNode);
	}

	const expressionText = unwrappedNode === node ? text : `(${text})`;
	return `[...${expressionText}]`;
};

const isAllowedListenerOptions = node => {
	if (!node) {
		return true;
	}

	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Literal' && typeof node.value === 'boolean') {
		return true;
	}

	if (node.type !== 'ObjectExpression') {
		return false;
	}

	return node.properties.every(property => {
		if (
			property.type !== 'Property'
			|| property.computed
			|| property.kind !== 'init'
			|| property.method
			|| property.shorthand
			|| property.value.type !== 'Literal'
			|| typeof property.value.value !== 'boolean'
		) {
			return false;
		}

		const key = property.key.type === 'Identifier' ? property.key.name : property.key.value;
		return listenerOptionNames.has(key);
	});
};

const getAbortEventListenerCall = statement => {
	if (statement?.type !== 'ExpressionStatement') {
		return;
	}

	const {expression} = statement;
	if (
		!isCallExpression(expression, {
			minimumArguments: 2,
			maximumArguments: 3,
			optional: false,
		})
		|| !isMemberExpression(expression.callee, {
			property: 'addEventListener',
			computed: false,
			optional: false,
		})
		|| getStaticStringValue(unwrapTypeScriptExpression(expression.arguments[0])) !== 'abort'
		|| !isAllowedListenerOptions(expression.arguments[2])
	) {
		return;
	}

	return {
		call: expression,
		sourceSignal: expression.callee.object,
	};
};

const getDirectBridge = (declaration, controllerName, context) => {
	const bridgeStatements = [];
	const sourceSignals = [];
	const abortReferences = new Set();
	let previousStatement = declaration;
	let statement = getNextStatement(declaration);

	while (statement) {
		const listener = getAbortEventListenerCall(statement);
		if (
			!listener
			|| !isStatementCommentFree(statement, context)
			|| hasCommentBetween(context, previousStatement, statement)
			|| hasUnsupportedSignalSource(listener.sourceSignal, controllerName, context)
			|| !isDirectBridgeSource(listener.sourceSignal, context)
		) {
			break;
		}

		const abortReference = getAbortReference(listener.call.arguments[1], controllerName, listener.sourceSignal, context);
		if (!abortReference) {
			break;
		}

		bridgeStatements.push(statement);
		sourceSignals.push(listener.sourceSignal);
		abortReferences.add(abortReference);
		previousStatement = statement;
		statement = getNextStatement(statement);
	}

	if (bridgeStatements.length < 2) {
		return;
	}

	return {
		abortReferences,
		replacement: `AbortSignal.any([${sourceSignals.map(sourceSignal => context.sourceCode.getText(sourceSignal)).join(', ')}])`,
		statements: bridgeStatements,
	};
};

const getForOfVariable = left => {
	if (
		left.type !== 'VariableDeclaration'
		|| left.kind !== 'const'
	) {
		return;
	}

	const {id} = left.declarations[0];
	if (id.type !== 'Identifier') {
		return;
	}

	return id;
};

const getForOfBridge = (declaration, controllerName, context) => {
	const statement = getNextStatement(declaration);
	if (
		statement?.type !== 'ForOfStatement'
		|| statement.await
		|| !isStatementCommentFree(statement, context)
		|| hasCommentBetween(context, declaration, statement)
		|| !isAllowedForOfArraySource(statement.right, context)
		|| isPossiblyMutatedConstantArray(statement.right, context)
		|| hasUnsupportedSignalSource(statement.right, controllerName, context)
		|| !isForOfArray(statement.right, context)
		|| !isAllowedArrayCompositionSource(statement.right, context)
	) {
		return;
	}

	const signal = getForOfVariable(statement.left);
	if (
		!signal
		|| !isSignalLikeExpression(signal, context)
	) {
		return;
	}

	const listener = getAbortEventListenerCall(getSingleStatement(statement.body));
	if (
		!listener
		|| !isSameReference(unwrapTypeScriptExpression(listener.sourceSignal), signal)
	) {
		return;
	}

	const abortReference = getAbortReference(listener.call.arguments[1], controllerName, signal, context);
	if (!abortReference) {
		return;
	}

	return {
		abortReferences: new Set([abortReference]),
		replacement: `AbortSignal.any(${getAbortSignalAnyArgumentText(statement.right, context)})`,
		statements: [statement],
	};
};

const createProblem = (declarator, context) => {
	if (!isAbortControllerDeclarator(declarator, context)) {
		return;
	}

	const declaration = declarator.parent;
	const controllerName = declarator.id.name;
	const bridge = getForOfBridge(declaration, controllerName, context) ?? getDirectBridge(declaration, controllerName, context);
	if (!bridge) {
		return;
	}

	const signalMembers = getSignalMembers(declarator, bridge.abortReferences, context);
	if (!signalMembers) {
		return;
	}

	return getAbortControllerProblem({
		declarator,
		statements: bridge.statements,
		replacement: bridge.replacement,
		signalMembers,
		messageId: MESSAGE_ID,
		suggestion: {messageId: SUGGESTION_ID},
	}, context);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('VariableDeclarator', node => createProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `AbortSignal.any()` over manually forwarding abort events between signals.',
			recommended: true,
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
