import {
	findVariable,
	getPropertyName,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isCallExpression,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	getBaseTypes,
	getLastTrailingCommentOnSameLine,
	getTypeSymbol,
	hasCommentInRange,
	isArray,
	isDefaultLibrarySymbol,
	isGlobalIdentifier,
	isLeftHandSide,
	isNullishType,
	isSameReference,
	isTypeScriptExpressionWrapper,
	isUnknownType,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-abort-signal-any';
const SUGGESTION_ID = 'prefer-abort-signal-any/suggestion';
const reasonSensitiveProperties = new Set([
	'reason',
	'throwIfAborted',
]);
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

const getStatementList = statement => {
	if (Array.isArray(statement.parent.body)) {
		return statement.parent.body;
	}

	if (Array.isArray(statement.parent.consequent)) {
		return statement.parent.consequent;
	}
};

const getNextStatement = statement => {
	const statements = getStatementList(statement);
	if (!statements) {
		return;
	}

	return statements[statements.indexOf(statement) + 1];
};

const isGlobalNameAvailable = (name, node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), name);
	return !variable || variable.defs.length === 0;
};

const isGlobalAbortControllerConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'AbortController',
		argumentsLength: 0,
	})
	&& isGlobalIdentifier(node.callee, context);

const hasCommentBetween = (context, leftNode, rightNode) => {
	const {sourceCode} = context;
	const [, leftEnd] = sourceCode.getRange(leftNode);
	const [rightStart] = sourceCode.getRange(rightNode);

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= leftEnd && commentEnd <= rightStart;
	});
};

const getExpressionParentIgnoringTypeScriptWrappers = node => {
	let expression = node;
	let {parent} = node;

	while (isTypeScriptExpressionWrapper(parent)) {
		expression = parent;
		parent = parent.parent;
	}

	return {expression, parent};
};

const isSignalAlias = node => {
	const {expression, parent} = getExpressionParentIgnoringTypeScriptWrappers(node);

	return (
		parent.type === 'VariableDeclarator'
		&& parent.init === expression
	) || (
		parent.type === 'AssignmentExpression'
		&& parent.right === expression
	);
};

const isForLoopLeftSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const isReasonSensitiveProperty = (node, context) =>
	reasonSensitiveProperties.has(getPropertyName(node, context.sourceCode.getScope(node)));

const isReasonSensitiveRead = (node, context) => {
	const {expression, parent} = getExpressionParentIgnoringTypeScriptWrappers(node);

	return isMemberExpression(parent)
		&& parent.object === expression
		&& isReasonSensitiveProperty(parent, context);
};

const getSignalMember = (identifier, context) => {
	const {parent} = identifier;

	if (
		!isMemberExpression(parent, {
			property: 'signal',
			computed: false,
			optional: false,
		})
		|| parent.object !== identifier
		|| isLeftHandSide(parent)
		|| isForLoopLeftSide(parent)
		|| isReasonSensitiveRead(parent, context)
		|| isSignalAlias(parent)
		|| hasCommentInRange(context, context.sourceCode.getRange(parent))
	) {
		return;
	}

	return parent;
};

const getSignalMembers = (variable, abortReferences, context) => {
	const signalMembers = [];

	for (const reference of variable.references) {
		const {identifier} = reference;

		if (
			abortReferences.has(identifier)
			|| reference.init
		) {
			continue;
		}

		if (reference.isWrite()) {
			return;
		}

		const signalMember = getSignalMember(identifier, context);
		if (!signalMember) {
			return;
		}

		signalMembers.push(signalMember);
	}

	return signalMembers.length > 0 ? signalMembers : undefined;
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

const getAbortSignalTypeState = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		const {program} = parserServices;
		return isAbortSignalType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {}
};

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

const getConstantInitializer = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs[0];
	if (
		!variable
		|| variable.defs.length !== 1
		|| definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return definition.node.init;
};

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

