import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {isReference, isSame, unwrapExpression} from './utils/comparison.js';
import {getStaticValueIfNoSideEffects, isComparableStaticValue, isKnownNonMap} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-mismatched-map-key';
const messages = {
	[MESSAGE_ID]: 'Do not check a Map key before accessing a different key.',
};

const skippedNodeTypes = new Set([
	'ArrowFunctionExpression',
	'ClassDeclaration',
	'ClassExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

const isSameValueZero = (left, right) =>
	left === right
	|| (
		typeof left === 'number'
		&& typeof right === 'number'
		&& Number.isNaN(left)
		&& Number.isNaN(right)
	);

const isMapHasCall = node =>
	isMethodCall(unwrapExpression(node), {
		method: 'has',
		argumentsLength: 1,
		computed: false,
		optionalCall: false,
		optionalMember: false,
		allowSpreadElement: false,
	});

const isMapAccessCall = node =>
	isMethodCall(unwrapExpression(node), {
		methods: ['get', 'set'],
		minimumArguments: 1,
		computed: false,
		optionalCall: false,
		optionalMember: false,
		allowSpreadElement: false,
	});

function getMapHasCall(node) {
	node = unwrapExpression(node);

	if (isMapHasCall(node)) {
		return node;
	}

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
		&& node.prefix
		&& isMapHasCall(node.argument)
	) {
		return unwrapExpression(node.argument);
	}
}

function getComparableStaticValue(node, context) {
	const result = getStaticValueIfNoSideEffects(unwrapExpression(node), context);

	if (
		result
		&& isComparableStaticValue(result.value)
	) {
		return {value: result.value};
	}
}

function getRootIdentifier(node) {
	node = unwrapExpression(node);

	if (node.type === 'Identifier') {
		return node;
	}

	if (node.type === 'MemberExpression') {
		return getRootIdentifier(node.object);
	}
}

function patternContainsSameBinding(node, mapHasRoot, context) {
	if (!node) {
		return false;
	}

	if (node.type === 'Identifier') {
		return isSameBinding(node, mapHasRoot, context);
	}

	switch (node.type) {
		case 'ArrayPattern': {
			return node.elements.some(element => patternContainsSameBinding(element, mapHasRoot, context));
		}

		case 'ObjectPattern': {
			return node.properties.some(property => patternContainsSameBinding(property.type === 'RestElement' ? property.argument : property.value, mapHasRoot, context));
		}

		case 'AssignmentPattern': {
			return patternContainsSameBinding(node.left, mapHasRoot, context);
		}

		case 'RestElement': {
			return patternContainsSameBinding(node.argument, mapHasRoot, context);
		}

		default: {
			return false;
		}
	}
}

function hasCallExpression(node, context) {
	const {visitorKeys} = context.sourceCode;
	let isResult = false;

	function visit(node) {
		if (!node) {
			return;
		}

		node = unwrapExpression(node);

		if (
			isResult
			|| skippedNodeTypes.has(node.type)
		) {
			return;
		}

		if (node.type === 'CallExpression') {
			isResult = true;
			return;
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const child = node[key];

			if (Array.isArray(child)) {
				for (const childNode of child) {
					visit(childNode);
				}

				continue;
			}

			visit(child);
		}
	}

	visit(node);

	return isResult;
}

function areDifferentKeys(left, right, context) {
	if (
		hasCallExpression(left, context)
		|| hasCallExpression(right, context)
	) {
		return false;
	}

	const leftValue = getComparableStaticValue(left, context);
	const rightValue = getComparableStaticValue(right, context);

	if (
		leftValue
		&& rightValue
	) {
		return !isSameValueZero(leftValue.value, rightValue.value);
	}

	if (
		isReference(left)
		&& isReference(right)
	) {
		return !isSameReferenceBinding(left, right, context);
	}

	return false;
}

function getSingleStatement(node) {
	if (!node) {
		return;
	}

	if (node.type === 'BlockStatement') {
		return node.body.length === 1 ? node.body[0] : undefined;
	}

	return node;
}

// In `if (condition && map.has(key))` the guard is the last `&&` operand, an earlier `has` guards nothing in the body. With `||` a truthy `map.has(key)` is not what admits the body, `condition` alone can, so that is not a guard.
function getGuardTest({test}) {
	while (test.type === 'LogicalExpression' && test.operator === '&&') {
		test = test.right;
	}

	return test;
}

function getBranchNodes(node) {
	if (node.type === 'ConditionalExpression') {
		return [
			node.consequent,
			node.alternate,
		];
	}

	// `map.has(a) && map.get(b)`, the guarded access is the other operand
	if (node.type === 'LogicalExpression') {
		return [node.right];
	}

	// `while (map.has(a)) { map.get(b) }`, the body is guarded by the test. A `do…while` body runs before the first test, so it is not guarded by it.
	if (node.type === 'WhileStatement') {
		return [
			getSingleStatement(node.body),
		];
	}

	return [
		getSingleStatement(node.consequent),
		node.alternate?.type === 'IfStatement' ? undefined : getSingleStatement(node.alternate),
	].filter(Boolean);
}

function getMapAccessProblem(node, mapHasCall, context, reportedAccessKeys) {
	if (!isMapAccessCall(node)) {
		return;
	}

	node = unwrapExpression(node);

	if (node.arguments.some(argument => argument.type === 'SpreadElement')) {
		return;
	}

	const mapHasObject = unwrapExpression(mapHasCall).callee.object;
	const mapAccessObject = node.callee.object;

	if (!isSameMapReceiver(mapHasObject, mapAccessObject, context)) {
		return;
	}

	const [hasKey] = mapHasCall.arguments;
	const [accessKey] = node.arguments;

	if (reportedAccessKeys.has(accessKey) || !areDifferentKeys(hasKey, accessKey, context)) {
		return;
	}

	reportedAccessKeys.add(accessKey);

	return {
		node: accessKey,
		messageId: MESSAGE_ID,
	};
}

function isSameMapReceiver(mapHasObject, mapAccessObject, context) {
	return isSameReferenceBinding(mapHasObject, mapAccessObject, context);
}

function isSameReferenceBinding(left, right, context) {
	if (!isSame(left, right)) {
		return false;
	}

	const leftRoot = getRootIdentifier(left);
	const rightRoot = getRootIdentifier(right);

	if (
		!leftRoot
		|| !rightRoot
	) {
		return true;
	}

	return isSameBinding(leftRoot, rightRoot, context);
}

function isSameBinding(left, right, context) {
	if (
		left.type !== 'Identifier'
		|| right.type !== 'Identifier'
	) {
		return false;
	}

	const leftVariable = findVariable(context.sourceCode.getScope(left), left);
	const rightVariable = findVariable(context.sourceCode.getScope(right), right);

	return leftVariable || rightVariable ? leftVariable === rightVariable : left.name === right.name;
}

function isMapReceiverWrite(node, mapHasCall, context) {
	const mapHasObject = unwrapExpression(mapHasCall).callee.object;
	const mapHasRoot = getRootIdentifier(mapHasObject);

	// A `this.x` receiver has no root identifier, only the direct receiver comparison can match it
	const isRootRewrite = candidate => Boolean(mapHasRoot) && patternContainsSameBinding(candidate, mapHasRoot, context);

	if (node.type === 'VariableDeclaration') {
		return node.declarations.some(declaration => declaration.init && isRootRewrite(declaration.id));
	}

	if (node.type === 'AssignmentExpression') {
		const left = unwrapExpression(node.left);
		return isSameMapReceiver(mapHasObject, left, context) || isRootRewrite(left);
	}

	if (node.type === 'UpdateExpression') {
		const argument = unwrapExpression(node.argument);
		return isSameMapReceiver(mapHasObject, argument, context) || isRootRewrite(argument);
	}

	if (
		(node.type === 'ForInStatement' || node.type === 'ForOfStatement')
		&& node.left.type !== 'VariableDeclaration'
	) {
		const left = unwrapExpression(node.left);
		return isSameMapReceiver(mapHasObject, left, context) || isRootRewrite(left);
	}

	return false;
}

function isNestedMapHasGuard(node, mapHasCall, context) {
	if (
		node.type !== 'IfStatement'
		&& node.type !== 'ConditionalExpression'
	) {
		return false;
	}

	return hasSameMapHasCall(node.test, mapHasCall, context);
}

function hasSameMapHasCall(node, mapHasCall, context) {
	const {visitorKeys} = context.sourceCode;
	let isResult = false;

	function visit(node) {
		if (
			isResult
			|| !node
			|| skippedNodeTypes.has(node.type)
		) {
			return;
		}

		const nestedMapHasCall = getMapHasCall(node);

		if (
			nestedMapHasCall
			&& isSameMapReceiver(unwrapExpression(mapHasCall).callee.object, unwrapExpression(nestedMapHasCall).callee.object, context)
		) {
			isResult = true;
			return;
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const child = node[key];

			if (Array.isArray(child)) {
				for (const childNode of child) {
					visit(childNode);
				}

				continue;
			}

			visit(child);
		}
	}

	visit(node);

	return isResult;
}

function hasMapReceiverWrite(node, mapHasCall, context) {
	const {visitorKeys} = context.sourceCode;
	let isResult = false;

	function visit(node) {
		if (
			isResult
			|| !node
			|| skippedNodeTypes.has(node.type)
			|| isNestedMapHasGuard(node, mapHasCall, context)
		) {
			return;
		}

		if (isMapReceiverWrite(node, mapHasCall, context)) {
			isResult = true;
			return;
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const child = node[key];

			if (Array.isArray(child)) {
				for (const childNode of child) {
					visit(childNode);
				}

				continue;
			}

			visit(child);
		}
	}

	visit(node);

	return isResult;
}

function getMapAccessProblems(node, mapHasCall, context, reportedAccessKeys) {
	const problems = [];
	const {visitorKeys} = context.sourceCode;

	function visit(node) {
		if (
			!node
			|| skippedNodeTypes.has(node.type)
			|| isNestedMapHasGuard(node, mapHasCall, context)
			|| hasMapReceiverWrite(node, mapHasCall, context)
		) {
			return;
		}

		const problem = getMapAccessProblem(node, mapHasCall, context, reportedAccessKeys);

		if (problem) {
			problems.push(problem);
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const child = node[key];

			if (Array.isArray(child)) {
				for (const childNode of child) {
					visit(childNode);
				}

				continue;
			}

			visit(child);
		}
	}

	visit(node);

	return problems;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const reportedAccessKeys = new WeakSet();

	const branchTypes = ['ConditionalExpression', 'IfStatement', 'WhileStatement', 'LogicalExpression'];

	context.on(branchTypes, (/** @type {ESTree.ConditionalExpression | ESTree.IfStatement | ESTree.WhileStatement | ESTree.LogicalExpression} */ node) => {
		// `map.has(a) && map.get(b)` / `map.has(a) || map.get(b)`. The access has to come second, otherwise nothing is "checked before" it.
		const mapHasCall = node.type === 'LogicalExpression'
			? getMapHasCall(node.left)
			: getMapHasCall(getGuardTest(node));

		if (!mapHasCall) {
			return;
		}

		// Skip receivers that are provably not a `Map` (e.g. a custom `has`/`get` cache)
		if (isKnownNonMap(mapHasCall.callee.object, context)) {
			return;
		}

		const branchNodes = getBranchNodes(node);
		const problems = [];

		for (const branchNode of branchNodes) {
			problems.push(...getMapAccessProblems(branchNode, mapHasCall, context, reportedAccessKeys));
		}

		return problems;
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow checking a Map key before accessing a different key.',
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
