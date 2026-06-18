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

function isRangeInside(node, ancestor, sourceCode) {
	const [start, end] = sourceCode.getRange(node);
	const [ancestorStart, ancestorEnd] = sourceCode.getRange(ancestor);

	return start >= ancestorStart && end <= ancestorEnd;
}

function isIdentifierReassignedInNode(identifier, node, context) {
	const variable = findVariable(context.sourceCode.getScope(identifier), identifier);

	return variable?.references.some(reference =>
		reference.identifier !== identifier
		&& reference.isWrite()
		&& isRangeInside(reference.identifier, node, context.sourceCode),
	) ?? false;
}

function getStableLoopIdentifier(identifier, loopBody, context) {
	if (
		!identifier
		|| isIdentifierReassignedInNode(identifier, loopBody, context)
	) {
		return;
	}

	return identifier;
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

function getLoopInformation(loop, iterable, context) {
	const loopValueIdentifier = getLoopValueIdentifier(loop, iterable.method);
	const loopKeyIdentifier = getLoopKeyIdentifier(loop, iterable.method);
	const loopDeleteIdentifier = getLoopDeleteIdentifier(loop, iterable.method);

	return {
		hasCurrentDelete: false,
		iterable: iterable.reference,
		loopDeleteIdentifier: getStableLoopIdentifier(loopDeleteIdentifier, loop.body, context),
		loopKeyIdentifier: getStableLoopIdentifier(loopKeyIdentifier, loop.body, context),
		loopValueIdentifier: getStableLoopIdentifier(loopValueIdentifier, loop.body, context),
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
		loopInformation.hasCurrentDelete = true;
		return;
	}

	if (
		method === 'add'
		&& !loopInformation.hasCurrentDelete
		&& hasSameFirstArgument(callExpression, loopValueIdentifier, context)
	) {
		return;
	}

	if (
		method === 'set'
		&& !loopInformation.hasCurrentDelete
		&& hasSameFirstArgument(callExpression, loopKeyIdentifier, context)
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
			...getLoopInformation(node, iterable, context),
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
