import {getPropertyName, getStaticValue} from '@eslint-community/eslint-utils';
import {isMethodCall, isNewExpression} from './ast/index.js';

const MESSAGE_ID = 'require-proxy-trap-boolean-return';
const messages = {
	[MESSAGE_ID]: 'Proxy trap `{{name}}` should return a boolean.',
};

const booleanProxyTraps = new Set([
	'defineProperty',
	'deleteProperty',
	'has',
	'isExtensible',
	'preventExtensions',
	'set',
	'setPrototypeOf',
]);

const functionTypes = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

const breakStatementBoundaryTypes = new Set([
	...functionTypes,
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'SwitchStatement',
	'WhileStatement',
]);

function * getReturnStatements(node) {
	if (!node || typeof node.type !== 'string') {
		return;
	}

	if (node.type === 'ReturnStatement') {
		yield node;
		return;
	}

	if (node.type !== 'BlockStatement' && functionTypes.has(node.type)) {
		return;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			for (const child of value) {
				yield * getReturnStatements(child);
			}

			continue;
		}

		yield * getReturnStatements(value);
	}
}

const isProxyConstructorCall = node => isNewExpression(node, {
	name: 'Proxy',
	argumentsLength: 2,
});

const isProxyRevocableCall = node => isMethodCall(node, {
	object: 'Proxy',
	method: 'revocable',
	argumentsLength: 2,
	optionalCall: false,
	optionalMember: false,
	computed: false,
});

const isProxyCall = node => isProxyConstructorCall(node) || isProxyRevocableCall(node);

const getStaticBooleanValue = (node, sourceCode) => {
	const staticValue = getStaticValue(node, sourceCode.getScope(node));
	if (staticValue === null || typeof staticValue.value === 'boolean') {
		return;
	}

	return Boolean(staticValue.value);
};

const getBooleanReplacement = (node, booleanValue, sourceCode) => {
	if (sourceCode.getCommentsInside(node).length > 0) {
		return;
	}

	if (
		(
			node.type === 'Literal'
			&& !node.regex
		)
		|| (
			node.type === 'TemplateLiteral'
			&& node.expressions.length === 0
		)
		|| (
			node.type === 'Identifier'
			&& node.name === 'undefined'
		)
	) {
		return String(booleanValue);
	}
};

const knownNonBooleanExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'NewExpression',
	'ObjectExpression',
	'TemplateLiteral',
	'UpdateExpression',
]);

const nonBooleanBinaryOperators = new Set([
	'%',
	'&',
	'*',
	'**',
	'+',
	'-',
	'/',
	'<<',
	'>>',
	'>>>',
	'^',
	'|',
]);

const isKnownNonBooleanExpression = node => knownNonBooleanExpressionTypes.has(node.type)
	|| (
		node.type === 'UnaryExpression'
		&& node.operator !== '!'
		&& node.operator !== 'delete'
	)
	|| (
		node.type === 'BinaryExpression'
		&& nonBooleanBinaryOperators.has(node.operator)
	);

const createProblem = (node, name) => ({
	node,
	messageId: MESSAGE_ID,
	data: {name},
});

const withoutFix = problem => {
	if (problem) {
		return createProblem(problem.node, problem.data.name);
	}
};

const getProblem = (node, name, sourceCode) => {
	if (node.type === 'AssignmentExpression') {
		if (node.operator === '=') {
			return withoutFix(getProblem(node.right, name, sourceCode));
		}

		return createProblem(node, name);
	}

	if (node.type === 'ConditionalExpression') {
		return getProblem(node.consequent, name, sourceCode) ?? getProblem(node.alternate, name, sourceCode);
	}

	if (node.type === 'LogicalExpression') {
		return withoutFix(getProblem(node.left, name, sourceCode) ?? getProblem(node.right, name, sourceCode));
	}

	if (node.type === 'SequenceExpression') {
		return withoutFix(getProblem(node.expressions.at(-1), name, sourceCode));
	}

	const booleanValue = getStaticBooleanValue(node, sourceCode);
	if (
		booleanValue === undefined
		&& !isKnownNonBooleanExpression(node)
	) {
		return;
	}

	const replacement = getBooleanReplacement(node, booleanValue, sourceCode);

	return {
		...createProblem(node, name),
		...(replacement && {
			fix: fixer => fixer.replaceText(node, replacement),
		}),
	};
};