const hasKnownAlreadyAbortedSignal = (node, context, seen = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (seen.has(node)) {
		return false;
	}

	seen.add(node);

	if (node.type === 'SpreadElement') {
		return true;
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.some(element => element && hasKnownAlreadyAbortedSignal(element, context, seen));
	}

	if (isArrayStaticCall(node, 'of', context)) {
		return node.arguments.some(argument => hasKnownAlreadyAbortedSignal(argument, context, seen));
	}

	if (isArrayConstructorExpression(node, context)) {
		return node.arguments.some(argument => hasKnownAlreadyAbortedSignal(argument, context, seen));
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

			return hasKnownAlreadyAbortedSignal(initializer, context, seen);
		}

		const unwrappedSource = unwrapTypeScriptExpression(source);
		return unwrappedSource.type !== 'ArrayExpression' || hasKnownAlreadyAbortedSignal(unwrappedSource, context, seen);
	}

	if (isAbortSignalAnyCall(node)) {
		return node.arguments[0] && hasKnownAlreadyAbortedSignal(node.arguments[0], context, seen);
	}

	const initializer = getConstantInitializer(node, context);
	if (initializer) {
		if (
			isArray(initializer, context)
			&& isPossiblyMutatedConstantArray(node, context)
		) {
			return true;
		}

		return hasKnownAlreadyAbortedSignal(initializer, context, seen);
	}

	return isKnownAlreadyAbortedSignal(node);
};

const hasControllerSignalSource = (node, controllerName, context, seen = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (seen.has(node)) {
		return false;
	}

	seen.add(node);

	if (node.type === 'SpreadElement') {
		return true;
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.some(element => element && hasControllerSignalSource(element, controllerName, context, seen));
	}

	if (isArrayStaticCall(node, 'of', context)) {
		return node.arguments.some(argument => hasControllerSignalSource(argument, controllerName, context, seen));
	}

	if (isArrayConstructorExpression(node, context)) {
		return node.arguments.some(argument => hasControllerSignalSource(argument, controllerName, context, seen));
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

			return hasControllerSignalSource(initializer, controllerName, context, seen);
		}

		const unwrappedSource = unwrapTypeScriptExpression(source);
		return unwrappedSource.type !== 'ArrayExpression' || hasControllerSignalSource(unwrappedSource, controllerName, context, seen);
	}

	if (isAbortSignalAnyCall(node)) {
		return node.arguments[0] && hasControllerSignalSource(node.arguments[0], controllerName, context, seen);
	}

	const initializer = getConstantInitializer(node, context);
	if (initializer) {
		if (
			isArray(initializer, context)
			&& isPossiblyMutatedConstantArray(node, context)
		) {
			return true;
		}

		return hasControllerSignalSource(initializer, controllerName, context, seen);
	}

	return isControllerSignal(node, controllerName);
};

const isSignalLikeName = name => name === 'signal' || name.endsWith('Signal');

const isSignalLikeExpression = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	const typeState = getAbortSignalTypeState(node, context);
	if (typeState === true) {
		return true;
	}

	if (typeState === false) {
		return false;
	}

	if (hasFullTypeInformation(context)) {
		return false;
	}

	if (node.type === 'Identifier') {
		return isSignalLikeName(node.name);
	}

	return isAbortSignalCall(node);
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

	if (node.type === 'ArrayExpression') {
		return node.elements.every(element => element && element.type !== 'SpreadElement') ? node.elements : undefined;
	}

	if (isArrayStaticCall(node, 'of', context)) {
		return node.arguments.every(argument => argument.type !== 'SpreadElement') ? node.arguments : undefined;
	}

	if (isArrayConstructorExpression(node, context)) {
		return node.arguments.every(argument => argument.type !== 'SpreadElement') ? node.arguments : undefined;
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

const getTypeName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		return getTypeName(typeName.right);
	}
};

const isConstAssertion = typeAnnotation =>
	typeAnnotation?.type === 'TSTypeReference'
	&& getTypeName(typeAnnotation.typeName) === 'const';

const getTupleElementTypeAnnotation = typeAnnotation => {
	if (typeAnnotation.type === 'TSNamedTupleMember') {
		return typeAnnotation.elementType;
	}

	return typeAnnotation;
};

