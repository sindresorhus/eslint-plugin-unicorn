import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	isEmptyArrayExpression,
	isEmptyObjectExpression,
	isFunction,
	isLoop,
	isMethodCall,
} from '../ast/index.js';
import isGlobalIdentifier from './is-global-identifier.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
@import * as ESLint from 'eslint';
@import * as ESTree from 'estree';
*/

export const isProcessExitCall = (node, context) =>
	isMethodCall(node, {
		object: 'process',
		method: 'exit',
		optionalCall: false,
		optionalMember: false,
	})
	&& isGlobalIdentifier(node.callee.object, context);

const isTransparentTypeScriptExpressionWrapper = node => isTypeScriptExpressionWrapper(node) || node?.type === 'TSInstantiationExpression';
const isReturnOrThrowStatement = node => node.type === 'ReturnStatement' || node.type === 'ThrowStatement';
const isThrowStatement = node => node.type === 'ThrowStatement';
const isNeverExiting = () => false;

const isProcessExitStatement = (node, context) =>
	node.type === 'ExpressionStatement'
	&& isProcessExitExpression(node.expression, context);

const isDefinitelyNotThrowing = (node, context) =>
	getStaticValue(node, context.sourceCode.getScope(node)) !== null;

const isProcessExitVariableDeclaration = (node, context) =>
	node.declarations.some(declaration => declaration.init && isProcessExitExpression(declaration.init, context));

const isProcessExitVariableDeclarationAtStart = (node, context) => {
	for (const declaration of node.declarations) {
		if (!declaration.init) {
			continue;
		}

		if (isProcessExitExpressionAtStart(declaration.init, context)) {
			return true;
		}

		if (!isDefinitelyNotThrowing(declaration.init, context)) {
			return false;
		}
	}

	return false;
};

export function hasOptionalChainInCurrentChain(node) {
	if (node?.type === 'MemberExpression') {
		return node.optional || hasOptionalChainInCurrentChain(node.object);
	}

	return node?.type === 'CallExpression'
		&& (node.optional || hasOptionalChainInCurrentChain(node.callee));
}

export function isProcessExitCallAlwaysEvaluated(node, context) {
	if (!isProcessExitCall(node, context)) {
		return false;
	}

	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return true;
		}

		if (
			parent.type === 'CallExpression'
			&& parent.arguments.includes(child)
			&& (parent.optional || hasOptionalChainInCurrentChain(parent.callee))
		) {
			return false;
		}

		if (
			parent.type === 'MemberExpression'
			&& parent.computed
			&& parent.property === child
			&& (parent.optional || hasOptionalChainInCurrentChain(parent.object))
		) {
			return false;
		}

		child = parent;
		({parent} = parent);
	}

	return true;
}

function isProcessExitCallOrNewExpression(node, context) {
	if (isProcessExitExpression(node.callee, context)) {
		return true;
	}

	if (node.type === 'CallExpression' && (node.optional || hasOptionalChainInCurrentChain(node.callee))) {
		return false;
	}

	return node.arguments.some(argument => isProcessExitExpression(argument, context));
}

const isProcessExitMemberExpression = (node, context) =>
	isProcessExitExpression(node.object, context)
	|| (
		node.computed
		&& !node.optional
		&& !hasOptionalChainInCurrentChain(node.object)
		&& isProcessExitExpression(node.property, context)
	);

const isProcessExitConditionalExpression = (node, context) =>
	isProcessExitExpression(node.test, context)
	|| (
		isProcessExitExpression(node.consequent, context)
		&& isProcessExitExpression(node.alternate, context)
	);

function isProcessExitExpression(node, context) {
	if (isProcessExitCall(node, context)) {
		return true;
	}

	if (isTransparentTypeScriptExpressionWrapper(node)) {
		return isProcessExitExpression(node.expression, context);
	}

	switch (node?.type) {
		case 'ChainExpression': {
			return isProcessExitExpression(node.expression, context);
		}

		case 'CallExpression':
		case 'NewExpression': {
			return isProcessExitCallOrNewExpression(node, context);
		}

		case 'MemberExpression': {
			return isProcessExitMemberExpression(node, context);
		}

		case 'UnaryExpression':
		case 'AwaitExpression': {
			return isProcessExitExpression(node.argument, context);
		}

		case 'SequenceExpression': {
			return node.expressions.some(expression => isProcessExitExpression(expression, context));
		}

		case 'ConditionalExpression': {
			return isProcessExitConditionalExpression(node, context);
		}

		case 'LogicalExpression': {
			return isProcessExitExpression(node.left, context);
		}

		default: {
			return false;
		}
	}
}