const getTrapFunction = (property, sourceCode) => {
	if (
		property.type !== 'Property'
		|| property.kind !== 'init'
	) {
		return;
	}

	const name = getPropertyName(property, sourceCode.getScope(property));
	if (!booleanProxyTraps.has(name) || !functionTypes.has(property.value.type)) {
		return;
	}

	return {
		name,
		functionNode: property.value,
	};
};

function doesStatementAlwaysExit(node) {
	switch (node.type) {
		case 'ReturnStatement':
		case 'ThrowStatement': {
			return true;
		}

		case 'BlockStatement': {
			return doesBlockAlwaysExit(node);
		}

		case 'IfStatement': {
			return Boolean(
				node.alternate
				&& doesStatementAlwaysExit(node.consequent)
				&& doesStatementAlwaysExit(node.alternate),
			);
		}

		case 'LabeledStatement': {
			return doesStatementAlwaysExit(node.body);
		}

		case 'SwitchStatement': {
			return doesSwitchStatementAlwaysExit(node);
		}

		case 'TryStatement': {
			return doesTryStatementAlwaysExit(node);
		}

		default: {
			return false;
		}
	}
}

function doesSwitchCaseAlwaysExit(node, index) {
	for (const switchCase of node.cases.slice(index)) {
		for (const statement of switchCase.consequent) {
			if (hasBreakStatement(statement)) {
				return false;
			}

			if (doesStatementAlwaysExit(statement)) {
				return true;
			}
		}
	}

	return false;
}

function hasBreakStatement(node) {
	if (!node || typeof node.type !== 'string') {
		return false;
	}

	if (node.type === 'BreakStatement') {
		return true;
	}

	if (breakStatementBoundaryTypes.has(node.type)) {
		return false;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			if (value.some(child => hasBreakStatement(child))) {
				return true;
			}

			continue;
		}

		if (hasBreakStatement(value)) {
			return true;
		}
	}

	return false;
}

function doesSwitchStatementAlwaysExit(node) {
	if (!node.cases.some(switchCase => switchCase.test === null)) {
		return false;
	}

	return node.cases.every((_, index) => doesSwitchCaseAlwaysExit(node, index));
}

function doesTryStatementAlwaysExit(node) {
	if (node.finalizer && doesBlockAlwaysExit(node.finalizer)) {
		return true;
	}

	return doesBlockAlwaysExit(node.block)
		&& (
			!node.handler
			|| doesBlockAlwaysExit(node.handler.body)
		);
}

function doesBlockAlwaysExit(node) {
	return node.body.some(statement => statement.type !== 'FunctionDeclaration' && doesStatementAlwaysExit(statement));
}

const getTrapFunctionProblem = ({functionNode, name}, sourceCode) => {
	if (functionNode.async || functionNode.generator) {
		return createProblem(functionNode, name);
	}

	if (functionNode.body.type !== 'BlockStatement') {
		return getProblem(functionNode.body, name, sourceCode);
	}

	const returnStatements = [...getReturnStatements(functionNode.body)];
	const doesAlwaysExit = doesBlockAlwaysExit(functionNode.body);
	if (returnStatements.length === 0) {
		if (doesAlwaysExit) {
			return;
		}

		return createProblem(functionNode, name);
	}

	for (const returnStatement of returnStatements) {
		if (!returnStatement.argument) {
			return createProblem(returnStatement, name);
		}

		const problem = getProblem(returnStatement.argument, name, sourceCode);
		if (problem) {
			return problem;
		}
	}

	if (!doesAlwaysExit) {
		return createProblem(functionNode, name);
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	function * checkCallOrNewExpression(node) {
		if (!isProxyCall(node)) {
			return;
		}

		const handler = node.arguments[1];
		if (handler.type !== 'ObjectExpression') {
			return;
		}

		for (const property of handler.properties) {
			const trapFunction = getTrapFunction(property, sourceCode);
			if (!trapFunction) {
				continue;
			}

			const problem = getTrapFunctionProblem(trapFunction, sourceCode);
			if (problem) {
				yield problem;
			}
		}
	}

	context.on('CallExpression', checkCallOrNewExpression);
	context.on('NewExpression', checkCallOrNewExpression);
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require boolean-returning Proxy traps to return booleans.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
