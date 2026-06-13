import {findVariable} from '@eslint-community/eslint-utils';
import {functionTypes, getStaticStringValue} from './ast/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isSameReference,
	isUnknownType,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-path2d';
const messages = {
	[MESSAGE_ID]: 'Prefer reusing a `Path2D` object instead of rebuilding the canvas path in repeated draws.',
};

const canvasContext = 'canvas-context';
const nonCanvasContext = 'non-canvas-context';
const nullishContext = 'nullish-context';
const unknown = 'unknown';

const canvasContextTypeNames = new Set([
	'CanvasRenderingContext2D',
	'OffscreenCanvasRenderingContext2D',
]);

const canvasContextNames = new Set([
	'context',
	'ctx',
]);

const builderMethods = new Set([
	'moveTo',
	'lineTo',
	'bezierCurveTo',
	'quadraticCurveTo',
	'arc',
	'arcTo',
	'ellipse',
	'rect',
	'roundRect',
	'closePath',
]);

const consumerMethods = new Set([
	'fill',
	'stroke',
	'clip',
	'isPointInPath',
	'isPointInStroke',
]);

const boundaryMethods = new Set([
	'beginPath',
]);

const loopNodeTypes = [
	'ForStatement',
	'ForInStatement',
	'ForOfStatement',
	'WhileStatement',
	'DoWhileStatement',
];

const repeatedCallbackMethods = new Set([
	'requestAnimationFrame',
	'setInterval',
]);

const globalObjectNames = new Set([
	'globalThis',
	'self',
	'window',
]);

const fillRules = new Set([
	'nonzero',
	'evenodd',
]);

const nonCanvasTypeAnnotations = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNeverKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSVoidKeyword',
	'TSLiteralType',
	'TSTypeLiteral',
	'TSFunctionType',
	'TSConstructorType',
	'TSAnyKeyword',
	'TSUnknownKeyword',
	'TSArrayType',
	'TSTupleType',
]);

const createCodePathInfo = () => ({
	calls: [],
	pathCalls: [],
	repeated: false,
	variables: new Set(),
});

const resolveIdentifierName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
};

const combineUnionTypes = types => {
	const nonNullishTypes = types.filter(type => type !== nullishContext);

	if (
		nonNullishTypes.length > 0
		&& nonNullishTypes.every(type => type === canvasContext)
	) {
		return canvasContext;
	}

	if (!types.includes(unknown) && types.includes(nonCanvasContext)) {
		return nonCanvasContext;
	}

	return unknown;
};

const combineIntersectionTypes = types => {
	if (types.includes(canvasContext)) {
		return canvasContext;
	}

	if (types.every(type => type === nonCanvasContext)) {
		return nonCanvasContext;
	}

	return unknown;
};

const getTypeReferenceType = (node, scope, visitedTypeReferenceNames) => {
	if (node.typeName.type === 'TSQualifiedName') {
		return nonCanvasContext;
	}

	const typeReferenceName = node.typeName.name;

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return unknown;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	const typeVariable = node.typeName.type === 'Identifier'
		? resolveIdentifierName(typeReferenceName, scope)
		: undefined;
	const [definition] = typeVariable?.defs ?? [];

	if (!definition) {
		visitedTypeReferenceNames.delete(typeReferenceName);
		return canvasContextTypeNames.has(typeReferenceName) ? canvasContext : nonCanvasContext;
	}

	let type = nonCanvasContext;

	if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		type = getTypeAnnotationType(definition.node.typeAnnotation, scope, visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSInterfaceDeclaration'
	) {
		const heritageTypes = definition.node.extends.map(heritage => getTypeReferenceType({typeName: heritage.expression}, scope, visitedTypeReferenceNames));
		type = heritageTypes.includes(canvasContext) ? canvasContext : nonCanvasContext;
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeParameter'
	) {
		type = definition.node.constraint
			? getTypeAnnotationType(definition.node.constraint, scope, visitedTypeReferenceNames)
			: nonCanvasContext;
	} else if (definition.type === 'ClassName') {
		type = nonCanvasContext;
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return type;
};

const getTypeAnnotationType = (node, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeOperator': {
			return node.operator === 'readonly'
				? getTypeAnnotationType(node.typeAnnotation, scope, visitedTypeReferenceNames)
				: unknown;
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineUnionTypes(node.types.map(type => getTypeAnnotationType(type, scope, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineIntersectionTypes(node.types.map(type => getTypeAnnotationType(type, scope, visitedTypeReferenceNames)));
		}

		default: {
			if (node?.type === 'TSNullKeyword' || node?.type === 'TSUndefinedKeyword') {
				return nullishContext;
			}

			return nonCanvasTypeAnnotations.has(node?.type) ? nonCanvasContext : unknown;
		}
	}
};

const getTypeScriptType = (type, checker, program, visitedTypes = new Set()) => {
	type = checker.getNonNullableType(type);

	if (isUnknownType(type)) {
		return unknown;
	}

	if (visitedTypes.has(type)) {
		return unknown;
	}

	visitedTypes.add(type);

	if (type.isTypeParameter?.()) {
		const constraint = checker.getBaseConstraintOfType(type) ?? type.getConstraint?.();

		return constraint ? getTypeScriptType(constraint, checker, program, visitedTypes) : unknown;
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getTypeScriptType(type, checker, program, visitedTypes)));
	}

	if (type.isIntersection()) {
		return combineIntersectionTypes(type.types.map(type => getTypeScriptType(type, checker, program, visitedTypes)));
	}

	const symbol = getTypeSymbol(type);
	if (
		canvasContextTypeNames.has(symbol?.getName())
		&& isDefaultLibrarySymbol(symbol, program)
	) {
		return canvasContext;
	}

	const baseTypes = getBaseTypes(type, checker);
	if (baseTypes.some(type => getTypeScriptType(type, checker, program, visitedTypes) === canvasContext)) {
		return canvasContext;
	}

	return nonCanvasContext;
};

const getTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		return getTypeScriptType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
			parserServices.program,
		);
	} catch {
		return unknown;
	}
};

const hasWriteAfterInitialization = variable => variable.references.some(reference => reference.isWrite() && !reference.init);

const isMutableVariableWithWrite = (definition, variable) =>
	definition.type === 'Variable'
	&& definition.parent.kind !== 'const'
	&& hasWriteAfterInitialization(variable);

const getTypeFromVariable = (node, context, visitedVariables) => {
	if (node.type !== 'Identifier') {
		return unknown;
	}

	const scope = context.sourceCode.getScope(node);
	const variable = findVariable(scope, node);

	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return unknown;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const hasTypeAnnotation = Boolean(definition.name?.typeAnnotation);
	const typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, scope);
	let type = unknown;

	if (hasTypeAnnotation) {
		type = typeFromAnnotation === unknown ? nonCanvasContext : typeFromAnnotation;
	} else if (isMutableVariableWithWrite(definition, variable)) {
		type = nonCanvasContext;
	} else if (
		definition.type === 'Variable'
		&& definition.node.init
	) {
		type = getCanvasContextType(definition.node.init, context, visitedVariables);
	}

	visitedVariables.delete(variable);

	return type;
};

const isGet2DContextCall = node =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.optional
	&& !node.callee.computed
	&& node.callee.property.type === 'Identifier'
	&& node.callee.property.name === 'getContext'
	&& getStaticStringValue(node.arguments[0]) === '2d';

const isGetNon2DContextCall = node =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.optional
	&& !node.callee.computed
	&& node.callee.property.type === 'Identifier'
	&& node.callee.property.name === 'getContext'
	&& node.arguments[0]
	&& getStaticStringValue(node.arguments[0]) !== '2d';

const getCanvasContextTypeFromSyntax = (node, context, visitedVariables) => {
	switch (node.type) {
		case 'Identifier': {
			const typeFromVariable = getTypeFromVariable(node, context, visitedVariables);

			if (typeFromVariable !== unknown) {
				return typeFromVariable;
			}

			return canvasContextNames.has(node.name) ? canvasContext : unknown;
		}

		case 'TSSatisfiesExpression': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, context.sourceCode.getScope(node));

			return typeFromAnnotation === unknown
				? getCanvasContextType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSAsExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, context.sourceCode.getScope(node));

			return typeFromAnnotation === unknown
				? getCanvasContextType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression':
		case 'ChainExpression': {
			return getCanvasContextType(node.expression, context, visitedVariables);
		}

		case 'ObjectExpression':
		case 'ArrayExpression':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
		case 'ClassExpression':
		case 'NewExpression': {
			return nonCanvasContext;
		}

		default: {
			break;
		}
	}

	return unknown;
};

function getCanvasContextType(node, context, visitedVariables = new Set()) {
	if (!node) {
		return unknown;
	}

	const typeFromTypeInformation = getTypeFromTypeInformation(node, context);
	if (typeFromTypeInformation !== unknown) {
		return typeFromTypeInformation;
	}

	const typeFromSyntax = getCanvasContextTypeFromSyntax(node, context, visitedVariables);
	if (typeFromSyntax !== unknown) {
		return typeFromSyntax;
	}

	if (isGet2DContextCall(node)) {
		return canvasContext;
	}

	if (isGetNon2DContextCall(node)) {
		return nonCanvasContext;
	}

	return unknown;
}

const isFillRule = node => fillRules.has(getStaticStringValue(node));