const isAbortSignalTypeReferenceAnnotation = (typeAnnotation, context, visitedTypeNames) => {
	const typeName = getTypeName(typeAnnotation.typeName);
	if (typeName === 'AbortSignal') {
		return true;
	}

	if (
		!typeName
		|| typeAnnotation.typeName.type !== 'Identifier'
		|| visitedTypeNames.has(typeAnnotation.typeName.name)
	) {
		return false;
	}

	visitedTypeNames.add(typeAnnotation.typeName.name);

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	const definition = variable?.defs[0];
	const isAbortSignal = definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isAbortSignalTypeAnnotation(definition.node.typeAnnotation, context, visitedTypeNames);
	visitedTypeNames.delete(typeAnnotation.typeName.name);
	return isAbortSignal;
};

const isAbortSignalTypeAnnotation = (typeAnnotation, context, visitedTypeNames = new Set()) => {
	if (typeAnnotation?.type === 'TSTypeAnnotation') {
		typeAnnotation = typeAnnotation.typeAnnotation;
	}

	if (typeAnnotation?.type === 'TSParenthesizedType') {
		return isAbortSignalTypeAnnotation(typeAnnotation.typeAnnotation, context, visitedTypeNames);
	}

	if (typeAnnotation?.type !== 'TSTypeReference') {
		return false;
	}

	return isAbortSignalTypeReferenceAnnotation(typeAnnotation, context, visitedTypeNames);
};

const getAbortSignalArrayTypeReferenceAnnotationState = (typeAnnotation, context, visitedTypeNames) => {
	const typeName = getTypeName(typeAnnotation.typeName);
	const typeArguments = typeAnnotation.typeArguments?.params ?? typeAnnotation.typeParameters?.params;
	if (
		(
			typeName === 'Array'
			|| typeName === 'ReadonlyArray'
		)
		&& typeArguments?.length === 1
	) {
		return isAbortSignalTypeAnnotation(typeArguments[0], context, visitedTypeNames);
	}

	if (
		!typeName
		|| typeAnnotation.typeName.type !== 'Identifier'
		|| visitedTypeNames.has(typeAnnotation.typeName.name)
	) {
		return false;
	}

	visitedTypeNames.add(typeAnnotation.typeName.name);

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	const definition = variable?.defs[0];
	let typeAnnotationState;
	if (
		definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		typeAnnotationState = getAbortSignalArrayTypeAnnotationState(definition.node.typeAnnotation, context, visitedTypeNames);
	}

	visitedTypeNames.delete(typeAnnotation.typeName.name);
	return typeAnnotationState;
};

const getAbortSignalArrayTypeAnnotationState = (typeAnnotation, context, visitedTypeNames = new Set()) => {
	if (typeAnnotation?.type === 'TSTypeAnnotation') {
		typeAnnotation = typeAnnotation.typeAnnotation;
	}

	if (typeAnnotation?.type === 'TSParenthesizedType') {
		return getAbortSignalArrayTypeAnnotationState(typeAnnotation.typeAnnotation, context, visitedTypeNames);
	}

	if (typeAnnotation?.type === 'TSTypeOperator') {
		return typeAnnotation.operator === 'readonly'
			? getAbortSignalArrayTypeAnnotationState(typeAnnotation.typeAnnotation, context, visitedTypeNames)
			: undefined;
	}

	if (typeAnnotation?.type === 'TSArrayType') {
		return isAbortSignalTypeAnnotation(typeAnnotation.elementType, context, visitedTypeNames);
	}

	if (typeAnnotation?.type === 'TSTupleType') {
		return typeAnnotation.elementTypes.length > 0
			&& typeAnnotation.elementTypes.every(elementType => isAbortSignalTypeAnnotation(getTupleElementTypeAnnotation(elementType), context, visitedTypeNames));
	}

	if (typeAnnotation?.type !== 'TSTypeReference') {
		return;
	}

	return getAbortSignalArrayTypeReferenceAnnotationState(typeAnnotation, context, visitedTypeNames);
};

