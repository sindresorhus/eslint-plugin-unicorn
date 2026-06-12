import {
	isIdentifierName,
	isKeyword,
	isReservedWord,
	isStrictReservedWord,
} from '@babel/helper-validator-identifier';
import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isStringLiteral} from './ast/index.js';
import {hasOptionalChainElement, isGlobalIdentifier, isLeftHandSide} from './utils/index.js';

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

const getEffectiveAssignmentTarget = node => {
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

function isShadowed(name, node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), name);

	return variable?.defs.length > 0;
}

function canUseBareIdentifier(name) {
	return isIdentifierName(name)
		&& !isKeyword(name)
		&& !isReservedWord(name, true)
		&& !isStrictReservedWord(name, true);
}

function isStaticPropertyAccess(node) {
	return !node.computed
		|| isStringLiteral(node.property)
		|| (
			node.property.type === 'TemplateLiteral'
			&& node.property.expressions.length === 0
		);
}

const isForLoopLeftHandSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const isRestElementArgument = node =>
	node.parent.type === 'RestElement'
	&& node.parent.argument === node;

const isWritableTarget = node =>
	isLeftHandSide(node)
	|| isForLoopLeftHandSide(node)
	|| isRestElementArgument(node);

function isOptionalCallCallee(node) {
	node = getEffectiveAssignmentTarget(node);

	return node.parent.type === 'CallExpression'
		&& node.parent.callee === node
		&& node.parent.optional;
}

function isCallExpressionCallee(node) {
	node = getEffectiveAssignmentTarget(node);

	return node.parent.type === 'CallExpression'
		&& node.parent.callee === node;
}

function isTaggedTemplateCallee(node) {
	node = getEffectiveAssignmentTarget(node);

	return node.parent.type === 'TaggedTemplateExpression'
		&& node.parent.tag === node;
}

function isOptionalChainUsage(node) {
	if (hasOptionalChainElement(node)) {
		return true;
	}

	node = getEffectiveAssignmentTarget(node);

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
		const assignmentTarget = getEffectiveAssignmentTarget(node);

		if (
			object.type !== 'Identifier'
			|| object.name !== 'globalThis'
			|| !isGlobalIdentifier(object, context)
			|| isWritableTarget(assignmentTarget)
			|| isOptionalChainUsage(node)
			|| isOptionalCallCallee(node)
			|| !isStaticPropertyAccess(node)
		) {
			return;
		}

		const name = getPropertyName(node, context.sourceCode.getScope(node));
		if (
			typeof name !== 'string'
			|| !canUseBareIdentifier(name)
			|| (name === 'eval' && isCallExpressionCallee(node))
			|| !isActiveGlobal(name, node, context)
			|| isShadowed(name, node, context)
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
			recommended: false,
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
