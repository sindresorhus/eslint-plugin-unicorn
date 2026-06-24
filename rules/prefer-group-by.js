import {
	isEmptyArrayExpression,
	isEmptyObjectExpression,
	isMethodCall,
	isNullLiteral,
	isReferenceIdentifier,
} from './ast/index.js';
import {
	getParenthesizedText,
	isKnownNonArray,
	isSameIdentifier,
	isSameReference,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {containsOptionalChain} from './utils/comparison.js';

const MESSAGE_ID = 'prefer-group-by';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{method}}()` over `Array#reduce()`.',
};

const isSupportedOptionalParameter = node =>
	!node || node.type === 'Identifier';

const isEmptyObject = node =>
	isEmptyObjectExpression(node)
	|| (
		isMethodCall(node, {
			object: 'Object',
			method: 'create',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& isNullLiteral(node.arguments[0])
	);

const isNewMap = node =>
	node.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Map'
	&& node.arguments.length === 0;

const isGroupingCallback = node =>
	(
		node.type === 'ArrowFunctionExpression'
		|| node.type === 'FunctionExpression'
	)
	&& !node.async
	&& !node.generator
	&& node.body.type === 'BlockStatement'
	&& node.params.length <= 4
	&& node.params[0]?.type === 'Identifier'
	&& node.params[1]?.type === 'Identifier'
	&& isSupportedOptionalParameter(node.params[2])
	&& isSupportedOptionalParameter(node.params[3]);

function isNodeMatchedInside(node, predicate) {
	if (predicate(node)) {
		return true;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			if (value.some(node => node?.type && isNodeMatchedInside(node, predicate))) {
				return true;
			}

			continue;
		}

		if (value?.type && isNodeMatchedInside(value, predicate)) {
			return true;
		}
	}

	return false;
}

const referencesIdentifier = (node, identifier) =>
	identifier
	&& isNodeMatchedInside(node, node =>
		isReferenceIdentifier(node, identifier.name));

const hasFunctionSpecificReference = node =>
	isNodeMatchedInside(node, node =>
		node.type === 'ThisExpression'
		|| isReferenceIdentifier(node, 'arguments'));

const isReturnAccumulatorStatement = (statement, accumulator) =>
	statement?.type === 'ReturnStatement'
	&& statement.argument
	&& isSameIdentifier(statement.argument, accumulator);

const getExpressionStatementResult = (statement, getResult) =>
	statement?.type === 'ExpressionStatement'
		? getResult(statement.expression)
		: undefined;

const getSingleDeclaration = statement => {
	if (
		statement?.type !== 'VariableDeclaration'
		|| statement.kind !== 'const'
		|| statement.declarations.length !== 1
	) {
		return;
	}

	const [declaration] = statement.declarations;
	return declaration.id.type === 'Identifier' && declaration.init ? declaration : undefined;
};

function getKeyBinding(statements, callbackParts) {
	const declaration = getSingleDeclaration(statements[0]);
	if (!declaration) {
		return {statements, keyExpression: undefined, keyIdentifier: undefined};
	}

	const {accumulator, index, array} = callbackParts;
	if (
		referencesIdentifier(declaration.init, accumulator)
		|| referencesIdentifier(declaration.init, index)
		|| referencesIdentifier(declaration.init, array)
	) {
		return;
	}

	return {
		statements: statements.slice(1),
		keyExpression: declaration.init,
		keyIdentifier: declaration.id,
	};
}

const isExpectedKey = (key, expectedKey, keyIdentifier) => {
	if (keyIdentifier) {
		return isSameIdentifier(key, keyIdentifier);
	}

	return !containsOptionalChain(key)
		&& !containsOptionalChain(expectedKey)
		&& isSameReference(key, expectedKey);
};

function isValidKeyExpression(key, callbackParts) {
	const {accumulator, index, array} = callbackParts;
	return !containsOptionalChain(key)
		&& !referencesIdentifier(key, accumulator)
		&& !referencesIdentifier(key, index)
		&& !referencesIdentifier(key, array);
}

function getObjectGroupMember(node, accumulator) {
	return node.type === 'MemberExpression'
		&& node.computed
		&& !node.optional
		&& isSameIdentifier(node.object, accumulator)
		? node.property
		: undefined;
}

function getObjectInitializerKey(expression, callbackParts) {
	if (
		expression.type === 'AssignmentExpression'
		&& ['??=', '||='].includes(expression.operator)
		&& isEmptyArrayExpression(expression.right)
	) {
		return getObjectGroupMember(expression.left, callbackParts.accumulator);
	}

	if (
		expression.type !== 'AssignmentExpression'
		|| expression.operator !== '='
		|| expression.right.type !== 'LogicalExpression'
		|| !['||', '??'].includes(expression.right.operator)
		|| !isEmptyArrayExpression(expression.right.right)
	) {
		return;
	}

	const key = getObjectGroupMember(expression.left, callbackParts.accumulator);
	return key && isSameReference(expression.left, expression.right.left) ? key : undefined;
}

function getObjectPushKey(expression, callbackParts, {requireInitializer = false} = {}) {
	if (
		!isMethodCall(expression, {
			method: 'push',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isSameIdentifier(expression.arguments[0], callbackParts.element)
	) {
		return;
	}

	const {object} = expression.callee;
	if (object.type === 'AssignmentExpression') {
		return getObjectInitializerKey(object, callbackParts);
	}

	if (requireInitializer) {
		return;
	}

	return getObjectGroupMember(object, callbackParts.accumulator);
}

function getObjectGroupByKey(statements, callbackParts) {
	const keyBinding = getKeyBinding(statements, callbackParts);
	if (!keyBinding) {
		return;
	}

	const {keyExpression, keyIdentifier} = keyBinding;
	statements = keyBinding.statements;

	if (!isReturnAccumulatorStatement(statements.at(-1), callbackParts.accumulator)) {
		return;
	}

	statements = statements.slice(0, -1);

	if (statements.length === 1) {
		const pushKey = getExpressionStatementResult(statements[0], expression => getObjectPushKey(expression, callbackParts, {requireInitializer: true}));
		if (!pushKey) {
			return;
		}

		const key = keyExpression ?? pushKey;
		return isExpectedKey(pushKey, key, keyIdentifier) && isValidKeyExpression(key, callbackParts) ? key : undefined;
	}

	if (statements.length !== 2) {
		return;
	}

	const initializerKey = getExpressionStatementResult(statements[0], expression => getObjectInitializerKey(expression, callbackParts));
	const pushKey = getExpressionStatementResult(statements[1], expression => getObjectPushKey(expression, callbackParts));
	const key = keyExpression ?? initializerKey;

	return initializerKey
		&& pushKey
		&& isExpectedKey(initializerKey, key, keyIdentifier)
		&& isExpectedKey(pushKey, key, keyIdentifier)
		&& isValidKeyExpression(key, callbackParts)
		? key
		: undefined;
}

function getMapCallKey(expression, accumulator, method) {
	return isMethodCall(expression, {
		object: accumulator.name,
		method,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
		? expression.arguments[0]
		: undefined;
}

function isMapGetPushExpression(expression, callbackParts, key, keyIdentifier) {
	if (
		!isMethodCall(expression, {
			method: 'push',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isSameIdentifier(expression.arguments[0], callbackParts.element)
	) {
		return false;
	}

	const getKey = getMapCallKey(expression.callee.object, callbackParts.accumulator, 'get');
	return Boolean(getKey && isExpectedKey(getKey, key, keyIdentifier));
}

function isMapSetExpression(expression, options) {
	const {callbackParts, key, value, keyIdentifier} = options;
	if (
		!isMethodCall(expression, {
			object: callbackParts.accumulator.name,
			method: 'set',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isExpectedKey(expression.arguments[0], key, keyIdentifier)
	) {
		return false;
	}

	const setValue = expression.arguments[1];
	return isSameIdentifier(setValue, value);
}

function isMapSetArrayExpression(expression, callbackParts, key, keyIdentifier) {
	if (
		!isMethodCall(expression, {
			object: callbackParts.accumulator.name,
			method: 'set',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isExpectedKey(expression.arguments[0], key, keyIdentifier)
	) {
		return false;
	}

	const setValue = expression.arguments[1];
	return setValue.type === 'ArrayExpression'
		&& setValue.elements.length === 1
		&& setValue.elements[0]?.type !== 'SpreadElement'
		&& isSameIdentifier(setValue.elements[0], callbackParts.element);
}

const getOnlyExpression = statement =>
	statement?.type === 'ExpressionStatement' ? statement.expression : undefined;

function isBlockWithSingleExpression(block, predicate) {
	return block?.type === 'BlockStatement'
		&& block.body.length === 1
		&& predicate(block.body[0]);
}

function getMapIfElseGroupByKey(statement, callbackParts, keyExpression, keyIdentifier) {
	if (
		statement?.type !== 'IfStatement'
		|| statement.alternate?.type !== 'BlockStatement'
	) {
		return;
	}

	const testKey = getMapCallKey(statement.test, callbackParts.accumulator, 'has');
	const key = keyExpression ?? testKey;

	if (
		!testKey
		|| !isExpectedKey(testKey, key, keyIdentifier)
		|| !isBlockWithSingleExpression(statement.consequent, statement =>
			isMapGetPushExpression(getOnlyExpression(statement), callbackParts, key, keyIdentifier))
		|| !isBlockWithSingleExpression(statement.alternate, statement =>
			isMapSetArrayExpression(getOnlyExpression(statement), callbackParts, key, keyIdentifier))
	) {
		return;
	}

	return key;
}

function getMapGroupVariableDeclaration(statement, callbackParts) {
	const declaration = getSingleDeclaration(statement);
	if (
		!declaration
		|| declaration.init.type !== 'LogicalExpression'
		|| !['||', '??'].includes(declaration.init.operator)
		|| !isEmptyArrayExpression(declaration.init.right)
	) {
		return;
	}

	const key = getMapCallKey(declaration.init.left, callbackParts.accumulator, 'get');
	return key ? {group: declaration.id, key} : undefined;
}

function getMapGetSetGroupByKey(statements, callbackParts, keyExpression, keyIdentifier) {
	if (statements.length !== 3) {
		return;
	}

	const declaration = getMapGroupVariableDeclaration(statements[0], callbackParts);
	const key = keyExpression ?? declaration?.key;

	if (
		!declaration
		|| !isExpectedKey(declaration.key, key, keyIdentifier)
		|| !getExpressionStatementResult(statements[1], expression =>
			isMethodCall(expression, {
				object: declaration.group.name,
				method: 'push',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& isSameIdentifier(expression.arguments[0], callbackParts.element))
		|| !getExpressionStatementResult(statements[2], expression =>
			isMapSetExpression(expression, {
				callbackParts,
				key,
				value: declaration.group,
				keyIdentifier,
			}))
	) {
		return;
	}

	return key;
}

function getMapGroupByKey(statements, callbackParts) {
	const keyBinding = getKeyBinding(statements, callbackParts);
	const {keyExpression, keyIdentifier} = keyBinding ?? {};
	statements = keyBinding?.statements ?? statements;

	if (!isReturnAccumulatorStatement(statements.at(-1), callbackParts.accumulator)) {
		return;
	}

	statements = statements.slice(0, -1);

	const key = statements.length === 1
		? getMapIfElseGroupByKey(statements[0], callbackParts, keyExpression, keyIdentifier)
		: getMapGetSetGroupByKey(statements, callbackParts, keyExpression, keyIdentifier);

	return key && isValidKeyExpression(key, callbackParts) ? key : undefined;
}

const isSparseArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.some(element => !element);

const isSingleArgumentArrayConstruction = node =>
	(
		node.type === 'CallExpression'
		|| node.type === 'NewExpression'
	)
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Array'
	&& node.arguments.length === 1;

function isSparseArrayReceiver(node) {
	node = unwrapTypeScriptExpression(node);

	return isSparseArrayExpression(node)
		|| isSingleArgumentArrayConstruction(node)
		|| (
			node.type === 'MemberExpression'
			&& isSparseArrayReceiver(node.object)
		)
		|| (
			node.type === 'CallExpression'
			&& node.callee.type === 'MemberExpression'
			&& isSparseArrayReceiver(node.callee.object)
		);
}

const shouldSkipReduceCall = (callExpression, context) =>
	!isMethodCall(callExpression, {
		method: 'reduce',
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	|| callExpression.optional
	|| callExpression.callee.optional
	|| containsOptionalChain(callExpression.callee.object)
	|| isSparseArrayReceiver(callExpression.callee.object)
	|| isKnownNonArray(callExpression.callee.object, context);

function getGroupByMethod(initialValue) {
	if (isEmptyObject(initialValue)) {
		return 'Object.groupBy';
	}

	if (isNewMap(initialValue)) {
		return 'Map.groupBy';
	}
}

function getArrowParameterText(node, context) {
	const text = context.sourceCode.getText(node);
	return node.typeAnnotation || node.optional ? `(${text})` : text;
}

function getArrowBodyText(node, context) {
	let text = getParenthesizedText(node, context);

	if (text.trimStart().startsWith('{')) {
		text = `(${text})`;
	}

	return text;
}

function getGroupByProblem(callExpression, context) {
	if (shouldSkipReduceCall(callExpression, context)) {
		return;
	}

	const [callback, initialValue] = callExpression.arguments;
	if (!isGroupingCallback(callback)) {
		return;
	}

	const callbackParts = {
		accumulator: callback.params[0],
		element: callback.params[1],
		index: callback.params[2]?.type === 'Identifier' ? callback.params[2] : undefined,
		array: callback.params[3]?.type === 'Identifier' ? callback.params[3] : undefined,
	};

	const method = getGroupByMethod(initialValue);
	if (!method) {
		return;
	}

	const key = method === 'Object.groupBy'
		? getObjectGroupByKey(callback.body.body, callbackParts)
		: getMapGroupByKey(callback.body.body, callbackParts);

	if (!key) {
		return;
	}

	const problem = {
		node: callExpression.callee.property,
		messageId: MESSAGE_ID,
		data: {method},
	};

	if (
		callExpression.typeArguments
		|| callExpression.typeParameters
		|| callbackParts.accumulator.typeAnnotation
		|| callback.returnType
		|| (
			callback.type === 'FunctionExpression'
			&& hasFunctionSpecificReference(key)
		)
		|| context.sourceCode.getCommentsInside(callExpression).length > 0
	) {
		return problem;
	}

	problem.fix = fixer => {
		const arrayText = getParenthesizedText(callExpression.callee.object, context);
		const elementText = getArrowParameterText(callbackParts.element, context);
		const keyText = getArrowBodyText(key, context);
		return fixer.replaceText(callExpression, `${method}(${arrayText}, ${elementText} => ${keyText})`);
	};

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => getGroupByProblem(callExpression, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Object.groupBy()` or `Map.groupBy()` over reduce-based grouping.',
			recommended: true,
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
