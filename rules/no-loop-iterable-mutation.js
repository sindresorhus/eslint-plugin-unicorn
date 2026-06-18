import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {
	containsOptionalChain,
	isReference,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';
import {
	isArray,
	isMap,
	isSet,
	trackBranchExits,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-loop-iterable-mutation';
const messages = {
	[MESSAGE_ID]: 'Do not mutate `{{iterable}}` while iterating over it.',
};

const arrayMutationMethods = [
	'copyWithin',
	'fill',
	'pop',
	'push',
	'reverse',
	'shift',
	'sort',
	'splice',
	'unshift',
];

const setMutationMethods = [
	'add',
	'clear',
	'delete',
];

const mapMutationMethods = [
	'clear',
	'delete',
	'set',
];

const mutationMethodsByCollectionKind = {
	array: new Set(arrayMutationMethods),
	set: new Set(setMutationMethods),
	map: new Set(mapMutationMethods),
	unknown: new Set([
		...arrayMutationMethods,
		...setMutationMethods,
		...mapMutationMethods,
	]),
};

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

function getCollectionKind(node, context) {
	if (isArray(node, context)) {
		return 'array';
	}

	if (isSet(node, context)) {
		return 'set';
	}

	if (isMap(node, context)) {
		return 'map';
	}
}

function isMutationMethod(method, collectionKind) {
	return mutationMethodsByCollectionKind[collectionKind ?? 'unknown'].has(method);
}

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
			collectionKind: getCollectionKind(node, context),
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
		collectionKind: getCollectionKind(node.callee.object, context),
		reference: node.callee.object,
		method,
	};
}

function getAddArgumentIdentifier(loop, iterable) {
	const binding = getLoopBinding(loop);

	if (iterable.method === 'entries') {
		return getFirstElementIdentifier(binding);
	}

	if (
		iterable.method === 'direct'
		&& iterable.collectionKind === 'map'
	) {
		return;
	}

	return getIdentifierFromPattern(binding);
}

function getCurrentKeyIdentifier(loop, iterable) {
	const binding = getLoopBinding(loop);

	if (iterable.method === 'keys') {
		return getIdentifierFromPattern(binding);
	}

	if (iterable.method === 'entries') {
		return getFirstElementIdentifier(binding);
	}

	if (
		iterable.method === 'direct'
		&& iterable.collectionKind !== 'set'
	) {
		return getFirstElementIdentifier(binding);
	}
}

function getDeleteArgumentIdentifier(loop, iterable) {
	const binding = getLoopBinding(loop);

	if (
		iterable.collectionKind === 'set'
		&& (
			iterable.method === 'direct'
			|| iterable.method === 'values'
		)
	) {
		return getIdentifierFromPattern(binding);
	}

	if (
		iterable.method === 'direct'
		&& iterable.collectionKind !== 'map'
	) {
		return getIdentifierFromPattern(binding) ?? getFirstElementIdentifier(binding);
	}

	return getCurrentKeyIdentifier(loop, iterable);
}

