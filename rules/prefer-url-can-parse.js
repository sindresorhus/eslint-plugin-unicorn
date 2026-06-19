import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	isNewExpression,
	isCallExpression,
	isBooleanLiteral,
	isMemberExpression,
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

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImport(definition);

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

	if (
		node.name === 'URL'
		&& isGlobalIdentifier(node, context)
	) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		node.name === 'URL'
		&& variable?.defs.length > 0
		&& variable.defs.every(definition => isTypeOnlyDefinition(definition))
	) {
		return true;
	}

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
	&& isGlobalIdentifier(node.callee, context);
};

const isGlobalSymbolMemberExpression = (node, context) => {
	node = unwrapExpression(node);

	if (node.type !== 'MemberExpression') {
		return false;
	}

	const object = unwrapExpression(node.object);
	return object.type === 'Identifier'
		&& object.name === 'Symbol'
		&& isGlobalIdentifier(object, context);
};

const isGlobalSymbolMemberCall = (node, context) => {
	node = unwrapExpression(node);

	return node.type === 'CallExpression'
		&& isGlobalSymbolMemberExpression(node.callee, context);
};

const isObviouslyUnsafeUrlArgument = (node, context) =>
	isGlobalSymbolCall(node, context)
	|| isGlobalSymbolMemberCall(node, context)
	|| isGlobalSymbolMemberExpression(node, context);

const hasObviouslyUnsafeUrlArgument = (newUrlExpression, context) =>
	newUrlExpression.arguments.some(argument =>
		isObviouslyUnsafeUrlArgument(argument, context)
		|| hasSideEffect(argument, context.sourceCode),
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

const getPreviousStatement = node => {
	const statements = node.parent.type === 'SwitchCase' ? node.parent.consequent : node.parent.body;
	if (!Array.isArray(statements)) {
		return;
	}

	const index = statements.indexOf(node);
	if (index > 0) {
		return statements[index - 1];
	}
};

const containsIdentifier = (node, name, visitorKeys) => {
	if (node.type === 'Identifier' && node.name === name) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(node => node?.type && containsIdentifier(node, name, visitorKeys))) {
				return true;
			}
		} else if (value?.type && containsIdentifier(value, name, visitorKeys)) {
			return true;
		}
	}

	return false;
};

const getPreviousLetDeclaration = (tryStatement, assignment, newUrlExpression, context) => {
	const previousStatement = getPreviousStatement(tryStatement);
	if (
		previousStatement?.type !== 'VariableDeclaration'
		|| previousStatement.kind !== 'let'
		|| previousStatement.declarations.length !== 1
	) {
		return;
	}

	const [declaration] = previousStatement.declarations;
	if (
		declaration.id.type !== 'Identifier'
		|| declaration.init
		|| !isSameIdentifier(declaration.id, assignment.left)
		|| newUrlExpression.arguments.some(argument => containsIdentifier(argument, assignment.left.name, context.sourceCode.visitorKeys))
	) {
		return;
	}

	return previousStatement;
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

const hasUnsafeComments = (context, range) =>
	hasCommentInRange(context, range);

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
	if (hasUnsafeComments(context, tryStatementRange)) {
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
	const previousLetDeclaration = getPreviousLetDeclaration(tryStatement, tryAssignment, newUrlExpression, context);
	const replacementNode = previousLetDeclaration ?? tryStatement;
	const replacementRange = [
		context.sourceCode.getRange(replacementNode)[0],
		context.sourceCode.getRange(tryStatement)[1],
	];

	if (hasUnsafeComments(context, replacementRange)) {
		return;
	}

	const replacement = previousLetDeclaration
		? `let ${tryAssignment.left.name} = ${canParseText};`
		: `${tryAssignment.left.name} = ${canParseText};`;

	return {
		node: tryStatement,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(replacementRange, replacement),
	};
};

const createProblem = (tryStatement, context) => {
	if (
		!tryStatement.handler
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
		|| hasObviouslyUnsafeUrlArgument(newUrlExpression, context)
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
