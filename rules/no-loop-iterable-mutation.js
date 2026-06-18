import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {
	containsOptionalChain,
	isReference,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-loop-iterable-mutation';
const messages = {
	[MESSAGE_ID]: 'Do not mutate `{{iterable}}` while iterating over it.',
};

const mutationMethods = new Set([
	'add',
	'clear',
	'copyWithin',
	'delete',
	'fill',
	'pop',
	'push',
	'reverse',
	'shift',
	'sort',
	'splice',
	'set',
	'unshift',
]);

const iteratorMethods = new Set([
	'entries',
	'keys',
	'values',
]);

const skippedNodeTypes = new Set([
	'ArrowFunctionExpression',
	'ClassDeclaration',
	'ClassExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

function getLoopBinding(loop) {
	if (loop.left.type === 'VariableDeclaration') {
		return loop.left.declarations[0].id;
	}

	return loop.left;
}

function isConstantLoopBinding(loop) {
	return loop.left.type === 'VariableDeclaration' && loop.left.kind === 'const';
}

function getIdentifierFromPattern(node) {
	node = unwrapExpression(node);
	return node.type === 'Identifier' ? node : undefined;
}

function getFirstElementIdentifier(node) {
	node = unwrapExpression(node);

	if (node.type !== 'ArrayPattern') {
		return;
	}

	const [firstElement] = node.elements;
	return firstElement && getIdentifierFromPattern(firstElement);
}

function getLiveIterable(node, context) {
	node = unwrapExpression(node);

	if (containsOptionalChain(node)) {
		return;
	}

	if (isReference(node)) {
		return {
			reference: node,
			method: 'direct',
		};
	}

	if (
		node.type !== 'CallExpression'
		|| node.callee.type !== 'MemberExpression'
		|| node.arguments.length > 0
	) {
		return;
	}

	const method = getPropertyName(node.callee, context.sourceCode.getScope(node.callee));

	if (
		!iteratorMethods.has(method)
		|| containsOptionalChain(node.callee.object)
		|| !isReference(node.callee.object)
	) {
		return;
	}

	return {
		reference: node.callee.object,
		method,
	};
}

function getLoopValueIdentifier(loop, iterableMethod) {
	const binding = getLoopBinding(loop);

	if (iterableMethod === 'entries') {
		return getFirstElementIdentifier(binding);
	}

	if (
		iterableMethod !== 'direct'
		&& iterableMethod !== 'keys'
		&& iterableMethod !== 'values'
	) {
		return;
	}

	return getIdentifierFromPattern(binding);
}

function getLoopKeyIdentifier(loop, iterableMethod) {
	const binding = getLoopBinding(loop);

	if (iterableMethod === 'keys') {
		return getIdentifierFromPattern(binding);
	}

	if (iterableMethod === 'direct' || iterableMethod === 'entries') {
		return getFirstElementIdentifier(binding);
	}
}

function getLoopDeleteIdentifier(loop, iterableMethod) {
	const binding = getLoopBinding(loop);

	if (iterableMethod === 'direct') {
		return getIdentifierFromPattern(binding) ?? getFirstElementIdentifier(binding);
	}

	return getLoopKeyIdentifier(loop, iterableMethod);
}

function getLoopInformation(loop, iterable) {
	if (!isConstantLoopBinding(loop)) {
		return {
			iterable: iterable.reference,
			loopBody: loop.body,
		};
	}

	const loopValueIdentifier = getLoopValueIdentifier(loop, iterable.method);
	const loopKeyIdentifier = getLoopKeyIdentifier(loop, iterable.method);
	const loopDeleteIdentifier = getLoopDeleteIdentifier(loop, iterable.method);

	return {
		iterable: iterable.reference,
		loopBody: loop.body,
		loopDeleteIdentifier,
		loopKeyIdentifier,
		loopValueIdentifier,
	};
}

function * getReferenceIdentifiers(node) {
	node = unwrapExpression(node);

	if (node.type === 'Identifier') {
		yield node;
		return;
	}

	if (node.type === 'MemberExpression') {
		yield * getReferenceIdentifiers(node.object);

		if (node.computed) {
			yield * getReferenceIdentifiers(node.property);
		}
	}
}

function isSameBinding(left, right, context) {
	const leftVariable = findVariable(context.sourceCode.getScope(left), left);
	const rightVariable = findVariable(context.sourceCode.getScope(right), right);

	if (leftVariable || rightVariable) {
		return leftVariable === rightVariable;
	}

	return left.name === right.name;
}

function isSameReferenceBinding(left, right, context) {
	if (!isSame(left, right)) {
		return false;
	}

	const leftIdentifiers = [...getReferenceIdentifiers(left)];
	const rightIdentifiers = [...getReferenceIdentifiers(right)];

	if (
		leftIdentifiers.length !== rightIdentifiers.length
		|| leftIdentifiers.length === 0
	) {
		return leftIdentifiers.length === rightIdentifiers.length;
	}

	return leftIdentifiers.every((leftIdentifier, index) =>
		isSameBinding(leftIdentifier, rightIdentifiers[index], context),
	);
}

function hasSameFirstArgument(callExpression, identifier, context) {
	const [argument] = callExpression.arguments;

	return Boolean(
		identifier
		&& argument
		&& isSameReferenceBinding(argument, identifier, context),
	);
}

function getBlockStatementParent(node) {
	let statement = node;

	while (statement.parent && statement.parent.type !== 'BlockStatement') {
		statement = statement.parent;
	}

	return statement.parent && {block: statement.parent, statement};
}

function getSimpleCallStatement(statement) {
	if (statement.type !== 'ExpressionStatement') {
		return;
	}

	const expression = unwrapExpression(statement.expression);
	return expression.type === 'CallExpression' ? expression : undefined;
}

function isCurrentDeleteCall(callExpression, loopInformation, context) {
	return (
		callExpression.callee.type === 'MemberExpression'
		&& getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee)) === 'delete'
		&& isSameReferenceBinding(callExpression.callee.object, loopInformation.iterable, context)
		&& hasSameFirstArgument(callExpression, loopInformation.loopDeleteIdentifier, context)
	);
}

function hasCurrentDeleteStatement(statement, loopInformation, context) {
	const callExpression = getSimpleCallStatement(statement);

	if (callExpression) {
		return isCurrentDeleteCall(callExpression, loopInformation, context);
	}

	return statement.type === 'BlockStatement' && statement.body.some(child => hasCurrentDeleteStatement(child, loopInformation, context));
}

function hasEarlierCurrentDelete(callExpression, loopInformation, context) {
	const parent = getBlockStatementParent(callExpression);

	if (!parent) {
		return false;
	}

	const {block, statement} = parent;
	const statementIndex = block.body.indexOf(statement);

	if (block.body.slice(0, statementIndex).some(previousStatement => hasCurrentDeleteStatement(previousStatement, loopInformation, context))) {
		return true;
	}

	return block !== loopInformation.loopBody && hasEarlierCurrentDelete(block, loopInformation, context);
}

function getMutationProblem(callExpression, loopInformation, context) {
	if (callExpression.callee.type !== 'MemberExpression') {
		return;
	}

	const {
		iterable,
		loopDeleteIdentifier,
		loopKeyIdentifier,
		loopValueIdentifier,
		reportedCallExpressions,
	} = loopInformation;
	const {object, property} = callExpression.callee;
	const method = getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));

	if (!mutationMethods.has(method)) {
		return;
	}

	if (!isSameReferenceBinding(object, iterable, context)) {
		return;
	}

	const isCurrentDelete = method === 'delete' && hasSameFirstArgument(callExpression, loopDeleteIdentifier, context);

	if (isCurrentDelete) {
		return;
	}

	if (
		method === 'add'
		&& hasSameFirstArgument(callExpression, loopValueIdentifier, context)
		&& !hasEarlierCurrentDelete(callExpression, loopInformation, context)
	) {
		return;
	}

	if (
		method === 'set'
		&& hasSameFirstArgument(callExpression, loopKeyIdentifier, context)
		&& !hasEarlierCurrentDelete(callExpression, loopInformation, context)
	) {
		return;
	}

	if (reportedCallExpressions.has(callExpression)) {
		return;
	}

	reportedCallExpressions.add(callExpression);

	return {
		node: property,
		messageId: MESSAGE_ID,
		data: {
			iterable: context.sourceCode.getText(iterable),
		},
	};
}

function * getMutationProblems(node, loopInformation, context) {
	if (skippedNodeTypes.has(node.type)) {
		return;
	}

	if (node.type === 'CallExpression') {
		const problem = getMutationProblem(node, loopInformation, context);

		if (problem) {
			yield problem;
		}
	}

	const visitorKeys = context.sourceCode.visitorKeys[node.type] ?? [];

	for (const key of visitorKeys) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const child of value) {
				if (child) {
					yield * getMutationProblems(child, loopInformation, context);
				}
			}

			continue;
		}

		if (value) {
			yield * getMutationProblems(value, loopInformation, context);
		}
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const reportedCallExpressions = new WeakSet();

	context.on('ForOfStatement', node => {
		if (node.await) {
			return;
		}

		const iterable = getLiveIterable(node.right, context);

		if (!iterable) {
			return;
		}

		return getMutationProblems(node.body, {
			...getLoopInformation(node, iterable),
			reportedCallExpressions,
		}, context);
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow mutating a loop iterable during iteration.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
