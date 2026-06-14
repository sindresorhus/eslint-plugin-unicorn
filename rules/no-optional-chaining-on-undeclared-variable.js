import {
	isTypeImportSpecifier,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-optional-chaining-on-undeclared-variable';
const messages = {
	[MESSAGE_ID]: 'Optional chaining on undeclared variable `{{name}}` throws a ReferenceError.',
};

const isTypeOnlyImportDefinition = definition =>
	definition.type === 'ImportBinding'
	&& isTypeImportSpecifier(definition.node);

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImportDefinition(definition);

function unwrapExpression(node) {
	let previousNode;

	while (node !== previousNode) {
		previousNode = node;
		node = unwrapTypeScriptExpression(node);

		if (
			node.type === 'ChainExpression'
			|| node.type === 'TSInstantiationExpression'
		) {
			node = node.expression;
		}
	}

	return node;
}

function getLeftmostMemberBase(node) {
	node = unwrapExpression(node);

	while (node.type === 'MemberExpression') {
		node = unwrapExpression(node.object);
	}

	return node.type === 'Identifier' ? node : undefined;
}

function isUnresolvedRuntimeVariable(node, context) {
	let scope = context.sourceCode.getScope(node);
	while (scope) {
		const variable = scope.set.get(node.name);

		if (
			variable
			&& (
				variable.defs.length === 0
				|| variable.defs.some(definition => !isTypeOnlyDefinition(definition))
			)
		) {
			return false;
		}

		scope = scope.upper;
	}

	return true;
}

function getOptionalOperationBase(node) {
	node = unwrapExpression(node);

	if (node.type === 'MemberExpression') {
		return getOptionalOperationBase(node.object) ?? (node.optional ? node.object : undefined);
	}

	if (node.type === 'CallExpression') {
		return getOptionalOperationBase(node.callee) ?? (node.optional ? node.callee : undefined);
	}
}

function getUndeclaredOptionalChainBase(chainExpression, context) {
	const base = getOptionalOperationBase(chainExpression.expression);
	if (!base) {
		return;
	}

	const identifier = getLeftmostMemberBase(base);
	if (
		identifier
		&& isUnresolvedRuntimeVariable(identifier, context)
	) {
		return identifier;
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const reportedIdentifiers = new WeakSet();

	context.on('ChainExpression', node => {
		const identifier = getUndeclaredOptionalChainBase(node, context);
		if (
			!identifier
			|| reportedIdentifiers.has(identifier)
		) {
			return;
		}

		reportedIdentifiers.add(identifier);

		return {
			node: identifier,
			messageId: MESSAGE_ID,
			data: {name: identifier.name},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow optional chaining on undeclared variables.',
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
