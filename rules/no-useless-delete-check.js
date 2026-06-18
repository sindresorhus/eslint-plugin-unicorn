import {
	findVariable,
	getPropertyName,
	getStaticValue,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getConstVariableInitializer,
	hasCommentInRange,
	isSameReference,
	needsSemicolon,
	unwrapTypeScriptExpression,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-delete-check';
const SUGGESTION_MESSAGE_ID = 'removeCheck';
const messages = {
	[MESSAGE_ID]: 'The existence check before deletion is unnecessary.',
	[SUGGESTION_MESSAGE_ID]: 'Remove the existence check.',
};

const hasSideEffectOptions = {
	considerGetters: true,
};

const collectionConstructors = new Set([
	'Map',
	'Set',
	'WeakMap',
	'WeakSet',
]);

const knownObjectExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'ObjectExpression',
]);

const functionOrClassDefinitionTypes = new Set([
	'ClassName',
	'FunctionName',
]);

// Type literals are excluded because primitives can structurally satisfy some object-shaped type literals.
const objectTypeAnnotationTypes = new Set([
	'TSConstructorType',
	'TSFunctionType',
	'TSObjectKeyword',
]);

const getTypeAnnotation = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs[0]?.name?.typeAnnotation?.typeAnnotation ?? node.typeAnnotation?.typeAnnotation;
};

const isObjectValue = value => value !== null && (
	typeof value === 'object'
	|| typeof value === 'function'
);

const isObjectTypeAnnotation = node => {
	if (objectTypeAnnotationTypes.has(node?.type)) {
		return true;
	}

	return node?.type === 'TSUnionType' && node.types.every(type => isObjectTypeAnnotation(type));
};

const isFunctionOrClassDeclarationReference = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition => functionOrClassDefinitionTypes.has(definition.type)) ?? false;
};

const isCollectionConstructor = (node, context) =>
	node.type === 'Identifier'
	&& collectionConstructors.has(node.name)
	&& context.sourceCode.isGlobalReference(node);

const isKnownConstCollection = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type !== 'Identifier') {
		return false;
	}

	const initializer = getConstVariableInitializer(node, context);
	if (!initializer) {
		return false;
	}

	const unwrappedInitializer = unwrapTypeScriptExpression(initializer);
	return unwrappedInitializer.type === 'NewExpression'
		&& isCollectionConstructor(unwrappedInitializer.callee, context);
};

const getSingleExpression = node => {
	if (node.type === 'BlockStatement') {
		if (node.body.length !== 1) {
			return;
		}

		node = node.body[0];
	}

	return node.type === 'ExpressionStatement' ? node.expression : undefined;
};

const getStaticPropertyKey = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));
	return result
		&& typeof result.value !== 'symbol'
		&& !isObjectValue(result.value)
		? String(result.value)
		: undefined;
};

const unwrapChainExpression = node =>
	node.type === 'ChainExpression' ? node.expression : node;

const isOpaqueCallPropertyKey = (node, context) => {
	node = unwrapChainExpression(node);
	return (
		node.type === 'CallExpression'
		&& getStaticPropertyKey(node, context) === undefined
	);
};

const isKnownObject = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));

	if (result) {
		return isObjectValue(result.value);
	}

	const initializer = getConstVariableInitializer(unwrapTypeScriptExpression(node), context);
	if (initializer) {
		const unwrappedInitializer = unwrapTypeScriptExpression(initializer);
		const initializerResult = getStaticValue(unwrappedInitializer, context.sourceCode.getScope(unwrappedInitializer));
		if (initializerResult) {
			return isObjectValue(initializerResult.value);
		}

		if (knownObjectExpressionTypes.has(unwrappedInitializer.type)) {
			return true;
		}
	}

	if (isFunctionOrClassDeclarationReference(unwrapTypeScriptExpression(node), context)) {
		return false;
	}

	return isObjectTypeAnnotation(getTypeAnnotation(node, context));
};

const mayNeedRepeatedPropertyKeyCoercion = (node, context) => {
	if (isKnownObject(node, context)) {
		return true;
	}

	if (isFunctionOrClassDeclarationReference(unwrapTypeScriptExpression(node), context)) {
		return true;
	}

	const initializer = getConstVariableInitializer(unwrapTypeScriptExpression(node), context);
	if (!initializer) {
		return false;
	}

	const unwrappedInitializer = unwrapTypeScriptExpression(initializer);
	return unwrappedInitializer.type === 'NewExpression'
		|| isOpaqueCallPropertyKey(unwrappedInitializer, context);
};

