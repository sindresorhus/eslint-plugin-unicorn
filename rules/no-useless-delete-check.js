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

const typeAnnotationExpressionTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const nonObjectTypeAnnotationTypes = new Set([
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSUndefinedKeyword',
	'TSVoidKeyword',
]);

const getTypeAnnotation = (node, context) => {
	if (node.type === 'TSNonNullExpression') {
		return getTypeAnnotation(node.expression, context);
	}

	if (typeAnnotationExpressionTypes.has(node.type)) {
		return node.typeAnnotation;
	}

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs[0]?.name?.typeAnnotation?.typeAnnotation ?? node.typeAnnotation?.typeAnnotation;
};

const isNonObjectTypeAnnotation = node => {
	if (nonObjectTypeAnnotationTypes.has(node?.type)) {
		return true;
	}

	if (node?.type === 'TSLiteralType') {
		const {literal} = node;
		return literal.type === 'Literal'
			&& (
				literal.value === null
				|| (
					typeof literal.value !== 'object'
					&& typeof literal.value !== 'function'
				)
			);
	}

	return node?.type === 'TSUnionType' && node.types.every(type => isNonObjectTypeAnnotation(type));
};

const isCollectionConstructor = (node, context) =>
	node.type === 'Identifier'
	&& collectionConstructors.has(node.name)
	&& context.sourceCode.isGlobalReference(node);

const isKnownCollection = (node, context) => {
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
	return result && typeof result.value !== 'symbol' ? String(result.value) : undefined;
};

const isKnownNonObject = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));

	if (result) {
		return result.value === null
			|| (
				typeof result.value !== 'object'
				&& typeof result.value !== 'function'
			);
	}

	return isNonObjectTypeAnnotation(getTypeAnnotation(node, context));
};

const isSamePropertyKey = (left, right, context) => {
	if (isSameReference(left, right)) {
		return true;
	}

	const leftKey = getStaticPropertyKey(left, context);
	const rightKey = getStaticPropertyKey(right, context);

	return leftKey !== undefined && leftKey === rightKey;
};

const isSafeExpression = (node, context) =>
	!hasSideEffect(node, context.sourceCode, hasSideEffectOptions);

const isSafeMemberExpression = (node, context) =>
	isSafeExpression(node.object, context)
	&& (!node.computed || isSafeExpression(node.property, context));

function getObjectDeleteProblem(ifStatement, deleteExpression, context) {
	const {test} = ifStatement;
	const {argument} = deleteExpression;

	if (!(
		test.type === 'BinaryExpression'
		&& test.operator === 'in'
		&& argument.type === 'MemberExpression'
		&& !argument.optional
		&& isSameReference(test.right, argument.object)
		&& !isKnownNonObject(test.right, context)
		&& isSafeExpression(test.left, context)
		&& isSafeExpression(test.right, context)
		&& isSafeMemberExpression(argument, context)
	)) {
		return;
	}

	if (argument.computed) {
		return isSamePropertyKey(test.left, argument.property, context)
			? {
				deleteExpression,
				suggest: [getSuggestion(ifStatement, deleteExpression, context)],
			}
			: undefined;
	}

	const propertyName = getPropertyName(argument, context.sourceCode.getScope(argument));
	return propertyName !== null && getStaticPropertyKey(test.left, context) === propertyName
		? {
			deleteExpression,
			suggest: [getSuggestion(ifStatement, deleteExpression, context)],
		}
		: undefined;
}

function getCollectionDeleteProblem(ifStatement, callExpression, context) {
	const {test} = ifStatement;

	if (!(
		isMethodCall(test, {
			method: 'has',
			argumentsLength: 1,
			computed: false,
			optionalCall: false,
			optionalMember: false,
			allowSpreadElement: false,
		})
		&& isMethodCall(callExpression, {
			method: 'delete',
			argumentsLength: 1,
			computed: false,
			optionalCall: false,
			optionalMember: false,
			allowSpreadElement: false,
		})
		&& isKnownCollection(test.callee.object, context)
		&& isSameReference(test.callee.object, callExpression.callee.object)
		&& isSameReference(test.arguments[0], callExpression.arguments[0])
		&& isSafeExpression(test.callee.object, context)
		&& isSafeExpression(test.arguments[0], context)
		&& isSafeExpression(callExpression.callee.object, context)
		&& isSafeExpression(callExpression.arguments[0], context)
	)) {
		return;
	}

	return {
		deleteExpression: callExpression,
		fix: fix(ifStatement, callExpression, context),
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

const fix = (ifStatement, deleteExpression, context) => fixer => {
	if (hasCommentInRange(context, context.sourceCode.getRange(ifStatement))) {
		return;
	}

	let replacement = context.sourceCode.getText(deleteExpression.parent);

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
	fix: fix(ifStatement, deleteExpression, context),
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
