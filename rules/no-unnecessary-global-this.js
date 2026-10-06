import reservedIdentifiers from 'reserved-identifiers';
import {findVariable} from '@eslint-community/eslint-utils';
import {
	getOutermostTypeScriptExpression,
	getStaticPropertyName,
	hasOptionalChainElement,
	isBooleanContext,
	isGlobalIdentifier,
	isIdentifierName,
	isLeftHandSide,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-global-this';
const messages = {
	[MESSAGE_ID]: 'Use `{{name}}` directly instead of `globalThis.{{name}}`.',
};

function isActiveGlobal(name, node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), name);

	return variable?.scope.type === 'global'
		&& variable.defs.length === 0;
}

const reserved = reservedIdentifiers();

function canUseBareIdentifier(name) {
	return isIdentifierName(name)
		&& (!reserved.has(name) || name === 'eval' || name === 'arguments');
}

function isCallExpressionCallee(node) {
	node = getOutermostTypeScriptExpression(node);

	return node.parent.type === 'CallExpression'
		&& node.parent.callee === node;
}

function isTaggedTemplateCallee(node) {
	node = getOutermostTypeScriptExpression(node);

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
	node = getOutermostTypeScriptExpression(node);

	return node.parent.type === 'LogicalExpression'
		|| isNullishComparison(node)
		|| isBooleanContext(node, context);
}

function isOptionalChainUsage(node) {
	if (hasOptionalChainElement(node)) {
		return true;
	}

	node = getOutermostTypeScriptExpression(node);

	return (
		node.parent.type === 'MemberExpression'
		|| node.parent.type === 'CallExpression'
	)
	&& node.parent.optional
	&& (node.parent.object === node || node.parent.callee === node);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('MemberExpression', node => {
		const object = unwrapTypeScriptExpression(node.object);
		const writableTarget = getOutermostTypeScriptExpression(node);

		if (
			object.type !== 'Identifier'
			|| object.name !== 'globalThis'
			|| !isGlobalIdentifier(object, context)
			|| isLeftHandSide(writableTarget)
			|| isOptionalChainUsage(node)
			|| isExistenceCheck(node, context)
		) {
			return;
		}

		const name = getStaticPropertyName(node, context);
		if (
			name === undefined
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
