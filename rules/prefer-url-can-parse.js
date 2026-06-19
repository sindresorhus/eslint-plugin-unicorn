import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	isNewExpression,
	isCallExpression,
	isBooleanLiteral,
} from './ast/index.js';
import {
	hasCommentInRange,
	isGlobalIdentifier,
	isSameIdentifier,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-url-can-parse';
const messages = {
	[MESSAGE_ID]: 'Prefer `URL.canParse()` over constructing a `URL` in a try/catch for validation.',
};

const urlImportSources = new Set([
	'node:url',
	'url',
]);

const isTypeOnlyImport = definition =>
	definition.type === 'ImportBinding'
	&& (
		definition.parent.importKind === 'type'
		|| definition.node.importKind === 'type'
	);

const isAmbientDeclaration = definition =>
	definition.type === 'Variable'
	&& definition.parent?.declare === true;

const isErasedDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImport(definition)
	|| isAmbientDeclaration(definition);

const isGlobalOrErasedIdentifier = (node, context, name) => {
	if (
		node.type !== 'Identifier'
		|| node.name !== name
	) {
		return false;
	}

	if (isGlobalIdentifier(node, context)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.length > 0
		&& variable.defs.every(definition => isErasedDefinition(definition));
};

const isUrlImport = definition => {
	if (definition.type !== 'ImportBinding') {
		return false;
	}

	const {node, parent} = definition;
	return urlImportSources.has(parent.source.value)
		&& parent.importKind !== 'type'
		&& node.type === 'ImportSpecifier'
		&& node.importKind !== 'type'
		&& node.imported.type === 'Identifier'
		&& node.imported.name === 'URL';
};

const isUrlConstructor = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	if (isGlobalOrErasedIdentifier(node, context, 'URL')) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition => isUrlImport(definition)) ?? false;
};

const unwrapExpression = node => {
	node = unwrapTypeScriptExpression(node);
	return node.type === 'ChainExpression' ? node.expression : node;
};

const isGlobalSymbolCall = (node, context) => {
	node = unwrapExpression(node);

	return isCallExpression(node, {
		name: 'Symbol',
	})
	&& isGlobalOrErasedIdentifier(node.callee, context, 'Symbol');
};

const isGlobalSymbolMemberExpression = (node, context) => {
	node = unwrapExpression(node);

	if (node.type !== 'MemberExpression') {
		return false;
	}

	const object = unwrapExpression(node.object);
	return isGlobalOrErasedIdentifier(object, context, 'Symbol');
};

const isObviouslyUnsafeUrlArgument = (node, context) =>
	isGlobalSymbolCall(node, context)
	|| isGlobalSymbolMemberExpression(node, context);

const isUnsafeUrlArgumentNode = (node, context) =>
	isObviouslyUnsafeUrlArgument(node, context)
	|| node.type === 'ObjectExpression'
	|| node.type === 'ClassExpression'
	|| node.type === 'TaggedTemplateExpression'
	|| (node.type === 'TemplateLiteral' && node.expressions.length > 0);

const containsNodeMatching = (node, visitorKeys, predicate) => {
	if (predicate(node)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(node => node?.type && containsNodeMatching(node, visitorKeys, predicate))) {
				return true;
			}
		} else if (value?.type && containsNodeMatching(value, visitorKeys, predicate)) {
			return true;
		}
	}

	return false;
};

const hasUnsafeUrlArgument = (newUrlExpression, context) =>
	newUrlExpression.arguments.some(argument =>
		containsNodeMatching(argument, context.sourceCode.visitorKeys, node => isUnsafeUrlArgumentNode(node, context))
		|| hasSideEffect(argument, context.sourceCode, {considerImplicitTypeConversion: true}),
	);

const getNewUrlExpression = statement => {
	if (
		statement?.type !== 'ExpressionStatement'
		|| !isNewExpression(statement.expression, {
			minimumArguments: 1,
			maximumArguments: 2,
		})
	) {
		return;
	}

	return statement.expression;
};

const getBooleanReturnValue = statement => {
	if (
		statement?.type !== 'ReturnStatement'
		|| !isBooleanLiteral(statement.argument)
	) {
		return;
	}

	return statement.argument.value;
};

