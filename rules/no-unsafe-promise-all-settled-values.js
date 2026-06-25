import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-unsafe-promise-all-settled-values';

const messages = {
	[MESSAGE_ID]: 'Do not read `.value` from `Promise.allSettled()` results without checking that the result is fulfilled.',
};

const unsafePromiseSettledResultTypeNames = new Set([
	'PromiseSettledResult',
	'PromiseRejectedResult',
]);

const promiseFulfilledResultTypeNames = new Set([
	'PromiseFulfilledResult',
]);

const transparentExpressionTypes = new Set([
	'ChainExpression',
	'ParenthesizedExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
]);

const isFunction = node =>
	node?.type === 'ArrowFunctionExpression'
	|| node?.type === 'FunctionExpression'
	|| node?.type === 'FunctionDeclaration';

const unwrapExpression = node => {
	while (node && transparentExpressionTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const isPromiseAllSettledCall = node =>
	isMethodCall(unwrapExpression(node), {
		object: 'Promise',
		method: 'allSettled',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

const isAwaitedPromiseAllSettledCall = node => {
	node = unwrapExpression(node);
	return node?.type === 'AwaitExpression' && isPromiseAllSettledCall(node.argument);
};

const isReturnValue = node =>
	node?.parent.type === 'ReturnStatement'
	&& node.parent.argument === node;

const isFilterCall = node =>
	isMethodCall(unwrapExpression(node), {
		method: 'filter',
		minimumArguments: 1,
		maximumArguments: 2,
		optionalCall: false,
		optionalMember: false,
	});

function getTypeName(typeName) {
	if (typeName.type === 'Identifier') {
		return typeName.name;
	}

	if (typeName.type === 'TSQualifiedName') {
		return getTypeName(typeName.right);
	}
}

function getArrayElementTypeAnnotation(node) {
	node = node?.type === 'TSTypeAnnotation' ? node.typeAnnotation : node;

	while (node?.type === 'TSParenthesizedType' || node?.type === 'TSTypeOperator') {
		node = node.typeAnnotation;
	}

	if (node?.type === 'TSArrayType') {
		return node.elementType;
	}

	if (
		node?.type === 'TSTypeReference'
		&& node.typeName.type === 'Identifier'
		&& (node.typeName.name === 'Array' || node.typeName.name === 'ReadonlyArray')
	) {
		return node.typeArguments?.params[0] ?? node.typeParameters?.params[0];
	}
}

function isUnsafePromiseSettledResultTypeAnnotation(node) {
	if (node?.type === 'TSTypeReference') {
		const typeName = getTypeName(node.typeName);
		return unsafePromiseSettledResultTypeNames.has(typeName);
	}

	if (node?.type === 'TSUnionType') {
		return node.types.some(type => isUnsafePromiseSettledResultTypeAnnotation(type));
	}

	return false;
}

function isUnsafePromiseSettledResultArrayTypeAnnotation(node) {
	return isUnsafePromiseSettledResultTypeAnnotation(getArrayElementTypeAnnotation(node));
}

function isPromiseFulfilledResultTypeAnnotation(node) {
	if (node?.type === 'TSTypeReference') {
		const typeName = getTypeName(node.typeName);
		return promiseFulfilledResultTypeNames.has(typeName);
	}

	if (node?.type === 'TSUnionType') {
		return node.types.every(type => isPromiseFulfilledResultTypeAnnotation(type));
	}

	return false;
}

function isPromiseFulfilledResultArrayTypeAnnotation(node) {
	return isPromiseFulfilledResultTypeAnnotation(getArrayElementTypeAnnotation(node));
}

function isUnsafePromiseSettledResultType(type) {
	if (type.isUnion()) {
		return type.types.some(type => isUnsafePromiseSettledResultType(type));
	}

	const symbol = type.aliasSymbol ?? type.getSymbol();
	return unsafePromiseSettledResultTypeNames.has(symbol?.getName());
}

function isPromiseFulfilledResultType(type) {
	if (type.isUnion()) {
		return type.types.every(type => isPromiseFulfilledResultType(type));
	}

	const symbol = type.aliasSymbol ?? type.getSymbol();
	return promiseFulfilledResultTypeNames.has(symbol?.getName());
}

function getArrayElementType(type, checker) {
	type = checker.getNonNullableType(type);

	if (type.isUnion()) {
		const elementTypes = type.types.map(type => getArrayElementType(type, checker));
		return elementTypes.every(Boolean) ? checker.getUnionType(elementTypes) : undefined;
	}

	if (!(checker.isArrayType(type) || checker.isTupleType(type))) {
		return;
	}

	return checker.getTypeArguments(type)[0];
}

function getTypeInformation(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		return {
			checker: parserServices.program.getTypeChecker(),
			type: parserServices.getTypeAtLocation(node),
		};
	} catch {}
}

function isPromiseSettledResultArrayFromTypeInformation(node, context) {
	const typeInformation = getTypeInformation(node, context);
	if (!typeInformation) {
		return false;
	}

	const {type, checker} = typeInformation;
	const elementType = getArrayElementType(type, checker);
	return Boolean(elementType && isUnsafePromiseSettledResultType(elementType));
}

function isPromiseFulfilledResultFromTypeInformation(node, context) {
	const typeInformation = getTypeInformation(node, context);
	if (!typeInformation) {
		return false;
	}

	const {type} = typeInformation;
	return isPromiseFulfilledResultType(type);
}

function isPromiseFulfilledResultArrayFromTypeInformation(node, context) {
	const typeInformation = getTypeInformation(node, context);
	if (!typeInformation) {
		return false;
	}

	const {type, checker} = typeInformation;
	const elementType = getArrayElementType(type, checker);
	return Boolean(elementType && isPromiseFulfilledResultType(elementType));
}

const isTypeAssertion = node =>
	node?.type === 'TSAsExpression'
	|| node?.type === 'TSTypeAssertion';

const isPromiseSettledResultArrayTypeAssertion = node =>
	isTypeAssertion(node)
	&& isUnsafePromiseSettledResultArrayTypeAnnotation(node.typeAnnotation);

function isPromiseSettledResultVariable(node, context, visitedVariables) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const isPromiseSettledResult = Boolean(
		isUnsafePromiseSettledResultArrayTypeAnnotation(definition.name?.typeAnnotation)
		|| (
			definition.type === 'Variable'
			&& definition.parent.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
			&& isPromiseSettledResultArray(definition.node.init, context, visitedVariables)
		),
	);

	visitedVariables.delete(variable);

	return isPromiseSettledResult;
}

function isPromiseFulfilledResultVariable(node, context, visitedVariables) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	const isPromiseFulfilledResult = Boolean(
		isPromiseFulfilledResultArrayTypeAnnotation(definition.name?.typeAnnotation)
		|| (
			definition.type === 'Variable'
			&& definition.parent.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
			&& isKnownFulfilledResultArray(definition.node.init, context, visitedVariables)
		),
	);

	visitedVariables.delete(variable);

	return isPromiseFulfilledResult;
}

function isPromiseSettledResultArray(node, context, visitedVariables = new Set()) {
	if (isPromiseSettledResultArrayTypeAssertion(node)) {
		return true;
	}

	node = unwrapExpression(node);

	if (!node) {
		return false;
	}

	if (isAwaitedPromiseAllSettledCall(node)) {
		return true;
	}

	if (isUnsafePromiseSettledResultArrayTypeAnnotation(node.typeAnnotation) || isPromiseSettledResultArrayFromTypeInformation(node, context)) {
		return true;
	}

	if (isFilterCall(node)) {
		return isPromiseSettledResultArray(node.callee.object, context, visitedVariables);
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	return isPromiseSettledResultVariable(node, context, visitedVariables);
}

const getIdentifierName = node => {
	node = unwrapExpression(node);
	return node?.type === 'Identifier' ? node.name : undefined;
};

const getParameterStatusName = parameter => getParameterStatusIdentifier(parameter)?.name;

const getParameterStatusIdentifier = parameter => {
	parameter = unwrapExpression(parameter);

	if (parameter?.type !== 'ObjectPattern') {
		return;
	}

	for (const property of parameter.properties) {
		if (
			property.type === 'Property'
			&& !property.computed
			&& getPropertyName(property) === 'status'
			&& property.value.type === 'Identifier'
		) {
			return property.value;
		}
	}
};

const getStatusLiteral = node => {
	if (node?.type === 'Literal' && (node.value === 'fulfilled' || node.value === 'rejected')) {
		return node.value;
	}
};

function isStatusReference(node, statusContext) {
	node = unwrapExpression(node);

	if (
		statusContext.statusVariable
		&& isSameVariableReference(node, statusContext.statusVariable, statusContext.context)
	) {
		return true;
	}

	if (
		!statusContext.statusVariable
		&& statusContext.statusName
		&& node?.type === 'Identifier'
		&& node.name === statusContext.statusName
	) {
		return true;
	}

	if (
		statusContext.entryVariable
		&& node?.type === 'MemberExpression'
		&& isSameVariableReference(node.object, statusContext.entryVariable, statusContext.context)
		&& getPropertyName(node) === 'status'
	) {
		return true;
	}

	return Boolean(
		!statusContext.entryVariable
		&& statusContext.entryName
		&& node?.type === 'MemberExpression'
		&& getIdentifierName(node.object) === statusContext.entryName
		&& getPropertyName(node) === 'status',
	);
}

function getStatusCheckKind(node, statusContext) {
	node = unwrapExpression(node);

	if (
		node?.type !== 'BinaryExpression'
		|| !['===', '==', '!==', '!='].includes(node.operator)
	) {
		return;
	}

	const statusLiteral = isStatusReference(node.left, statusContext)
		? getStatusLiteral(node.right)
		: (isStatusReference(node.right, statusContext)
			? getStatusLiteral(node.left)
			: undefined);

	if (!statusLiteral) {
		return;
	}

	const isEqualityCheck = node.operator === '===' || node.operator === '==';

	if (
		(isEqualityCheck && statusLiteral === 'fulfilled')
		|| (!isEqualityCheck && statusLiteral === 'rejected')
	) {
		return 'fulfilled';
	}

	return 'unfulfilled';
}

const isStatusFulfilledCheck = (node, statusContext) =>
	getStatusCheckKind(node, statusContext) === 'fulfilled';

const isStatusUnfulfilledCheck = (node, statusContext) =>
	getStatusCheckKind(node, statusContext) === 'unfulfilled';

function hasFulfilledStatusCheckInConjunction(node, statusContext) {
	node = unwrapExpression(node);

	if (isStatusFulfilledCheck(node, statusContext)) {
		return true;
	}

	return node?.type === 'LogicalExpression'
		&& node.operator === '&&'
		&& (
			hasFulfilledStatusCheckInConjunction(node.left, statusContext)
			|| hasFulfilledStatusCheckInConjunction(node.right, statusContext)
		);
}

function hasUnfulfilledStatusCheckInDisjunction(node, statusContext) {
	node = unwrapExpression(node);

	if (isStatusUnfulfilledCheck(node, statusContext)) {
		return true;
	}

	return node?.type === 'LogicalExpression'
		&& node.operator === '||'
		&& (
			hasUnfulfilledStatusCheckInDisjunction(node.left, statusContext)
			|| hasUnfulfilledStatusCheckInDisjunction(node.right, statusContext)
		);
}

const isConditionalFulfilledGuard = (node, child, statusContext) =>
	node.type === 'ConditionalExpression'
	&& (
		(
			node.consequent === child
			&& hasFulfilledStatusCheckInConjunction(node.test, statusContext)
		) || (
			node.alternate === child
			&& hasUnfulfilledStatusCheckInDisjunction(node.test, statusContext)
		)
	);

const isLogicalFulfilledGuard = (node, child, statusContext) =>
	node.type === 'LogicalExpression'
	&& (
		(
			node.operator === '&&'
			&& node.right === child
			&& hasFulfilledStatusCheckInConjunction(node.left, statusContext)
		) || (
			node.operator === '||'
			&& node.right === child
			&& hasUnfulfilledStatusCheckInDisjunction(node.left, statusContext)
		)
	);

const isIfStatementFulfilledGuard = (node, child, statusContext) =>
	node.type === 'IfStatement'
	&& (
		(
			node.consequent === child
			&& hasFulfilledStatusCheckInConjunction(node.test, statusContext)
		) || (
			node.alternate === child
			&& hasUnfulfilledStatusCheckInDisjunction(node.test, statusContext)
		)
	);

function isAlwaysExitingStatement(node) {
	node = unwrapExpression(node);

	if (node?.type === 'ReturnStatement' || node?.type === 'ThrowStatement') {
		return true;
	}

	if (node?.type === 'BlockStatement') {
		return node.body.length > 0 && isAlwaysExitingStatement(node.body.at(-1));
	}

	return false;
}

function isGuardedByPreviousUnfulfilledExit(node, statusContext) {
	const statements = node.parent?.body;
	if (!Array.isArray(statements)) {
		return false;
	}

	const nodeIndex = statements.indexOf(node);
	const previousStatement = statements[nodeIndex - 1];

	return previousStatement?.type === 'IfStatement'
		&& !previousStatement.alternate
		&& hasUnfulfilledStatusCheckInDisjunction(previousStatement.test, statusContext)
		&& isAlwaysExitingStatement(previousStatement.consequent);
}

const isFulfilledFilterCallback = callback => {
	if (!isFunction(callback) || callback.params.length === 0) {
		return false;
	}

	const entryName = getIdentifierName(callback.params[0]);
	const statusName = getParameterStatusName(callback.params[0]);
	const statusContext = {
		entryName,
		statusName,
	};
	const body = unwrapExpression(callback.body);

	if (body?.type === 'BlockStatement') {
		const [statement] = body.body;
		return body.body.length === 1
			&& statement.type === 'ReturnStatement'
			&& statement.argument
			&& hasFulfilledStatusCheckInConjunction(statement.argument, statusContext);
	}

	return hasFulfilledStatusCheckInConjunction(body, statusContext);
};

function isKnownFulfilledResultArray(node, context, visitedVariables = new Set()) {
	if (isTypeAssertion(node) && isPromiseFulfilledResultArrayTypeAnnotation(node.typeAnnotation)) {
		return true;
	}

	node = unwrapExpression(node);

	if (isPromiseFulfilledResultArrayFromTypeInformation(node, context)) {
		return true;
	}

	if (node.type === 'Identifier') {
		return isPromiseFulfilledResultVariable(node, context, visitedVariables);
	}

	return isFilterCall(node)
		&& hasFulfilledFilterInChain(node)
		&& isPromiseSettledResultArray(node, context);
}

function isGuardedByFulfilledCheck(node, readContext) {
	for (
		let child = node, current = node.parent;
		current;
		child = current, current = current.parent
	) {
		if (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') {
			return false;
		}

		if (
			isConditionalFulfilledGuard(current, child, readContext)
			|| isLogicalFulfilledGuard(current, child, readContext)
			|| isIfStatementFulfilledGuard(current, child, readContext)
		) {
			return true;
		}

		if (isGuardedByPreviousUnfulfilledExit(current, readContext)) {
			return true;
		}

		if (isReturnValue(current)) {
			return false;
		}
	}

	return false;
}

function isUnsafeValueRead(node, readContext) {
	node = unwrapExpression(node);

	return (
		node?.type === 'MemberExpression'
		&& isSameVariableReference(node.object, readContext.entryVariable, readContext.context)
		&& getPropertyName(node) === 'value'
	) || (
		node?.type === 'Identifier'
		&& isSameVariableReference(node, readContext.valueVariable, readContext.context)
	);
}

function getUnsafeValueReadFromChildren(nodes, readContext) {
	for (const child of nodes) {
		if (!child?.type) {
			continue;
		}

		if (isFunction(child) || child.type === 'ClassExpression' || child.type === 'ClassDeclaration') {
			continue;
		}

		const unsafeValueRead = getUnsafeValueRead(child, readContext);
		if (unsafeValueRead) {
			return unsafeValueRead;
		}
	}
}

function getValueProperty(parameter) {
	parameter = unwrapExpression(parameter);

	if (parameter?.type !== 'ObjectPattern') {
		return;
	}

	for (const property of parameter.properties) {
		if (
			property.type === 'Property'
			&& !property.computed
			&& getPropertyName(property) === 'value'
		) {
			return property;
		}
	}
}

function getParameterValueIdentifier(parameter) {
	const valueProperty = getValueProperty(parameter);
	const valueNode = valueProperty?.value;

	if (valueNode?.type === 'Identifier') {
		return valueNode;
	}

	if (
		valueNode?.type === 'AssignmentPattern'
		&& valueNode.left.type === 'Identifier'
	) {
		return valueNode.left;
	}
}

const shouldSkipChildNode = (node, key) =>
	(
		node.type === 'MemberExpression'
		&& key === 'property'
		&& !node.computed
	) || (
		['Property', 'PropertyDefinition', 'MethodDefinition'].includes(node.type)
		&& key === 'key'
		&& !node.computed
	);

function getUnsafeValueRead(node, readContext) {
	node = unwrapExpression(node);

	if (
		isUnsafeValueRead(node, readContext)
		&& !isGuardedByFulfilledCheck(node, readContext)
	) {
		return node;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent' || shouldSkipChildNode(node, key)) {
			continue;
		}

		if (!value || typeof value !== 'object') {
			continue;
		}

		const nodes = Array.isArray(value) ? value : [value];
		const unsafeValueRead = getUnsafeValueReadFromChildren(nodes, readContext);
		if (unsafeValueRead) {
			return unsafeValueRead;
		}
	}
}

function isSameVariableReference(node, variable, context) {
	node = unwrapExpression(node);

	return node?.type === 'Identifier'
		&& variable
		&& findVariable(context.sourceCode.getScope(node), node) === variable;
}

function isDerivedFromVariableThroughFilters(node, variable, context) {
	node = unwrapExpression(node);

	if (isSameVariableReference(node, variable, context)) {
		return true;
	}

	return isFilterCall(node)
		&& isDerivedFromVariableThroughFilters(node.callee.object, variable, context);
}

function hasFulfilledFilterInChain(node) {
	node = unwrapExpression(node);

	while (isFilterCall(node)) {
		if (isFulfilledFilterCallback(node.arguments[0])) {
			return true;
		}

		node = unwrapExpression(node.callee.object);
	}

	return false;
}

function getMapCallbackProblem(callExpression, context, {knownPromiseSettledResultArray = false} = {}) {
	if (
		!isMethodCall(callExpression, {
			method: 'map',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})
		|| (!knownPromiseSettledResultArray && !isPromiseSettledResultArray(callExpression.callee.object, context))
		|| isKnownFulfilledResultArray(callExpression.callee.object, context)
	) {
		return;
	}

	const [callback] = callExpression.arguments;
	if (!isFunction(callback) || callback.params.length === 0) {
		return;
	}

	const [parameter] = callback.params;
	if (isPromiseFulfilledResultFromTypeInformation(parameter, context)) {
		return;
	}

	const valueProperty = getValueProperty(parameter);
	if (valueProperty && valueProperty.value.type !== 'Identifier') {
		return {
			node: valueProperty.key,
			messageId: MESSAGE_ID,
		};
	}

	const entryName = getIdentifierName(parameter);
	const entryVariable = entryName && findVariable(context.sourceCode.getScope(parameter), parameter);
	const valueIdentifier = getParameterValueIdentifier(parameter);
	const valueVariable = valueIdentifier && findVariable(context.sourceCode.getScope(valueIdentifier), valueIdentifier);
	const statusIdentifier = getParameterStatusIdentifier(parameter);
	const statusName = statusIdentifier?.name;
	const statusVariable = statusIdentifier && findVariable(context.sourceCode.getScope(statusIdentifier), statusIdentifier);
	const unsafeValueRead = getUnsafeValueRead(callback.body, {
		entryName,
		entryVariable,
		statusName,
		statusVariable,
		valueVariable,
		context,
	});
	if (unsafeValueRead) {
		return {
			node: unsafeValueRead,
			messageId: MESSAGE_ID,
		};
	}
}

function getThenMapCallbackProblem(node, resultsVariable, context) {
	node = unwrapExpression(node);

	if (!node?.type || isFunction(node) || node.type === 'ClassExpression' || node.type === 'ClassDeclaration') {
		return;
	}

	if (
		isMethodCall(node, {
			method: 'map',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})
		&& isDerivedFromVariableThroughFilters(node.callee.object, resultsVariable, context)
		&& !hasFulfilledFilterInChain(node.callee.object)
	) {
		const problem = getMapCallbackProblem(node, context, {knownPromiseSettledResultArray: true});
		if (problem) {
			return problem;
		}
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent' || shouldSkipChildNode(node, key) || !value || typeof value !== 'object') {
			continue;
		}

		const nodes = Array.isArray(value) ? value : [value];
		for (const child of nodes) {
			const problem = getThenMapCallbackProblem(child, resultsVariable, context);
			if (problem) {
				return problem;
			}
		}
	}
}

function getThenCallbackProblem(callExpression, context) {
	if (
		!isMethodCall(callExpression, {
			method: 'then',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isPromiseAllSettledCall(callExpression.callee.object)
	) {
		return;
	}

	const [callback] = callExpression.arguments;
	if (!isFunction(callback) || callback.params.length === 0) {
		return;
	}

	const [parameter] = callback.params;
	const resultsName = getIdentifierName(parameter);
	const resultsVariable = resultsName && findVariable(context.sourceCode.getScope(parameter), parameter);
	if (!resultsVariable) {
		return;
	}

	return getThenMapCallbackProblem(callback.body, resultsVariable, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => getThenCallbackProblem(callExpression, context) ?? getMapCallbackProblem(callExpression, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow reading `.value` from `Promise.allSettled()` results without a fulfilled status guard.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