function hasLabeledBreakBeforeProcessExit(node, context, labelName) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (node.type === 'BreakStatement') {
		return node.label?.name === labelName;
	}

	if (node.type === 'LabeledStatement' && node.label.name === labelName) {
		return false;
	}

	if (isProcessExitExpression(node.expression, context)) {
		return false;
	}

	if (node.type === 'BlockStatement') {
		for (const statement of node.body) {
			if (hasLabeledBreakBeforeProcessExit(statement, context, labelName)) {
				return true;
			}

			if (isProcessExitBranch(statement, context)) {
				return false;
			}
		}

		return false;
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasLabeledBreakBeforeProcessExit(child, context, labelName))) {
			return true;
		}
	}

	return false;
}

const isProcessExitMemberExpressionAtStart = (node, context) =>
	isProcessExitExpressionAtStart(node.object, context)
	|| (
		node.computed
		&& !node.optional
		&& !hasOptionalChainInCurrentChain(node.object)
		&& (isEmptyArrayExpression(node.object) || isEmptyObjectExpression(node.object))
		&& isProcessExitExpressionAtStart(node.property, context)
	);

function isProcessExitExpressionAtStart(node, context) {
	if (isProcessExitCall(node, context)) {
		return true;
	}

	if (isTransparentTypeScriptExpressionWrapper(node)) {
		return isProcessExitExpressionAtStart(node.expression, context);
	}

	switch (node?.type) {
		case 'ChainExpression': {
			return isProcessExitExpressionAtStart(node.expression, context);
		}

		case 'CallExpression':
		case 'NewExpression': {
			return isProcessExitExpressionAtStart(node.callee, context);
		}

		case 'MemberExpression': {
			return isProcessExitMemberExpressionAtStart(node, context);
		}

		case 'UnaryExpression':
		case 'AwaitExpression': {
			return isProcessExitExpressionAtStart(node.argument, context);
		}

		case 'SequenceExpression': {
			return isProcessExitExpressionAtStart(node.expressions[0], context);
		}

		case 'LogicalExpression': {
			return isProcessExitExpressionAtStart(node.left, context);
		}

		case 'ConditionalExpression': {
			return isProcessExitExpressionAtStart(node.test, context);
		}

		default: {
			return false;
		}
	}
}

function isProcessExitTryStatement(branch, context, checkTryStatements) {
	if (branch.finalizer && isProcessExitBranch(branch.finalizer, context)) {
		return true;
	}

	const firstTryStatement = branch.block.body[0];
	const tryBlockAlwaysExits = branch.handler
		? Boolean(firstTryStatement && isProcessExitBranchAtStart(firstTryStatement, context, checkTryStatements))
		: isProcessExitBranch(branch.block, context, checkTryStatements);

	if (!checkTryStatements) {
		return (
			!branch.finalizer
			|| branch.block.body.length > 1
		)
		&& tryBlockAlwaysExits;
	}

	if (tryBlockAlwaysExits) {
		return true;
	}

	return Boolean(
		branch.handler
		&& isBranchExit(branch.block, context, isThrowStatement)
		&& isProcessExitBranch(branch.handler, context),
	);
}

function isProcessExitBlock(branch, context, checkTryStatements) {
	for (const statement of branch.body) {
		if (isProcessExitBranch(statement, context, checkTryStatements)) {
			return true;
		}

		if (
			isReturnOrThrowStatement(statement)
			|| isBranchExit(statement, context, isReturnOrThrowStatement)
		) {
			return false;
		}
	}

	return false;
}

export function isProcessExitBranchAtStart(branch, context, checkTryStatements = true) {
	if (branch.type === 'ExpressionStatement') {
		return isProcessExitExpressionAtStart(branch.expression, context);
	}

	if (branch.type === 'VariableDeclaration') {
		return isProcessExitVariableDeclarationAtStart(branch, context);
	}

	return isProcessExitBranch(branch, context, checkTryStatements);
}