const isReadonlyArrayTypeAnnotation = (typeAnnotation, context, visitedTypeNames = new Set()) => {
	if (typeAnnotation?.type === 'TSTypeAnnotation') {
		typeAnnotation = typeAnnotation.typeAnnotation;
	}

	if (typeAnnotation?.type === 'TSParenthesizedType') {
		return isReadonlyArrayTypeAnnotation(typeAnnotation.typeAnnotation, context, visitedTypeNames);
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

	if (
		typeAnnotation.typeName.type !== 'Identifier'
		|| visitedTypeNames.has(typeAnnotation.typeName.name)
	) {
		return false;
	}

	visitedTypeNames.add(typeAnnotation.typeName.name);

	const variable = findVariable(context.sourceCode.getScope(typeAnnotation), typeAnnotation.typeName);
	const definition = variable?.defs[0];
	return definition?.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
		&& isReadonlyArrayTypeAnnotation(definition.node.typeAnnotation, context, visitedTypeNames);
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

const isReadonlyArrayTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const {program} = parserServices;
		return isReadonlyArrayType(
			parserServices.getTypeAtLocation(node),
			program.getTypeChecker(),
			program,
		);
	} catch {
		return false;
	}
};

const needsArrayCopyForAbortSignalAny = (node, context) => {
	if (typeScriptArrayTypeExpressionWrappers.has(node.type)) {
		return isConstAssertion(node.typeAnnotation)
			|| isReadonlyArrayTypeAnnotation(node.typeAnnotation, context)
			|| needsArrayCopyForAbortSignalAny(node.expression, context);
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
			&& needsArrayCopyForAbortSignalAny(definition.node.init, context)
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

const getCallbackExpression = callback => {
	if (
		!callback
		|| (
			callback.type !== 'ArrowFunctionExpression'
			&& callback.type !== 'FunctionExpression'
		)
		|| callback.async
		|| callback.generator
		|| callback.params.length > 0
	) {
		return;
	}

	if (callback.body.type !== 'BlockStatement') {
		return callback.body;
	}

	if (
		callback.body.body.length !== 1
		|| callback.body.body[0].type !== 'ExpressionStatement'
	) {
		return;
	}

	return callback.body.body[0].expression;
};

const isSameIdentifierReference = (leftNode, rightNode, context) => {
	leftNode = unwrapTypeScriptExpression(leftNode);
	rightNode = unwrapTypeScriptExpression(rightNode);

	if (
		leftNode.type !== 'Identifier'
		|| rightNode.type !== 'Identifier'
		|| leftNode.name !== rightNode.name
	) {
		return false;
	}

	const leftVariable = findVariable(context.sourceCode.getScope(leftNode), leftNode);
	const rightVariable = findVariable(context.sourceCode.getScope(rightNode), rightNode);

	return leftVariable === rightVariable;
};

const isSourceReason = (node, sourceSignal, context) =>
	isMemberExpression(node, {
		property: 'reason',
		computed: false,
		optional: false,
	})
	&& isSameIdentifierReference(node.object, sourceSignal, context);

const getAbortReference = (callback, controllerName, sourceSignal, context) => {
	const expression = getCallbackExpression(callback);

	if (
		!isCallExpression(expression, {
			optional: false,
		})
		|| !isMemberExpression(expression.callee, {
			property: 'abort',
			computed: false,
			optional: false,
		})
		|| expression.callee.object.type !== 'Identifier'
		|| expression.callee.object.name !== controllerName
		|| !(
			expression.arguments.length === 0
			|| (
				expression.arguments.length === 1
				&& isSourceReason(expression.arguments[0], sourceSignal, context)
			)
		)
	) {
		return;
	}

	return expression.callee.object;
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

const isStatementCommentFree = (statement, context) =>
	!hasCommentInRange(context, context.sourceCode.getRange(statement))
	&& !getLastTrailingCommentOnSameLine(context, statement);

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
			|| hasControllerSignalSource(listener.sourceSignal, controllerName, context)
			|| hasKnownAlreadyAbortedSignal(listener.sourceSignal, context)
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

const getForOfBodyStatement = body => {
	if (body.type === 'ExpressionStatement') {
		return body;
	}

	if (
		body.type === 'BlockStatement'
		&& body.body.length === 1
		&& body.body[0].type === 'ExpressionStatement'
	) {
		return body.body[0];
	}
};

const getForOfVariable = left => {
	if (
		left.type !== 'VariableDeclaration'
		|| left.kind !== 'const'
		|| left.declarations.length !== 1
	) {
		return;
	}

	const [declarator] = left.declarations;
	if (
		declarator.id.type !== 'Identifier'
		|| declarator.init
	) {
		return;
	}

	return declarator.id;
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
		|| hasControllerSignalSource(statement.right, controllerName, context)
		|| hasKnownAlreadyAbortedSignal(statement.right, context)
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

	const bodyStatement = getForOfBodyStatement(statement.body);
	const listener = getAbortEventListenerCall(bodyStatement);
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

const hasNameConflict = (name, variable, node, context) => {
	const existingVariable = findVariable(context.sourceCode.getScope(node), name);
	return existingVariable && existingVariable !== variable;
};

const getReplacementName = (name, variable, signalMembers, context) => {
	let replacementName = name;

	if (name === 'abortController') {
		replacementName = 'abortSignal';
	} else if (name === 'controller') {
		replacementName = 'signal';
	}

	if (replacementName === name) {
		return name;
	}

	if (
		hasNameConflict(replacementName, variable, variable.identifiers[0], context)
		|| signalMembers.some(signalMember => hasNameConflict(replacementName, variable, signalMember, context))
	) {
		return name;
	}

	return replacementName;
};

const isWhitespaceOnly = text => /^\s*$/.test(text);

const removeStatementGroup = (statements, context, fixer) => {
	if (statements.length === 1) {
		return removeStatement(statements[0], context, fixer);
	}

	const {sourceCode} = context;
	const {lines} = sourceCode;
	const firstStatement = statements[0];
	const lastStatement = statements.at(-1);
	const startLocation = sourceCode.getLoc(firstStatement).start;
	const endLocation = sourceCode.getLoc(lastStatement).end;
	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);
	const {text} = sourceCode;
	let [start] = sourceCode.getRange(firstStatement);
	let [, end] = sourceCode.getRange(lastStatement);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		end += textAfter.length;

		if (start === 0) {
			if (text[end] === '\r' && text[end + 1] === '\n') {
				end += 2;
			} else if (text[end] === '\n' || text[end] === '\r') {
				end++;
			}
		} else {
			start -= textBefore.length;

			if (text[start - 2] === '\r' && text[start - 1] === '\n') {
				start -= 2;
			} else if (text[start - 1] === '\n' || text[start - 1] === '\r') {
				start--;
			}
		}
	}

	return fixer.removeRange([start, end]);
};

const createProblem = (declarator, context) => {
	const {sourceCode} = context;
	const declaration = declarator.parent;
	const {id, init} = declarator;

	if (
		declaration.type !== 'VariableDeclaration'
		|| declaration.kind !== 'const'
		|| declaration.declarations.length !== 1
		|| id.type !== 'Identifier'
		|| !isGlobalAbortControllerConstructor(init, context)
		|| !isGlobalNameAvailable('AbortSignal', id, context)
		|| hasCommentInRange(context, sourceCode.getRange(init))
		|| (
			id.typeAnnotation
			&& hasCommentInRange(context, sourceCode.getRange(id.typeAnnotation))
		)
	) {
		return;
	}

	const bridge = getForOfBridge(declaration, id.name, context) ?? getDirectBridge(declaration, id.name, context);
	if (!bridge) {
		return;
	}

	const variable = findVariable(sourceCode.getScope(id), id);
	if (!variable) {
		return;
	}

	for (const abortReference of bridge.abortReferences) {
		if (findVariable(sourceCode.getScope(abortReference), abortReference) !== variable) {
			return;
		}
	}

	const signalMembers = getSignalMembers(variable, bridge.abortReferences, context);
	if (!signalMembers) {
		return;
	}

	const replacementName = getReplacementName(id.name, variable, signalMembers, context);

	return {
		node: id,
		messageId: MESSAGE_ID,
		suggest: [
			{
				messageId: SUGGESTION_ID,
				* fix(fixer) {
					yield fixer.replaceText(init, bridge.replacement);

					if (id.typeAnnotation) {
						yield fixer.replaceText(id.typeAnnotation, ': AbortSignal');
					}

					if (replacementName !== id.name) {
						const [idStart] = sourceCode.getRange(id);
						yield fixer.replaceTextRange([idStart, idStart + id.name.length], replacementName);
					}

					for (const signalMember of signalMembers) {
						yield fixer.replaceText(signalMember, replacementName);
					}

					yield removeStatementGroup(bridge.statements, context, fixer);
				},
			},
		],
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => createProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
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