const isCurrentPathConsumerCall = node => {
	const {property} = node.callee;
	const method = property.name;

	if (method === 'stroke') {
		return node.arguments.length === 0;
	}

	if (method === 'fill' || method === 'clip') {
		return node.arguments.length === 0
			|| (
				node.arguments.length === 1
				&& isFillRule(node.arguments[0])
			);
	}

	if (method === 'isPointInStroke') {
		return node.arguments.length === 2;
	}

	return node.arguments.length === 2
		|| (
			node.arguments.length === 3
			&& isFillRule(node.arguments[2])
		);
};

const getRootIdentifier = node => {
	switch (node.type) {
		case 'Identifier': {
			return node;
		}

		case 'MemberExpression': {
			return getRootIdentifier(node.object);
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'TSNonNullExpression':
		case 'ParenthesizedExpression':
		case 'ChainExpression': {
			return getRootIdentifier(node.expression);
		}

		// No default
	}
};

const getReceiverVariable = (node, context) => {
	const rootIdentifier = getRootIdentifier(node);

	return rootIdentifier ? findVariable(context.sourceCode.getScope(rootIdentifier), rootIdentifier) : undefined;
};

const getPathCall = (node, context, repeatedRegionId) => {
	if (
		node.callee.type !== 'MemberExpression'
		|| node.optional
		|| node.callee.optional
		|| node.callee.computed
		|| node.callee.property.type !== 'Identifier'
	) {
		return;
	}

	const method = node.callee.property.name;
	const isBuilder = builderMethods.has(method);
	const isConsumer = consumerMethods.has(method) && isCurrentPathConsumerCall(node);
	const isBoundary = boundaryMethods.has(method);

	if (
		(!isBuilder && !isConsumer && !isBoundary)
		|| getCanvasContextType(node.callee.object, context) !== canvasContext
	) {
		return;
	}

	return {
		node,
		receiver: node.callee.object,
		receiverVariable: getReceiverVariable(node.callee.object, context),
		isBuilder,
		isConsumer,
		isBoundary,
		repeated: repeatedRegionId !== undefined,
		repeatedRegionId,
	};
};

const getFunctionVariables = (node, context) => {
	const variables = new Set();

	if (
		node.type === 'FunctionDeclaration'
		&& node.id
	) {
		const variable = findVariable(context.sourceCode.getScope(node.id), node.id);

		if (
			variable
			&& !hasWriteAfterInitialization(variable)
		) {
			variables.add(variable);
		}
	}

	if (
		node.parent.type === 'VariableDeclarator'
		&& node.parent.parent.kind === 'const'
		&& node.parent.id.type === 'Identifier'
		&& node.parent.init === node
	) {
		const variable = findVariable(context.sourceCode.getScope(node.parent.id), node.parent.id);

		if (variable) {
			variables.add(variable);
		}
	}

	return variables;
};

const isRepeatedSchedulerCall = (node, context) => {
	const isGlobalIdentifierReference = node => {
		const variable = findVariable(context.sourceCode.getScope(node), node);

		return !variable || variable.defs.length === 0;
	};

	if (
		node.callee.type === 'Identifier'
		&& repeatedCallbackMethods.has(node.callee.name)
	) {
		return isGlobalIdentifierReference(node.callee);
	}

	if (
		node.callee.type === 'MemberExpression'
		&& !node.callee.optional
		&& !node.callee.computed
		&& node.callee.object.type === 'Identifier'
		&& globalObjectNames.has(node.callee.object.name)
		&& node.callee.property.type === 'Identifier'
		&& repeatedCallbackMethods.has(node.callee.property.name)
	) {
		return isGlobalIdentifierReference(node.callee.object);
	}

	return false;
};

const isRepeatedCallbackFunction = (node, context) =>
	node.parent.type === 'CallExpression'
	&& node.parent.arguments[0] === node
	&& isRepeatedSchedulerCall(node.parent, context);

const getCallExpressionVariable = (node, context) =>
	node.callee.type === 'Identifier'
		? findVariable(context.sourceCode.getScope(node.callee), node.callee)
		: undefined;

const unwrapReceiverReference = node => {
	switch (node.type) {
		case 'TSSatisfiesExpression':
		case 'ParenthesizedExpression': {
			return unwrapReceiverReference(node.expression);
		}

		default: {
			return node;
		}
	}
};

const isSameReceiverReference = (left, right) => isSameReference(
	unwrapReceiverReference(left),
	unwrapReceiverReference(right),
);

const isSameReceiver = (group, call) => {
	if (
		group.receiverVariable
		|| call.receiverVariable
	) {
		return group.receiverVariable === call.receiverVariable
			&& group.repeatedRegionId === call.repeatedRegionId
			&& isSameReceiverReference(group.receiver, call.receiver);
	}

	return group.repeatedRegionId === call.repeatedRegionId
		&& isSameReceiverReference(group.receiver, call.receiver);
};

const addGroupCall = (groups, call) => {
	let group = groups.findLast(group => !group.closed && isSameReceiver(group, call));

	if (call.isBoundary) {
		if (group) {
			group.closed = true;
		}

		return;
	}

	if (!group) {
		group = {
			receiver: call.receiver,
			receiverVariable: call.receiverVariable,
			repeatedRegionId: call.repeatedRegionId,
			builders: [],
			consumers: [],
		};
		groups.push(group);
	}

	if (call.isBuilder) {
		group.builders.push(call);
	}

	if (call.isConsumer) {
		group.consumers.push(call);
	}
};

const getGroups = pathCalls => {
	const groups = [];

	for (const call of pathCalls) {
		addGroupCall(groups, call);
	}

	return groups;
};

const getVariableToInfo = infos => {
	const variableToInfo = new Map();

	for (const info of infos) {
		for (const variable of info.variables) {
			variableToInfo.set(variable, info);
		}
	}

	return variableToInfo;
};

const getRepeatedInfos = (rootInfo, functionInfos) => {
	const variableToInfo = getVariableToInfo(functionInfos);
	const repeatedInfos = new Set();
	const queue = [];

	const markRepeated = info => {
		if (
			!info
			|| repeatedInfos.has(info)
		) {
			return;
		}

		repeatedInfos.add(info);
		queue.push(info);
	};

	for (const info of functionInfos) {
		if (info.repeated) {
			markRepeated(info);
		}
	}

	for (const info of [rootInfo, ...functionInfos]) {
		for (const {variable, repeated} of info.calls) {
			if (repeated) {
				markRepeated(variableToInfo.get(variable));
			}
		}
	}

	for (const info of queue) {
		for (const {variable} of info.calls) {
			markRepeated(variableToInfo.get(variable));
		}
	}

	return repeatedInfos;
};

const getRelevantCalls = (calls, isInfoRepeated) => isInfoRepeated
	? calls
	: calls.filter(call => call.repeated);

const getReportableBuilder = (group, info, repeatedInfos) => {
	const isInfoRepeated = repeatedInfos.has(info);
	const builders = getRelevantCalls(group.builders, isInfoRepeated);
	const consumers = getRelevantCalls(group.consumers, isInfoRepeated);

	return builders.length >= 2 && consumers.length > 0 ? builders[0] : undefined;
};

function * getProblems(rootInfo, functionInfos) {
	const repeatedInfos = getRepeatedInfos(rootInfo, functionInfos);

	for (const info of [rootInfo, ...functionInfos]) {
		for (const group of getGroups(info.pathCalls)) {
			const builder = getReportableBuilder(group, info, repeatedInfos);

			if (builder) {
				yield {
					node: builder.node.callee.property,
					messageId: MESSAGE_ID,
				};
			}
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const rootInfo = createCodePathInfo();
	const functionInfos = [];
	const infoStack = [rootInfo];
	const loopRegionStack = [];
	const loopRegionStackStack = [];
	let nextLoopRegionId = 0;

	context.on(functionTypes, node => {
		const info = createCodePathInfo();
		info.variables = getFunctionVariables(node, context);
		info.repeated = isRepeatedCallbackFunction(node, context);
		functionInfos.push(info);
		infoStack.push(info);
		loopRegionStackStack.push([...loopRegionStack]);
		loopRegionStack.length = 0;
	});

	context.onExit(functionTypes, () => {
		infoStack.pop();
		loopRegionStack.length = 0;
		loopRegionStack.push(...loopRegionStackStack.pop());
	});

	context.on(loopNodeTypes, () => {
		loopRegionStack.push(nextLoopRegionId++);
	});

	context.onExit(loopNodeTypes, () => {
		loopRegionStack.pop();
	});

	context.on('CallExpression', node => {
		const info = infoStack.at(-1);
		const variable = getCallExpressionVariable(node, context);

		if (variable) {
			info.calls.push({
				variable,
				repeated: loopRegionStack.length > 0 || isRepeatedSchedulerCall(node, context),
			});
		}

		if (isRepeatedSchedulerCall(node, context)) {
			const [callback] = node.arguments;

			if (callback?.type === 'Identifier') {
				const variable = findVariable(context.sourceCode.getScope(callback), callback);

				info.calls.push({
					variable,
					repeated: true,
				});
			}
		}

		const pathCall = getPathCall(node, context, loopRegionStack.at(-1));

		if (pathCall) {
			info.pathCalls.push(pathCall);
		}
	});

	context.onExit('Program', function * () {
		yield * getProblems(rootInfo, functionInfos);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Path2D` for repeatedly drawn canvas paths.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
