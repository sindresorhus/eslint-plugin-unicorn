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

const getTrapFunctionProblem = ({functionNode, name}, sourceCode, functionBodyAlwaysExits) => {
	if (functionNode.async || functionNode.generator) {
		return createProblem(functionNode, name);
	}

	if (functionNode.body.type !== 'BlockStatement') {
		return getProblem(functionNode.body, name, sourceCode);
	}

	const returnStatements = [...getReturnStatements(functionNode.body)];
	const doesAlwaysExit = functionBodyAlwaysExits.get(functionNode) ?? false;
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

	// Track whether each function body always exits using code path analysis.
	const functionBodyAlwaysExits = new WeakMap();
	const segmentSetStack = [];
	const currentSegments = () => segmentSetStack.at(-1);

	context.on('onCodePathStart', () => {
		segmentSetStack.push(new Set());
	});
	context.on('onCodePathEnd', () => {
		segmentSetStack.pop();
	});
	context.on('onCodePathSegmentStart', segment => {
		currentSegments().add(segment);
	});
	context.on('onCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});
	context.on('onUnreachableCodePathSegmentStart', segment => {
		currentSegments().add(segment);
	});
	context.on('onUnreachableCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});

	// Snapshot reachability at function body exit, before code path segments end.
	context.onExit('BlockStatement', body => {
		if (!(functionTypes.has(body.parent?.type) && body.parent.body === body)) {
			return;
		}

		const allUnreachable = [...currentSegments()].every(segment => !segment.reachable);
		functionBodyAlwaysExits.set(body.parent, allUnreachable);
	});

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

			const problem = getTrapFunctionProblem(trapFunction, sourceCode, functionBodyAlwaysExits);
			if (problem) {
				yield problem;
			}
		}
	}

	// Use onExit so inner function code paths have been fully analyzed.
	context.onExit('CallExpression', checkCallOrNewExpression);
	context.onExit('NewExpression', checkCallOrNewExpression);
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