const getBooleanAssignment = statement => {
	if (
		statement?.type !== 'ExpressionStatement'
		|| statement.expression.type !== 'AssignmentExpression'
		|| statement.expression.operator !== '='
		|| statement.expression.left.type !== 'Identifier'
		|| !isBooleanLiteral(statement.expression.right)
	) {
		return;
	}

	return statement.expression;
};

const isSameAssignmentTarget = (tryAssignment, catchAssignment, context) => {
	if (!isSameIdentifier(tryAssignment.left, catchAssignment.left)) {
		return false;
	}

	const tryVariable = findVariable(context.sourceCode.getScope(tryAssignment.left), tryAssignment.left);
	const catchVariable = findVariable(context.sourceCode.getScope(catchAssignment.left), catchAssignment.left);
	return tryVariable ? tryVariable === catchVariable : !catchVariable;
};

const getUrlCanParseText = (newUrlExpression, negate, context) => {
	const {sourceCode} = context;
	const argumentsText = newUrlExpression.arguments.map(node => sourceCode.getText(node)).join(', ');
	const text = `${sourceCode.getText(newUrlExpression.callee)}.canParse(${argumentsText})`;
	return negate ? `!${text}` : text;
};

const createReturnProblem = (tryStatement, newUrlExpression, context) => {
	const [, returnStatement] = tryStatement.block.body;
	const [catchStatement] = tryStatement.handler.body.body;
	const tryValue = getBooleanReturnValue(returnStatement);
	const catchValue = getBooleanReturnValue(catchStatement);

	if (
		typeof tryValue !== 'boolean'
		|| typeof catchValue !== 'boolean'
		|| tryValue === catchValue
	) {
		return;
	}

	const tryStatementRange = context.sourceCode.getRange(tryStatement);
	if (hasCommentInRange(context, tryStatementRange)) {
		return;
	}

	const replacement = `return ${getUrlCanParseText(newUrlExpression, !tryValue, context)};`;
	return {
		node: tryStatement,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceText(tryStatement, replacement),
	};
};

const createAssignmentProblem = (tryStatement, newUrlExpression, context) => {
	const [, tryAssignmentStatement] = tryStatement.block.body;
	const [catchAssignmentStatement] = tryStatement.handler.body.body;
	const tryAssignment = getBooleanAssignment(tryAssignmentStatement);
	const catchAssignment = getBooleanAssignment(catchAssignmentStatement);

	if (
		!tryAssignment
		|| !catchAssignment
		|| !isSameAssignmentTarget(tryAssignment, catchAssignment, context)
		|| tryAssignment.right.value === catchAssignment.right.value
	) {
		return;
	}

	const canParseText = getUrlCanParseText(newUrlExpression, !tryAssignment.right.value, context);
	const replacementRange = context.sourceCode.getRange(tryStatement);

	if (hasCommentInRange(context, replacementRange)) {
		return;
	}

	const replacement = `${tryAssignment.left.name} = ${canParseText};`;

	return {
		node: tryStatement,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(replacementRange, replacement),
	};
};

const createProblem = (tryStatement, context) => {
	if (
		!tryStatement.handler
		|| (tryStatement.handler.param && tryStatement.handler.param.type !== 'Identifier')
		|| tryStatement.finalizer
		|| tryStatement.block.body.length !== 2
		|| tryStatement.handler.body.body.length !== 1
	) {
		return;
	}

	const [newUrlStatement] = tryStatement.block.body;
	const newUrlExpression = getNewUrlExpression(newUrlStatement);
	if (
		!newUrlExpression
		|| !isUrlConstructor(newUrlExpression.callee, context)
		|| hasUnsafeUrlArgument(newUrlExpression, context)
	) {
		return;
	}

	return createReturnProblem(tryStatement, newUrlExpression, context)
		?? createAssignmentProblem(tryStatement, newUrlExpression, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('TryStatement', tryStatement => createProblem(tryStatement, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `URL.canParse()` over constructing a `URL` in a try/catch for validation.',
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
