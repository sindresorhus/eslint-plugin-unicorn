import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall, isNewExpression} from './ast/index.js';
import {
	getBuiltinCollectionType,
	getParenthesizedRange,
	getParenthesizedText,
	isBuiltinSet,
	isGlobalIdentifier,
	isParenthesized,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID = 'no-useless-set-construction';
const messages = {
	[MESSAGE_ID]: 'This `Set` construction is unnecessary for `Set#{{method}}()`.',
};

const setReturningMethods = ['union', 'intersection', 'difference', 'symmetricDifference'];
const setMethods = [...setReturningMethods, 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom'];

const isSetMethodCall = (node, methods = setMethods) => isMethodCall(node, {
	methods,
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
});

function getCollection(node, context) {
	if (isBuiltinSet(node, context)) {
		return node;
	}

	if (!isMethodCall(node, {
		methods: ['keys', 'values'],
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const {object, property} = node.callee;
	const type = getBuiltinCollectionType(object, context);
	if (type === 'Set' || (type === 'Map' && property.name === 'keys')) {
		return object;
	}
}

function getReplacement(node, context) {
	const [argument] = node.arguments;
	if (isSetMethodCall(argument, setReturningMethods) && isBuiltinSet(argument.callee.object, context)) {
		return {replacement: argument, method: argument.callee.property.name};
	}

	const {parent} = node;
	if (
		isSetMethodCall(parent)
		&& parent.arguments[0] === node
		&& isBuiltinSet(parent.callee.object, context)
	) {
		const replacement = getCollection(argument, context);
		if (replacement) {
			return {replacement, method: parent.callee.property.name};
		}
	}

	if (
		parent.type !== 'MemberExpression'
		|| parent.object !== node
		|| !isSetMethodCall(parent.parent)
		|| parent.parent.callee !== parent
	) {
		return;
	}

	const replacement = getCollection(argument, context);
	const [other] = parent.parent.arguments;
	if (
		replacement
		&& isBuiltinSet(replacement, context)
		&& getBuiltinCollectionType(other, context)
		&& !hasSideEffect(other, context.sourceCode)
	) {
		return {replacement, method: parent.property.name};
	}
}

function createFix(node, replacement, context) {
	const {sourceCode} = context;
	const [start, end] = getParenthesizedRange(replacement, context);
	if (sourceCode.getCommentsInside(node).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart < start || commentEnd > end;
	})) {
		return;
	}

	let text = getParenthesizedText(replacement, context);
	let callee = node;
	while (
		(callee.parent.type === 'MemberExpression' && callee.parent.object === callee)
		|| isTypeScriptExpressionWrapper(callee.parent)
	) {
		callee = callee.parent;
	}

	if (
		!isParenthesized(replacement, context)
		&& (
			shouldAddParenthesesToMemberExpressionObject(replacement, context)
			|| (callee.parent.type === 'NewExpression' && callee.parent.callee === callee)
		)
	) {
		text = `(${text})`;
	}

	// Removing `new Set` can expose a leading parenthesis to the preceding statement.
	let expression = node;
	while (expression.parent && expression.parent.type !== 'ExpressionStatement') {
		expression = expression.parent;
	}

	if (
		expression.parent?.type === 'ExpressionStatement'
		&& sourceCode.getFirstToken(expression) === sourceCode.getFirstToken(node)
		&& needsSemicolon(sourceCode.getTokenBefore(node), context, text)
	) {
		text = `;${text}`;
	}

	return fixer => fixer.replaceText(node, text);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', node => {
		if (
			!isNewExpression(node, {name: 'Set', argumentsLength: 1})
			|| !isGlobalIdentifier(node.callee, context)
			|| node.typeArguments
			|| node.typeParameters
		) {
			return;
		}

		const result = getReplacement(node, context);
		if (!result) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {method: result.method},
			fix: createFix(node, result.replacement, context),
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `Set` construction around `Set` methods.',
			recommended: 'unopinionated',
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