const isSamePropertyKey = (left, right, context) => {
	if (isSameReference(left, right)) {
		return !mayNeedRepeatedPropertyKeyCoercion(left, context);
	}

	const leftKey = getStaticPropertyKey(left, context);
	const rightKey = getStaticPropertyKey(right, context);

	return leftKey !== undefined && leftKey === rightKey;
};

const isSafeExpression = (node, context) =>
	!hasSideEffect(node, context.sourceCode, hasSideEffectOptions);

const isOneArgumentMethodCall = (node, method) => isMethodCall(node, {
	method,
	argumentsLength: 1,
	computed: false,
	optionalCall: false,
	optionalMember: false,
	allowSpreadElement: false,
});

function getObjectDeleteProblem(ifStatement, deleteExpression, context) {
	const {test} = ifStatement;
	const {argument} = deleteExpression;

	if (!(
		test.type === 'BinaryExpression'
		&& test.operator === 'in'
		&& argument.type === 'MemberExpression'
		&& !argument.optional
		&& isSameReference(test.right, argument.object)
		&& isKnownObject(test.right, context)
		&& isSafeExpression(test.left, context)
		&& isSafeExpression(test.right, context)
		&& (!argument.computed || isSafeExpression(argument.property, context))
	)) {
		return;
	}

	let propertyMatches;
	if (argument.computed) {
		propertyMatches = isSamePropertyKey(test.left, argument.property, context);
	} else {
		const propertyName = getPropertyName(argument, context.sourceCode.getScope(argument));
		propertyMatches = propertyName !== null && propertyName === getStaticPropertyKey(test.left, context);
	}

	return propertyMatches
		? {
			suggest: [getSuggestion(ifStatement, deleteExpression, context)],
		}
		: undefined;
}

function getCollectionDeleteProblem(ifStatement, callExpression, context) {
	const {test} = ifStatement;

	if (!(
		isOneArgumentMethodCall(test, 'has')
		&& isOneArgumentMethodCall(callExpression, 'delete')
		&& isKnownConstCollection(test.callee.object, context)
		&& isSameReference(test.callee.object, callExpression.callee.object)
		&& isSameReference(test.arguments[0], callExpression.arguments[0])
		&& isSafeExpression(test.arguments[0], context)
	)) {
		return;
	}

	return {
		fix: getFix(ifStatement, callExpression, context),
	};
}

function getProblem(ifStatement, context) {
	if (
		ifStatement.alternate
		|| (
			ifStatement.parent.type === 'IfStatement'
			&& ifStatement.parent.alternate === ifStatement
		)
	) {
		return;
	}

	const expression = getSingleExpression(ifStatement.consequent);

	if (!expression) {
		return;
	}

	if (
		expression.type === 'UnaryExpression'
		&& expression.operator === 'delete'
	) {
		return getObjectDeleteProblem(ifStatement, expression, context);
	}

	return getCollectionDeleteProblem(ifStatement, expression, context);
}

const getFix = (ifStatement, consequentExpression, context) => fixer => {
	if (hasCommentInRange(context, context.sourceCode.getRange(ifStatement))) {
		return;
	}

	let replacement = context.sourceCode.getText(consequentExpression.parent);

	if (!replacement.trimEnd().endsWith(';')) {
		replacement += ';';
	}

	if (needsSemicolon(context.sourceCode.getTokenBefore(ifStatement), context, replacement)) {
		replacement = `;${replacement}`;
	}

	return fixer.replaceText(ifStatement, replacement);
};

const getSuggestion = (ifStatement, deleteExpression, context) => ({
	messageId: SUGGESTION_MESSAGE_ID,
	fix: getFix(ifStatement, deleteExpression, context),
});

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', ifStatement => {
		const problem = getProblem(ifStatement, context);

		if (!problem) {
			return;
		}

		return {
			node: ifStatement.test,
			messageId: MESSAGE_ID,
			fix: problem.fix,
			suggest: problem.suggest,
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary existence checks before deletion.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
