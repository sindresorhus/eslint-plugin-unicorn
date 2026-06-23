import {
	isIdentifierName,
	isKeyword,
	isReservedWord,
	isStrictReservedWord,
} from '@babel/helper-validator-identifier';
import {findVariable} from '@eslint-community/eslint-utils';
import {isStringLiteral} from './ast/index.js';
import {
	hasOptionalChainElement,
	isGlobalIdentifier,
	isLeftHandSide,
	isControlFlowTest,
	isBooleanExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-global-this';
const messages = {
	[MESSAGE_ID]: 'Use `{{name}}` directly instead of `globalThis.{{name}}`.',
};

const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

function unwrapTypeScriptExpression(node) {
	while (typeScriptExpressionWrapperTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
}

const getOuterTypeScriptExpression = node => {
	while (
		typeScriptExpressionWrapperTypes.has(node.parent.type)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
};

function isActiveGlobal(name, node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), name);

	return variable?.scope.type === 'global'
		&& variable.defs.length === 0;
}

function canUseBareIdentifier(name) {
	return isIdentifierName(name)
		&& !isKeyword(name)
		&& !isReservedWord(name, true)
		&& !isStrictReservedWord(name, true);
}

function getStaticPropertyName(node) {
	if (!node.computed) {
		return node.property.name;
	}

	if (isStringLiteral(node.property)) {
		return node.property.value;
	}

	if (
		node.property.type === 'TemplateLiteral'
		&& node.property.expressions.length === 0
	) {
		return node.property.quasis[0].value.cooked;
	}
}

const isForLoopLeftHandSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const isWritableTarget = node =>
	isLeftHandSide(node)
	|| isForLoopLeftHandSide(node);

function isCallExpressionCallee(node) {
	node = getOuterTypeScriptExpression(node);

	return node.parent.type === 'CallExpression'
		&& node.parent.callee === node;
}

function isTaggedTemplateCallee(node) {
	node = getOuterTypeScriptExpression(node);

	return node.parent.type === 'TaggedTemplateExpression'
		&& node.parent.tag === node;
}

const equalityOperators = new Set(['==', '!=', '===', '!==']);

// `globalThis.foo === undefined`, `globalThis.foo != null`, … compare the global against `null`/`undefined` to detect its presence.
function isNullishComparison(node) {
	const {parent} = node;
	if (
		parent.type !== 'BinaryExpression'
		|| !equalityOperators.has(parent.operator)
	) {
		return false;
	}

	const other = unwrapTypeScriptExpression(parent.left === node ? parent.right : parent.left);

	return (other.type === 'Literal' && other.value === null)
		|| (other.type === 'Identifier' && other.name === 'undefined');
}

// `globalThis.foo` in an existence check (`if (globalThis.foo)`, `globalThis.foo ?? x`, `!globalThis.foo`, `globalThis.foo === undefined`, …) safely yields `undefined` when the global is absent, whereas bare `foo` throws a `ReferenceError`. This is deliberate feature detection, so the `globalThis` receiver must be kept.
function isExistenceCheck(node, context) {
	node = getOuterTypeScriptExpression(node);

	return node.parent.type === 'LogicalExpression'
		|| isNullishComparison(node)
		|| isControlFlowTest(node)
		|| isBooleanExpression(node, context);
}

function isOptionalChainUsage(node) {
	if (hasOptionalChainElement(node)) {
		return true;
	}

	node = getOuterTypeScriptExpression(node);

	return (
		node.parent.type === 'MemberExpression'
		|| node.parent.type === 'CallExpression'
	)
	&& node.parent.optional
	&& (node.parent.object === node || node.parent.callee === node);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		const object = unwrapTypeScriptExpression(node.object);
		const writableTarget = getOuterTypeScriptExpression(node);

		if (
			object.type !== 'Identifier'
			|| object.name !== 'globalThis'
			|| !isGlobalIdentifier(object, context)
			|| isWritableTarget(writableTarget)
			|| isOptionalChainUsage(node)
			|| isExistenceCheck(node, context)
		) {
			return;
		}

		const name = getStaticPropertyName(node);
		if (
			typeof name !== 'string'
			|| !canUseBareIdentifier(name)
			|| (name === 'eval' && isCallExpressionCallee(node))
			|| !isActiveGlobal(name, node, context)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {name},
		};

		if (
			!isCallExpressionCallee(node)
			&& !isTaggedTemplateCallee(node)
			&& context.sourceCode.getCommentsInside(node).length === 0
		) {
			problem.fix = fixer => fixer.replaceText(node, name);
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `globalThis` references.',
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