function getLoopInformation(loop, iterable) {
	if (!isConstantLoopBinding(loop)) {
		return {
			collectionKind: iterable.collectionKind,
			iterable: iterable.reference,
			loopBody: loop.body,
		};
	}

	const addArgumentIdentifier = getAddArgumentIdentifier(loop, iterable);
	const setKeyIdentifier = getCurrentKeyIdentifier(loop, iterable);
	const deleteArgumentIdentifier = getDeleteArgumentIdentifier(loop, iterable);

	return {
		addArgumentIdentifier,
		collectionKind: iterable.collectionKind,
		deleteArgumentIdentifier,
		iterable: iterable.reference,
		loopBody: loop.body,
		setKeyIdentifier,
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

function getStatementListParent(node) {
	let statement = node;

	while (
		statement.parent
		&& statement.parent.type !== 'BlockStatement'
		&& statement.parent.type !== 'SwitchCase'
	) {
		statement = statement.parent;
	}

	if (!statement.parent) {
		return;
	}

	return {
		parent: statement.parent,
		statement,
		statements: statement.parent.type === 'SwitchCase' ? statement.parent.consequent : statement.parent.body,
	};
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
		&& hasSameFirstArgument(callExpression, loopInformation.deleteArgumentIdentifier, context)
	);
}

function isCurrentAddOrSetCall(callExpression, loopInformation, method, context) {
	return (
		(
			method === 'add'
			&& hasSameFirstArgument(callExpression, loopInformation.addArgumentIdentifier, context)
		)
		|| (
			method === 'set'
			&& hasSameFirstArgument(callExpression, loopInformation.setKeyIdentifier, context)
		)
	);
}

function hasDirectCurrentDeleteStatement(statement, loopInformation, context) {
	const callExpression = getSimpleCallStatement(statement);

	if (callExpression) {
		return isCurrentDeleteCall(callExpression, loopInformation, context);
	}

	if (statement.type === 'BlockStatement') {
		return statement.body.some(child => hasDirectCurrentDeleteStatement(child, loopInformation, context));
	}

	if (statement.type === 'IfStatement') {
		return (
			(
				!loopInformation.branchAlwaysExits(statement.consequent)
				&& hasDirectCurrentDeleteStatement(statement.consequent, loopInformation, context)
			)
			|| (
				statement.alternate
				&& !loopInformation.branchAlwaysExits(statement.alternate)
				&& hasDirectCurrentDeleteStatement(statement.alternate, loopInformation, context)
			)
		);
	}

	return false;
}

function hasEarlierCurrentDelete(callExpression, loopInformation, context) {
	const parent = getStatementListParent(callExpression);

	if (!parent) {
		return false;
	}

	const {statement, statements} = parent;
	const statementIndex = statements.indexOf(statement);

	if (statements.slice(0, statementIndex).some(previousStatement => hasDirectCurrentDeleteStatement(previousStatement, loopInformation, context))) {
		return true;
	}

	return parent.parent !== loopInformation.loopBody && hasEarlierCurrentDelete(parent.parent, loopInformation, context);
}

function getMutationProblem(callExpression, loopInformation, nestedLoopInformation, context) {
	if (callExpression.callee.type !== 'MemberExpression') {
		return;
	}

	const {
		addArgumentIdentifier,
		deleteArgumentIdentifier,
		iterable,
		reportedCallExpressions,
		setKeyIdentifier,
	} = loopInformation;
	const {object, property} = callExpression.callee;
	const method = getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));

	if (!isMutationMethod(method, loopInformation.collectionKind)) {
		return;
	}

	if (!isSameReferenceBinding(object, iterable, context)) {
		return;
	}

	const isCurrentDelete = method === 'delete' && hasSameFirstArgument(callExpression, deleteArgumentIdentifier, context);

	if (isCurrentDelete) {
		return;
	}

	if (
		isCurrentAddOrSetCall(callExpression, {addArgumentIdentifier, setKeyIdentifier}, method, context)
		&& !hasEarlierCurrentDelete(callExpression, loopInformation, context)
	) {
		return;
	}

	if (
		nestedLoopInformation
		&& isCurrentAddOrSetCall(callExpression, nestedLoopInformation, method, context)
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

function * getMutationProblems(node, loopInformation, nestedLoopInformation, context) {
	if (skippedNodeTypes.has(node.type)) {
		return;
	}

	let childNestedLoopInformation = nestedLoopInformation;

	if (node.type === 'ForOfStatement' && !node.await) {
		const iterable = getLiveIterable(node.right, context);

		if (iterable && isSameReferenceBinding(iterable.reference, loopInformation.iterable, context)) {
			childNestedLoopInformation = getLoopInformation(node, iterable);
		}
	}

	if (node.type === 'CallExpression') {
		const problem = getMutationProblem(node, loopInformation, nestedLoopInformation, context);

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
					yield * getMutationProblems(child, loopInformation, childNestedLoopInformation, context);
				}
			}

			continue;
		}

		if (value) {
			yield * getMutationProblems(value, loopInformation, childNestedLoopInformation, context);
		}
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const reportedCallExpressions = new WeakSet();
	const branchAlwaysExits = trackBranchExits(context);

	context.onExit('ForOfStatement', node => {
		if (node.await) {
			return;
		}

		const iterable = getLiveIterable(node.right, context);

		if (!iterable) {
			return;
		}

		return getMutationProblems(node.body, {
			branchAlwaysExits,
			...getLoopInformation(node, iterable),
			reportedCallExpressions,
		}, undefined, context);
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