export function isProcessExitBranch(branch, context, checkTryStatements = true) {
	if (isProcessExitStatement(branch, context) || isProcessExitExpression(branch, context)) {
		return true;
	}

	if (branch.type === 'BlockStatement') {
		return isProcessExitBlock(branch, context, checkTryStatements);
	}

	if (branch.type === 'CatchClause') {
		return isProcessExitBranch(branch.body, context, checkTryStatements);
	}

	if (branch.type === 'VariableDeclaration') {
		return isProcessExitVariableDeclaration(branch, context);
	}

	if (branch.type === 'LabeledStatement') {
		return !hasLabeledBreakBeforeProcessExit(branch.body, context, branch.label.name)
			&& isProcessExitBranch(branch.body, context, checkTryStatements);
	}

	if (branch.type === 'TryStatement') {
		return isProcessExitTryStatement(branch, context, checkTryStatements);
	}

	if (branch.type === 'SwitchStatement') {
		return isSwitchBranchExit(branch, context, isNeverExiting, checkTryStatements);
	}

	if (branch.type === 'IfStatement' && isProcessExitExpression(branch.test, context)) {
		return true;
	}

	return (
		(branch.type === 'IfStatement' || branch.type === 'ConditionalExpression')
		&& branch.alternate
		&& isProcessExitBranch(branch.consequent, context, checkTryStatements)
		&& isProcessExitBranch(branch.alternate, context, checkTryStatements)
	);
}

function hasSwitchControlFlowExitInStatements(statements, context) {
	for (const statement of statements) {
		if (hasSwitchControlFlowExit(statement, context)) {
			return true;
		}

		if (
			isReturnOrThrowStatement(statement)
			|| isBranchExit(statement, context, isReturnOrThrowStatement)
			|| isProcessExitBranch(statement, context)
		) {
			return false;
		}
	}

	return false;
}

function hasSwitchControlFlowExit(node, context) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (node.type === 'BreakStatement' || node.type === 'ContinueStatement') {
		return true;
	}

	if (node.type === 'BlockStatement') {
		return hasSwitchControlFlowExitInStatements(node.body, context);
	}

	if (isLoop(node) || node.type === 'SwitchStatement') {
		return false;
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasSwitchControlFlowExit(child, context))) {
			return true;
		}
	}

	return false;
}

function isSwitchBranchExit(branch, context, branchAlwaysExits, checkTryStatements) {
	if (branch.cases.every(switchCase => switchCase.test !== null)) {
		return false;
	}

	let exits = false;
	for (let index = branch.cases.length - 1; index >= 0; index--) {
		const switchCase = branch.cases[index];
		if (hasSwitchControlFlowExitInStatements(switchCase.consequent, context)) {
			return false;
		}

		const caseExits = switchCase.consequent.some(statement =>
			isBranchExit(statement, context, branchAlwaysExits)
			|| isProcessExitBranch(statement, context, checkTryStatements),
		);
		if (!caseExits) {
			if (!exits) {
				return false;
			}

			continue;
		}

		exits = true;
	}

	return exits;
}

/**
@param {ESTree.Node} branch
@param {ESLint.Rule.RuleContext} context
@param {(branch: ESTree.Node) => boolean} branchAlwaysExits
@returns {boolean}
*/
export default function isBranchExit(branch, context, branchAlwaysExits) {
	if (
		branchAlwaysExits(branch)
		|| isProcessExitBranch(branch, context, false)
	) {
		return true;
	}

	if (branch.type === 'BlockStatement') {
		const lastStatement = branch.body.at(-1);
		return Boolean(lastStatement && isBranchExit(lastStatement, context, branchAlwaysExits));
	}

	if (branch.type === 'CatchClause') {
		return isBranchExit(branch.body, context, branchAlwaysExits);
	}

	if (branch.type === 'TryStatement') {
		return Boolean(
			(branch.finalizer && isBranchExit(branch.finalizer, context, branchAlwaysExits))
			|| (
				branch.handler
				&& isBranchExit(branch.block, context, branchAlwaysExits)
				&& isBranchExit(branch.handler, context, branchAlwaysExits)
			),
		);
	}

	if (branch.type === 'SwitchStatement') {
		return isSwitchBranchExit(branch, context, branchAlwaysExits, false);
	}

	return (
		(branch.type === 'IfStatement' || branch.type === 'ConditionalExpression')
		&& branch.alternate
		&& isBranchExit(branch.consequent, context, branchAlwaysExits)
		&& isBranchExit(branch.alternate, context, branchAlwaysExits)
	);
}
