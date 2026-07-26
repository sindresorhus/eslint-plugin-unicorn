import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import {
	isEmptyArrayExpression,
	isEmptyObjectExpression,
	isFunction,
	isLoop,
} from '../ast/index.js';
import isGlobalIdentifier from './is-global-identifier.js';
import {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';

/**
@import * as ESLint from 'eslint';
@import * as ESTree from 'estree';
*/

const isTransparentTypeScriptExpressionWrapper = node => isTypeScriptExpressionWrapper(node) || node?.type === 'TSInstantiationExpression';
const unwrapTransparentTypeScriptExpression = node => {
	while (isTransparentTypeScriptExpressionWrapper(node)) {
		node = node.expression;
	}

	return node;
};

export const isProcessExitCall = (node, context) => {
	const callee = unwrapTransparentTypeScriptExpression(node?.callee);
	return node?.type === 'CallExpression'
		&& callee?.type === 'MemberExpression'
		&& !node.optional
		&& !callee.optional
		&& !callee.computed
		&& callee.object.type === 'Identifier'
		&& callee.object.name === 'process'
		&& callee.property.type === 'Identifier'
		&& callee.property.name === 'exit'
		&& isGlobalIdentifier(callee.object, context);
};

const isReturnOrThrowStatement = node => node.type === 'ReturnStatement' || node.type === 'ThrowStatement';
const isThrowStatement = node => node.type === 'ThrowStatement';
const isNeverExiting = () => false;

const isProcessExitStatement = (node, context) =>
	node.type === 'ExpressionStatement'
	&& isProcessExitExpression(node.expression, context);

const isDefinitelyNotThrowing = (node, context) =>
	node.type === 'SequenceExpression'
		? node.expressions.every(expression => isDefinitelyNotThrowingExpression(expression, context))
		: getStaticValue(node, context.sourceCode.getScope(node)) !== null;

const isTemporalDeadZoneDefinition = definition => (
	(definition.type === 'Variable' && definition.parent?.kind !== 'var')
	|| definition.type === 'ClassName'
	|| definition.type === 'ImportBinding'
);

const isDefinitelyNotInTemporalDeadZone = (node, context) => {
	const {sourceCode} = context;
	const variable = findVariable(sourceCode.getScope(node), node.name);
	const nodeStart = sourceCode.getRange(node)[0];
	return variable?.defs.some(definition =>
		isTemporalDeadZoneDefinition(definition)
		&& definition.name
		&& sourceCode.getRange(definition.name)[0] > nodeStart,
	) !== true;
};

const isDefinitelyDefinedReference = (node, context) => {
	const scope = context.sourceCode.getScope(node);
	return Boolean(findVariable(scope, node.name)) && isDefinitelyNotInTemporalDeadZone(node, context);
};

const isDefinitelyNotThrowingAssignmentIdentifier = (node, context) => {
	const scope = context.sourceCode.getScope(node);
	return !scope.isStrict || Boolean(findVariable(scope, node.name));
};

const isDefinitelyNotReadOnly = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), node.name);
	return variable?.defs.some(definition =>
		(definition.type === 'Variable' && definition.parent?.kind === 'const')
		|| definition.type === 'ClassName'
		|| definition.type === 'ImportBinding',
	) !== true;
};

const isDefinitelyNotNullish = (node, context) => {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	return staticValue !== null
		&& staticValue.value !== null
		&& staticValue.value !== undefined;
};

const isDefinitelyValidClassHeritage = (node, context) => {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	return staticValue !== null
		&& (staticValue.value === null || typeof staticValue.value === 'function');
};

const isDefinitelyNotThrowingMemberExpression = (node, context) =>
	node.type === 'MemberExpression'
	&& !node.optional
	&& !hasOptionalChainInCurrentChain(node.object)
	&& (
		isEmptyArrayExpression(node.object)
		|| isEmptyObjectExpression(node.object)
		|| isDefinitelyNotNullish(node.object, context)
	)
	&& (!node.computed || isDefinitelyNotThrowingExpression(node.property, context));

const isDefinitelyNotThrowingAssignmentTarget = (node, context) =>
	(
		node.type === 'Identifier'
		&& isDefinitelyNotInTemporalDeadZone(node, context)
		&& isDefinitelyNotReadOnly(node, context)
		&& isDefinitelyNotThrowingAssignmentIdentifier(node, context)
	)
	|| isDefinitelyNotThrowingMemberExpression(node, context);

const isDefinitelyNotThrowingAssignmentTargetRead = (node, context) =>
	(
		node.type === 'Identifier'
		&& isDefinitelyDefinedReference(node, context)
	)
	|| isDefinitelyNotThrowingMemberExpression(node, context);

const isDefinitelyNotThrowingAssignmentTargetBeforeRight = (node, context) =>
	(
		node.type === 'Identifier'
		|| node.type === 'ArrayPattern'
		|| node.type === 'ObjectPattern'
	)
	|| isDefinitelyNotThrowingMemberExpression(node, context);

const alwaysEvaluatedCompoundAssignmentOperators = new Set([
	'+=',
	'-=',
	'*=',
	'/=',
	'%=',
	'**=',
	'<<=',
	'>>=',
	'>>>=',
	'&=',
	'^=',
	'|=',
]);

const isAssignmentRightAlwaysEvaluated = (node, context) => {
	if (node.operator === '=') {
		return isDefinitelyNotThrowingAssignmentTargetBeforeRight(node.left, context);
	}

	if (alwaysEvaluatedCompoundAssignmentOperators.has(node.operator)) {
		return isDefinitelyNotThrowingAssignmentTargetRead(node.left, context);
	}

	if (!['&&=', '||=', '??='].includes(node.operator) || !isDefinitelyNotThrowingAssignmentTargetRead(node.left, context)) {
		return false;
	}

	const staticValue = getStaticValue(node.left, context.sourceCode.getScope(node.left));
	if (staticValue === null) {
		return false;
	}

	if (node.operator === '&&=') {
		return Boolean(staticValue.value);
	}

	if (node.operator === '||=') {
		return !staticValue.value;
	}

	return staticValue.value === null || staticValue.value === undefined;
};

export const isDefinitelyNotThrowingExpression = (node, context) =>
	node.type === 'AssignmentExpression'
		? node.operator === '='
		&& isDefinitelyNotThrowingAssignmentTarget(node.left, context)
		&& isDefinitelyNotThrowing(node.right, context)
		: isDefinitelyNotThrowing(node, context);

export const isDefinitelyNotThrowingReference = (node, context) => {
	node = unwrapTransparentTypeScriptExpression(node);
	if (node?.type === 'Identifier') {
		return isDefinitelyDefinedReference(node, context);
	}

	return isDefinitelyNotThrowingExpression(node, context);
};

const isUsingDeclaration = node => node.kind === 'using' || node.kind === 'await using';

const isDefinitelyNotThrowingStatement = (node, context) => {
	if (node.type === 'ExpressionStatement') {
		return isDefinitelyNotThrowingExpression(node.expression, context);
	}

	if (node.type === 'BlockStatement') {
		return node.body.every(statement => isDefinitelyNotThrowingStatement(statement, context));
	}

	return node.type === 'EmptyStatement'
		|| node.type === 'FunctionDeclaration'
		|| (
			node.type === 'VariableDeclaration'
			&& !isUsingDeclaration(node)
			&& node.declarations.every(declaration =>
				declaration.id.type === 'Identifier'
				&& (!declaration.init || isDefinitelyNotThrowingExpression(declaration.init, context)),
			)
		);
};

const isDefinitelyNotThrowingStatementWithOptions = (node, context, options) =>
	isDefinitelyNotThrowingStatement(node, context)
	|| Boolean(options?.isAdditionalStatementDefinitelyNotThrowing?.(node));

const isReturnWithoutValue = node => node.type === 'ReturnStatement' && !node.argument;

const isNonThrowingConditionalReturn = (node, context) => {
	if (
		node.type !== 'IfStatement'
		|| node.alternate
		|| !isDefinitelyNotThrowingExpression(node.test, context)
		|| !(
			isReturnWithoutValue(node.consequent)
			|| (
				node.consequent.type === 'BlockStatement'
				&& node.consequent.body.length === 1
				&& isReturnWithoutValue(node.consequent.body[0])
			)
		)
	) {
		return false;
	}

	const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
	return staticValue !== null && !staticValue.value;
};

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

		if (isUsingDeclaration(node)) {
			return false;
		}

		if (
			declaration.id.type !== 'Identifier'
			|| !isDefinitelyNotThrowingExpression(declaration.init, context)
		) {
			return false;
		}
	}

	return false;
};

const isProcessExitStatementListAtStart = (
	statements,
	context,
	checkTryStatements,
	options = {},
) => {
	const {isAdditionalStatementAlwaysExits = () => false} = options;

	for (const statement of statements) {
		if (isProcessExitBranchAtStart(statement, context, checkTryStatements, options)) {
			return true;
		}

		if (isAdditionalStatementAlwaysExits(statement)) {
			return true;
		}

		if (isNonThrowingConditionalReturn(statement, context)) {
			continue;
		}

		if (!isDefinitelyNotThrowingStatementWithOptions(statement, context, options)) {
			return false;
		}
	}

	return false;
};

export const isProcessExitBlockAtStart = (
	branch,
	context,
	checkTryStatements = true,
	options,
) => !hasPossiblyThrowingClassHeritage(branch, context)
	&& isProcessExitStatementListAtStart(
		branch.body,
		context,
		checkTryStatements,
		options,
	);

export function hasOptionalChainInCurrentChain(node) {
	if (node?.type === 'MemberExpression') {
		return node.optional || hasOptionalChainInCurrentChain(node.object);
	}

	return node?.type === 'CallExpression'
		&& (node.optional || hasOptionalChainInCurrentChain(node.callee));
}

export function isProcessExitCallAlwaysEvaluated(node, context) {
	if (!isProcessExitCallAtStart(node, context)) {
		return false;
	}

	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return true;
		}

		if (
			(parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression')
			&& parent.superClass
			&& parent.superClass !== child
			&& !isProcessExitExpressionAtStart(parent.superClass, context)
			&& !isDefinitelyValidClassHeritage(parent.superClass, context)
		) {
			return false;
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

	if (!isDefinitelyNotThrowingReference(node.callee, context)) {
		return false;
	}

	return node.arguments.some(argument => isProcessExitExpression(argument, context));
}

function isProcessExitCallOrNewExpressionAtStart(node, context) {
	if (isProcessExitExpressionAtStart(node.callee, context)) {
		return true;
	}

	if (node.type === 'CallExpression' && (node.optional || hasOptionalChainInCurrentChain(node.callee))) {
		return false;
	}

	if (!isDefinitelyNotThrowingReference(node.callee, context)) {
		return false;
	}

	return isProcessExitExpressionListAtStart(node.arguments, context);
}

const isProcessExitMemberExpression = (node, context) =>
	isProcessExitExpression(node.object, context)
	|| (
		node.computed
		&& !node.optional
		&& !hasOptionalChainInCurrentChain(node.object)
		&& isDefinitelyNotThrowingReference(node.object, context)
		&& isProcessExitExpression(node.property, context)
	);

const isProcessExitConditionalExpression = (node, context) => {
	if (isProcessExitExpression(node.test, context)) {
		return true;
	}

	const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
	if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
		return isProcessExitExpression(staticValue.value ? node.consequent : node.alternate, context);
	}

	return isProcessExitExpression(node.consequent, context)
		&& isProcessExitExpression(node.alternate, context);
};

const isLogicalExpressionRightEvaluated = (node, context) => {
	const staticValue = getStaticValue(node.left, context.sourceCode.getScope(node.left));
	if (staticValue === null || !isDefinitelyNotThrowingExpression(node.left, context)) {
		return false;
	}

	let shouldEvaluateRight;
	switch (node.operator) {
		case '&&': {
			shouldEvaluateRight = Boolean(staticValue.value);
			break;
		}

		case '||': {
			shouldEvaluateRight = !staticValue.value;
			break;
		}

		default: {
			shouldEvaluateRight = staticValue.value === null || staticValue.value === undefined;
		}
	}

	return shouldEvaluateRight;
};

const isProcessExitLogicalExpression = (node, context) =>
	isProcessExitExpression(node.left, context)
	|| (
		isLogicalExpressionRightEvaluated(node, context)
		&& isProcessExitExpression(node.right, context)
	);

const isProcessExitObjectProperty = (node, context) =>
	node.type === 'SpreadElement'
		? isProcessExitExpression(node.argument, context)
		: (node.computed && isProcessExitExpression(node.key, context))
			|| isProcessExitExpression(node.value, context);

const isProcessExitObjectExpression = (node, context) =>
	node.properties.some(property => isProcessExitObjectProperty(property, context));

const isProcessExitArrayExpression = (node, context) =>
	node.elements.some(element => element && isProcessExitExpression(element, context));

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

		case 'SpreadElement': {
			return isProcessExitExpression(node.argument, context);
		}

		case 'CallExpression':
		case 'NewExpression': {
			return isProcessExitCallOrNewExpression(node, context);
		}

		case 'MemberExpression': {
			return isProcessExitMemberExpression(node, context);
		}

		case 'ArrayExpression': {
			return isProcessExitArrayExpression(node, context);
		}

		case 'ObjectExpression': {
			return isProcessExitObjectExpression(node, context);
		}

		case 'YieldExpression': {
			return Boolean(node.argument && isProcessExitExpression(node.argument, context));
		}

		case 'AssignmentExpression': {
			return isProcessExitExpression(node.left, context)
				|| (
					isAssignmentRightAlwaysEvaluated(node, context)
					&& isProcessExitExpression(node.right, context)
				);
		}

		case 'ImportExpression': {
			return isProcessExitExpression(node.source, context);
		}

		case 'TemplateLiteral': {
			return node.expressions.some(expression => isProcessExitExpression(expression, context));
		}

		case 'TaggedTemplateExpression': {
			return isProcessExitExpression(node.tag, context)
				|| (
					isDefinitelyNotThrowingReference(node.tag, context)
					&& node.quasi.expressions.some(expression => isProcessExitExpression(expression, context))
				);
		}

		case 'ClassExpression': {
			return isProcessExitClass(node, context, true);
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
			return isProcessExitLogicalExpression(node, context);
		}

		case 'BinaryExpression': {
			return isProcessExitExpression(node.left, context)
				|| isProcessExitExpression(node.right, context);
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

	if (node.type === 'IfStatement') {
		if (isProcessExitExpressionAtStart(node.test, context)) {
			return false;
		}

		const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
		if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
			const selectedBranch = staticValue.value ? node.consequent : node.alternate;
			return Boolean(selectedBranch && hasLabeledBreakBeforeProcessExit(selectedBranch, context, labelName));
		}
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

const isProcessExitObjectPropertyAtStart = (node, context) => {
	if (node.type === 'SpreadElement') {
		return isProcessExitExpressionAtStart(node.argument, context);
	}

	if (node.computed) {
		if (isProcessExitExpressionAtStart(node.key, context)) {
			return true;
		}

		if (!isDefinitelyNotThrowingExpression(node.key, context)) {
			return false;
		}
	}

	return isProcessExitExpressionAtStart(node.value, context);
};

const isProcessExitObjectExpressionAtStart = (node, context) => {
	for (const property of node.properties) {
		if (isProcessExitObjectPropertyAtStart(property, context)) {
			return true;
		}

		if (property.type === 'SpreadElement') {
			if (!isDefinitelyNotThrowingExpression(property.argument, context)) {
				return false;
			}

			continue;
		}

		if (
			(property.computed && !isDefinitelyNotThrowingExpression(property.key, context))
			|| !isDefinitelyNotThrowingExpression(property.value, context)
		) {
			return false;
		}
	}

	return false;
};

const isProcessExitExpressionListAtStart = (expressions, context) => {
	for (const expression of expressions) {
		if (!expression) {
			continue;
		}

		if (isProcessExitExpressionAtStart(expression, context)) {
			return true;
		}

		if (!isDefinitelyNotThrowingExpression(expression, context)) {
			return false;
		}
	}

	return false;
};

const isProcessExitCallAtStart = (node, context) =>
	isProcessExitCall(node, context)
	&& (
		node.arguments.every(argument => isDefinitelyNotThrowingExpression(argument, context))
		|| isProcessExitExpressionListAtStart(node.arguments, context)
	);

const isProcessExitTaggedTemplateExpressionAtStart = (node, context) => {
	if (isProcessExitExpressionAtStart(node.tag, context)) {
		return true;
	}

	if (!isDefinitelyNotThrowingReference(node.tag, context)) {
		return false;
	}

	return isProcessExitExpressionListAtStart(node.quasi.expressions, context);
};

const isProcessExitLogicalExpressionAtStart = (node, context) => {
	if (isProcessExitExpressionAtStart(node.left, context)) {
		return true;
	}

	return isLogicalExpressionRightEvaluated(node, context)
		&& isProcessExitExpressionAtStart(node.right, context);
};

const isProcessExitConditionalExpressionAtStart = (node, context) => {
	if (isProcessExitExpressionAtStart(node.test, context)) {
		return true;
	}

	const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
	if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
		return isProcessExitExpressionAtStart(staticValue.value ? node.consequent : node.alternate, context);
	}

	return isDefinitelyNotThrowingReference(node.test, context)
		&& isProcessExitExpressionAtStart(node.consequent, context)
		&& isProcessExitExpressionAtStart(node.alternate, context);
};

export function isProcessExitExpressionAtStart(node, context) {
	if (isProcessExitCallAtStart(node, context)) {
		return true;
	}

	if (isTransparentTypeScriptExpressionWrapper(node)) {
		return isProcessExitExpressionAtStart(node.expression, context);
	}

	switch (node?.type) {
		case 'ChainExpression': {
			return isProcessExitExpressionAtStart(node.expression, context);
		}

		case 'SpreadElement': {
			return isProcessExitExpressionAtStart(node.argument, context);
		}

		case 'CallExpression':
		case 'NewExpression': {
			return isProcessExitCallOrNewExpressionAtStart(node, context);
		}

		case 'MemberExpression': {
			return isProcessExitMemberExpressionAtStart(node, context);
		}

		case 'ArrayExpression': {
			return isProcessExitExpressionListAtStart(node.elements, context);
		}

		case 'ObjectExpression': {
			return isProcessExitObjectExpressionAtStart(node, context);
		}

		case 'ClassExpression': {
			return isProcessExitClassAtStart(node, context, true);
		}

		case 'AssignmentExpression': {
			return isProcessExitExpressionAtStart(node.left, context)
				|| (
					isAssignmentRightAlwaysEvaluated(node, context)
					&& isProcessExitExpressionAtStart(node.right, context)
				);
		}

		case 'TaggedTemplateExpression': {
			return isProcessExitTaggedTemplateExpressionAtStart(node, context);
		}

		case 'YieldExpression': {
			return Boolean(node.argument && isProcessExitExpressionAtStart(node.argument, context));
		}

		case 'ImportExpression': {
			return isProcessExitExpressionAtStart(node.source, context);
		}

		case 'TemplateLiteral': {
			return isProcessExitExpressionListAtStart(node.expressions, context);
		}

		case 'UnaryExpression':
		case 'AwaitExpression': {
			return isProcessExitExpressionAtStart(node.argument, context);
		}

		case 'SequenceExpression': {
			return isProcessExitExpressionListAtStart(node.expressions, context);
		}

		case 'LogicalExpression': {
			return isProcessExitLogicalExpressionAtStart(node, context);
		}

		case 'BinaryExpression': {
			return isProcessExitExpressionAtStart(node.left, context)
				|| (
					isDefinitelyNotThrowingExpression(node.left, context)
					&& isProcessExitExpressionAtStart(node.right, context)
				);
		}

		case 'ConditionalExpression': {
			return isProcessExitConditionalExpressionAtStart(node, context);
		}

		default: {
			return false;
		}
	}
}

function hasPossiblyThrowingClassHeritage(node, context) {
	if (node.type !== 'StaticBlock') {
		return false;
	}

	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return false;
		}

		if (parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') {
			return Boolean(
				parent.superClass
				&& parent.superClass !== child
				&& !isProcessExitExpressionAtStart(parent.superClass, context)
				&& !isDefinitelyValidClassHeritage(parent.superClass, context),
			);
		}

		child = parent;
		({parent} = parent);
	}

	return false;
}

function isProcessExitTryStatement(branch, context, checkTryStatements, options) {
	if (branch.finalizer && isProcessExitBranch(branch.finalizer, context, true, options)) {
		return true;
	}

	const tryBlockAlwaysExits = branch.handler
		? isProcessExitBlockAtStart(branch.block, context, checkTryStatements, options)
		: isProcessExitBranch(branch.block, context, checkTryStatements, options);

	if (!checkTryStatements) {
		return tryBlockAlwaysExits
			|| (
				branch.handler
				&& isBranchExit(branch.block, context, isThrowStatement)
				&& isProcessExitBranch(branch.handler, context, false, options)
			);
	}

	if (tryBlockAlwaysExits) {
		return true;
	}

	return Boolean(
		branch.handler
		&& isBranchExit(branch.block, context, isThrowStatement)
		&& isProcessExitBranch(branch.handler, context, true, options),
	);
}

function isProcessExitBlock(branch, context, checkTryStatements, options) {
	for (const statement of branch.body) {
		if (isProcessExitBranch(statement, context, checkTryStatements, options)) {
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

const isProcessExitConditionalBranchAtStart = (branch, context, checkTryStatements, options) => {
	if (isProcessExitExpressionAtStart(branch.test, context)) {
		return true;
	}

	const staticValue = getStaticValue(branch.test, context.sourceCode.getScope(branch.test));
	if (staticValue !== null && isDefinitelyNotThrowingExpression(branch.test, context)) {
		const selectedBranch = staticValue.value ? branch.consequent : branch.alternate;
		return Boolean(selectedBranch && isProcessExitBranchAtStart(selectedBranch, context, checkTryStatements, options));
	}

	return isDefinitelyNotThrowingReference(branch.test, context)
		&& isProcessExitBranchAtStart(branch.consequent, context, checkTryStatements, options)
		&& Boolean(branch.alternate && isProcessExitBranchAtStart(branch.alternate, context, checkTryStatements, options));
};

const isProcessExitTryStatementAtStart = (branch, context, checkTryStatements, options) => {
	if (branch.finalizer && isProcessExitBranchAtStart(branch.finalizer, context, checkTryStatements, options)) {
		return true;
	}

	if (branch.finalizer && options?.isAdditionalStatementAlwaysExits && !isDefinitelyNotThrowingStatementWithOptions(branch.finalizer, context, options)) {
		options = {...options, isAdditionalStatementAlwaysExits: undefined};
	}

	return branch.handler
		? isProcessExitTryStatement(branch, context, checkTryStatements, options)
		: isProcessExitBlockAtStart(branch.block, context, checkTryStatements, options);
};

const isProcessExitDoWhileBody = (node, loop, context, state) => {
	const {checkTryStatements, enclosingLoop, isAtStart, isLastStatement, options, isProcessExitAtTest} = state;

	if (
		(
			node.type !== 'BlockStatement'
			&& (isAtStart
				? isProcessExitBranchAtStart(node, context, checkTryStatements, options)
				: isProcessExitBranch(node, context, checkTryStatements, options))
		)
		|| (
			node.type !== 'BlockStatement'
			&& !isAtStart
			&& isBranchExit(node, context, isReturnOrThrowStatement)
			&& !(node.type === 'SwitchStatement' && hasControlFlowExitFromLoop(node, loop, context))
		)
	) {
		return true;
	}

	if (
		isDefinitelyNotThrowingStatementWithOptions(node, context, options)
		|| isContinueToLoop(node, loop)
	) {
		return isProcessExitAtTest;
	}

	if (node.type === 'LabeledStatement' && isLoop(node.body)) {
		return isProcessExitDoWhileBody(node.body, loop, context, state);
	}

	if (node.type === 'IfStatement') {
		const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
		if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
			const selectedBranch = staticValue.value ? node.consequent : node.alternate;
			return selectedBranch
				? isProcessExitDoWhileBody(selectedBranch, loop, context, state)
				: isProcessExitAtTest;
		}

		return isDefinitelyNotThrowingReference(node.test, context)
			&& isProcessExitDoWhileBody(node.consequent, loop, context, state)
			&& (
				node.alternate
					? isProcessExitDoWhileBody(node.alternate, loop, context, state)
					: isProcessExitAtTest
			);
	}

	if (node.type !== 'BlockStatement') {
		return isProcessExitAtTest
			&& isLastStatement
			&& (
				(
					node.type === 'SwitchStatement'
					&& (!checkTryStatements || isSwitchBodyDefinitelyNotThrowing(node, loop, context, options))
					&& !hasControlFlowExitBeforeLoopTest(node, loop, context)
				)
				|| (
					isLoop(node)
					&& (
						!isInfiniteLoop(node, context)
						|| isLoopBodyAlwaysExits(node, state)
					)
					&& (!checkTryStatements || isLoopHeaderDefinitelyNotThrowing(node, context))
					&& (!checkTryStatements || isLoopBodyAlwaysExitsSimply(node.body, node, state))
					&& !hasControlFlowExitBeforeLoopTest(node, loop, context)
				)
			);
	}

	if (isAtStart) {
		if (isProcessExitBlockAtStart(node, context, checkTryStatements, options)) {
			return true;
		}

		if (isProcessExitConditionalContinue(node.body, loop, context, state)) {
			return true;
		}

		const lastStatement = node.body.at(-1);
		if (
			lastStatement
			&& isContinueToLoop(lastStatement, loop)
			&& node.body.slice(0, -1).every(statement => isDefinitelyNotThrowingStatementWithOptions(statement, context, options))
		) {
			return isProcessExitAtTest;
		}

		return node.body.length === 1
			&& isProcessExitDoWhileBody(node.body[0], loop, context, state);
	}

	if (node.body.some(statement => hasControlFlowExitFromLoop(statement, loop, context))) {
		if (isProcessExitConditionalContinue(node.body, loop, context, state)) {
			return true;
		}

		if (isProcessExitDoWhileStatementList(node.body, loop, context, state)) {
			return true;
		}

		const lastStatement = node.body.at(-1);
		return Boolean(
			lastStatement
			&& hasControlFlowExitFromLoop(lastStatement, loop, context)
			&& isProcessExitDoWhileBody(lastStatement, loop, context, state),
		);
	}

	return isProcessExitDoWhileStatementList(node.body, loop, context, state);
};

const isProcessExitConditionalContinue = (statements, loop, context, state) => {
	const {isProcessExitAtTest, options} = state;
	const index = statements.findIndex(statement => isConditionalContinueToLoop(statement, loop, context));
	const statement = index === -1 ? undefined : statements[index];
	return Boolean(
		statement
		&& statements.slice(0, index).every(statement => isDefinitelyNotThrowingStatementWithOptions(statement, context, options))
		&& isProcessExitAtTest
		&& (
			statement.alternate
				? isProcessExitDoWhileBody(statement.alternate, loop, context, state)
				: index === statements.length - 1
					|| isProcessExitDoWhileStatementList(
						statements.slice(index + 1),
						loop,
						context,
						state,
					)
		),
	);
};

const isProcessExitDoWhileStatementList = (statements, loop, context, state) => {
	const {checkTryStatements, isAtStart, options, isProcessExitAtTest} = state;
	let hasPotentiallyThrowingStatement = false;

	for (const [index, statement] of statements.entries()) {
		if (isAtStart) {
			if (isProcessExitBranchAtStart(statement, context, checkTryStatements, options)) {
				return true;
			}

			if (isContinueToLoop(statement, loop)) {
				return isProcessExitAtTest;
			}

			if (!isDefinitelyNotThrowingStatementWithOptions(statement, context, options)) {
				return false;
			}

			continue;
		}

		if (isDefinitelyNotThrowingStatementWithOptions(statement, context, options)) {
			continue;
		}

		if (isConditionalContinueToLoop(statement, loop, context) && hasPotentiallyThrowingStatement) {
			return false;
		}

		const statementState = {
			...state,
			isLastStatement: index === statements.length - 1,
		};

		if (isProcessExitDoWhileBody(statement, loop, context, statementState)) {
			return true;
		}

		if (hasControlFlowExitFromLoop(statement, loop, context)) {
			return false;
		}

		hasPotentiallyThrowingStatement = true;
	}

	return false;
};

const isInfiniteLoop = (branch, context) => (
	(branch.type === 'WhileStatement' || branch.type === 'ForStatement')
	&& (
		!branch.test
		|| Boolean(getStaticValue(branch.test, context.sourceCode.getScope(branch.test))?.value)
	)
);

const isLoopBodyAlwaysExitsSimply = (node, loop, state) => {
	const {context, enclosingLoop, options} = state;
	if (
		isBreakFromLoop(node, loop)
		|| isContinueToLoop(node, loop)
		|| Boolean(enclosingLoop && isContinueToLoop(node, enclosingLoop))
		|| node.type === 'EmptyStatement'
	) {
		return true;
	}

	if (node.type === 'IfStatement' && isDefinitelyNotThrowingReference(node.test, context)) {
		return isLoopBodyAlwaysExitsSimply(node.consequent, loop, state)
			&& (!node.alternate || isLoopBodyAlwaysExitsSimply(node.alternate, loop, state));
	}

	if (node.type !== 'BlockStatement') {
		return false;
	}

	const lastStatement = node.body.at(-1);
	return Boolean(
		!lastStatement
		|| (
			isLoopBodyAlwaysExitsSimply(lastStatement, loop, state)
			&& node.body.slice(0, -1).every(statement => isDefinitelyNotThrowingStatementWithOptions(statement, context, options))
		),
	);
};

const isLoopBodyAlwaysExits = (loop, state) => {
	const {context, enclosingLoop} = state;
	return isLoopBodyAlwaysExitsSimply(loop.body, loop, state)
		|| isBranchExit(
			loop.body,
			context,
			statement => isBreakFromLoop(statement, loop)
				|| Boolean(enclosingLoop && isContinueToLoop(statement, enclosingLoop)),
		);
};

const isSwitchBodyDefinitelyNotThrowing = (switchStatement, loop, context, options) => {
	const isCaseStatementDefinitelyNotThrowing = statement => (
		isDefinitelyNotThrowingStatementWithOptions(statement, context, options)
		|| isBreakFromSwitch(statement, switchStatement)
		|| isContinueToLoop(statement, loop)
		|| (
			statement.type === 'BlockStatement'
			&& statement.body.length > 0
			&& isCaseStatementDefinitelyNotThrowing(statement.body.at(-1))
			&& statement.body.slice(0, -1).every(statement => isDefinitelyNotThrowingStatementWithOptions(statement, context, options))
		)
	);

	return isDefinitelyNotThrowingExpression(switchStatement.discriminant, context)
		&& switchStatement.cases.every(switchCase =>
			(switchCase.test === null || isDefinitelyNotThrowingExpression(switchCase.test, context))
			&& switchCase.consequent.every(statement => isCaseStatementDefinitelyNotThrowing(statement)),
		);
};

const isProcessExitInfiniteLoopAtStart = (branch, context, checkTryStatements, options) => {
	const isInfinite = isInfiniteLoop(branch, context);
	return isInfinite && isProcessExitBranchAtStart(branch.body, context, checkTryStatements, options);
};

const isProcessExitDoWhile = (branch, context, checkTryStatements, options) =>
	isProcessExitDoWhileBody(branch.body, branch, context, {
		checkTryStatements,
		context,
		enclosingLoop: branch,
		isAtStart: false,
		isLastStatement: true,
		options,
		isProcessExitAtTest: isProcessExitExpression(branch.test, context),
	});

const isProcessExitDoWhileAtStart = (branch, context, checkTryStatements, options) =>
	isProcessExitDoWhileBody(branch.body, branch, context, {
		checkTryStatements,
		context,
		enclosingLoop: branch,
		isAtStart: true,
		isLastStatement: true,
		options,
		isProcessExitAtTest: isProcessExitExpressionAtStart(branch.test, context),
	});

const isProcessExitForInitAtStart = (node, context) => node.type === 'VariableDeclaration'
	? isProcessExitVariableDeclarationAtStart(node, context)
	: isProcessExitExpressionAtStart(node, context);

const isDefinitelyNotThrowingForInit = (node, context) => node.type === 'VariableDeclaration'
	? isDefinitelyNotThrowingStatement(node, context)
	: isDefinitelyNotThrowingExpression(node, context);

const isDefinitelyNotThrowingForLeft = (node, context) => node.type === 'VariableDeclaration'
	? isDefinitelyNotThrowingStatement(node, context)
	: isDefinitelyNotThrowingAssignmentTarget(node, context);

const isLoopHeaderDefinitelyNotThrowing = (node, context) => {
	if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
		return isDefinitelyNotThrowingReference(node.test, context);
	}

	if (node.type === 'ForStatement') {
		return (!node.init || isDefinitelyNotThrowingForInit(node.init, context))
			&& (!node.test || isDefinitelyNotThrowingReference(node.test, context))
			&& (!node.update || isDefinitelyNotThrowingExpression(node.update, context));
	}

	return (node.type === 'ForInStatement' || node.type === 'ForOfStatement')
		&& isDefinitelyNotThrowingForLeft(node.left, context)
		&& isDefinitelyNotThrowingExpression(node.right, context);
};

const isProcessExitLoopAtStart = (branch, context, checkTryStatements, options) => {
	if (branch.type === 'WhileStatement') {
		return isProcessExitExpressionAtStart(branch.test, context)
			|| isProcessExitInfiniteLoopAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'ForStatement') {
		if (branch.init) {
			if (isProcessExitForInitAtStart(branch.init, context)) {
				return true;
			}

			if (!isDefinitelyNotThrowingForInit(branch.init, context)) {
				return false;
			}
		}

		return Boolean(
			(branch.test && isProcessExitExpressionAtStart(branch.test, context))
			|| (isInfiniteLoop(branch, context)
				&& branch.update
				&& isProcessExitExpressionAtStart(branch.update, context)
				&& isDefinitelyNotThrowingStatement(branch.body, context))
			|| isProcessExitInfiniteLoopAtStart(branch, context, checkTryStatements, options),
		);
	}

	return (branch.type === 'ForInStatement' || branch.type === 'ForOfStatement')
		&& isProcessExitExpressionAtStart(branch.right, context);
};

const isProcessExitSwitchCaseAtStart = (cases, startIndex, context, {checkTryStatements, switchStatement, options}) => {
	const statements = [];
	for (let index = startIndex; index < cases.length; index++) {
		statements.push(...cases[index].consequent);
	}

	return isProcessExitStatementListAtStart(
		statements,
		context,
		checkTryStatements,
		{
			...options,
			isAdditionalStatementAlwaysExits: statement => isControlFlowExitFromSwitch(statement, switchStatement),
		},
	);
};

const isProcessExitSwitchAtStart = (branch, context, checkTryStatements, options) => {
	if (isProcessExitExpressionAtStart(branch.discriminant, context)) {
		return true;
	}

	if (!isDefinitelyNotThrowingReference(branch.discriminant, context)) {
		return false;
	}

	const firstProcessExitCaseIndex = branch.cases.findIndex(switchCase =>
		switchCase.test && isProcessExitExpressionAtStart(switchCase.test, context),
	);
	const defaultCaseIndex = branch.cases.findIndex(switchCase => switchCase.test === null);

	for (const [index, switchCase] of branch.cases.entries()) {
		if (firstProcessExitCaseIndex !== -1 && index >= firstProcessExitCaseIndex) {
			break;
		}

		if (
			(
				switchCase.test !== null
				&& !isDefinitelyNotThrowingExpression(switchCase.test, context)
			)
			|| !isProcessExitSwitchCaseAtStart(branch.cases, index, context, {checkTryStatements, switchStatement: branch, options})
		) {
			return false;
		}
	}

	return firstProcessExitCaseIndex !== -1
		|| (
			defaultCaseIndex !== -1
			&& isProcessExitSwitchCaseAtStart(branch.cases, defaultCaseIndex, context, {checkTryStatements, switchStatement: branch, options})
		);
};

const isProcessExitClassAtStart = (node, context, checkTryStatements, options) => {
	if (node.superClass) {
		if (isProcessExitExpressionAtStart(node.superClass, context)) {
			return true;
		}

		if (!isDefinitelyValidClassHeritage(node.superClass, context)) {
			return false;
		}
	}

	for (const element of node.body.body) {
		if (element.computed) {
			if (isProcessExitExpressionAtStart(element.key, context)) {
				return true;
			}

			if (!isDefinitelyNotThrowingExpression(element.key, context)) {
				return false;
			}
		}

		if (element.type === 'StaticBlock') {
			if (isProcessExitBlockAtStart(element, context, checkTryStatements, options)) {
				return true;
			}

			if (element.body.some(statement => !isDefinitelyNotThrowingStatementWithOptions(statement, context, options))) {
				return false;
			}

			continue;
		}

		if (element.type !== 'PropertyDefinition' || !element.static) {
			continue;
		}

		if (element.value && isProcessExitExpressionAtStart(element.value, context)) {
			return true;
		}

		if (element.value && !isDefinitelyNotThrowingExpression(element.value, context)) {
			return false;
		}
	}

	return false;
};

export function isProcessExitBranchAtStart(branch, context, checkTryStatements = true, options) {
	if (branch.type === 'ExpressionStatement') {
		return isProcessExitExpressionAtStart(branch.expression, context);
	}

	if (branch.type === 'VariableDeclaration') {
		return isProcessExitVariableDeclarationAtStart(branch, context);
	}

	if (branch.type === 'ReturnStatement' || branch.type === 'ThrowStatement') {
		return Boolean(branch.argument && isProcessExitExpressionAtStart(branch.argument, context));
	}

	if (branch.type === 'IfStatement' || branch.type === 'ConditionalExpression') {
		return isProcessExitConditionalBranchAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'BlockStatement') {
		return isProcessExitBlockAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'TryStatement') {
		return isProcessExitTryStatementAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'LabeledStatement') {
		return !hasLabeledBreakBeforeProcessExit(branch.body, context, branch.label.name)
			&& isProcessExitBranchAtStart(branch.body, context, checkTryStatements, options);
	}

	if (
		['DoWhileStatement', 'WhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement'].includes(branch.type)
	) {
		return branch.type === 'DoWhileStatement'
			? isProcessExitDoWhileAtStart(branch, context, checkTryStatements, options)
			: isProcessExitLoopAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'SwitchStatement') {
		return isProcessExitSwitchAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'ClassDeclaration' || branch.type === 'ClassExpression') {
		return isProcessExitClassAtStart(branch, context, checkTryStatements, options);
	}

	return isProcessExitBranch(branch, context, checkTryStatements, options);
}

const isProcessExitClass = (node, context, checkTryStatements, options) => {
	if (node.superClass) {
		if (isProcessExitExpression(node.superClass, context)) {
			return true;
		}

		if (!isDefinitelyValidClassHeritage(node.superClass, context)) {
			return false;
		}
	}

	return node.body.body.some(element => {
		if (element.computed && isProcessExitExpression(element.key, context)) {
			return true;
		}

		if (element.type === 'StaticBlock') {
			return isProcessExitBlock(element, context, checkTryStatements, options);
		}

		return element.type === 'PropertyDefinition'
			&& element.static
			&& isProcessExitExpression(element.value, context);
	});
};

export function isProcessExitBranch(branch, context, checkTryStatements = true, options) {
	if (isProcessExitStatement(branch, context) || isProcessExitExpression(branch, context)) {
		return true;
	}

	if (
		(branch.type === 'ReturnStatement' || branch.type === 'ThrowStatement')
		&& branch.argument
		&& isProcessExitExpression(branch.argument, context)
	) {
		return true;
	}

	if (branch.type === 'SwitchStatement' && isProcessExitExpression(branch.discriminant, context)) {
		return true;
	}

	if (branch.type === 'BlockStatement') {
		return isProcessExitBlock(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'CatchClause') {
		return isProcessExitBranch(branch.body, context, checkTryStatements, options);
	}

	if (branch.type === 'VariableDeclaration') {
		return isProcessExitVariableDeclaration(branch, context);
	}

	if (branch.type === 'DoWhileStatement') {
		return isProcessExitDoWhile(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'WhileStatement') {
		return isProcessExitExpression(branch.test, context)
			|| isProcessExitInfiniteLoopAtStart(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'ForStatement') {
		return Boolean(
			(branch.init && (
				branch.init.type === 'VariableDeclaration'
					? isProcessExitVariableDeclaration(branch.init, context)
					: isProcessExitExpression(branch.init, context)
			))
			|| (branch.test && isProcessExitExpression(branch.test, context))
			|| (isInfiniteLoop(branch, context)
				&& branch.update
				&& isProcessExitExpression(branch.update, context)
				&& isDefinitelyNotThrowingStatement(branch.body, context))
			|| isProcessExitInfiniteLoopAtStart(branch, context, checkTryStatements, options),
		);
	}

	if (branch.type === 'ForInStatement' || branch.type === 'ForOfStatement') {
		return isProcessExitExpression(branch.right, context);
	}

	if (branch.type === 'ClassDeclaration' || branch.type === 'ClassExpression') {
		return isProcessExitClass(branch, context, checkTryStatements, options);
	}

	if (branch.type === 'LabeledStatement') {
		return !hasLabeledBreakBeforeProcessExit(branch.body, context, branch.label.name)
			&& isProcessExitBranch(branch.body, context, checkTryStatements, options);
	}

	if (branch.type === 'TryStatement') {
		return isProcessExitTryStatement(branch, context, checkTryStatements, options);
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
		&& isProcessExitBranch(branch.consequent, context, checkTryStatements, options)
		&& isProcessExitBranch(branch.alternate, context, checkTryStatements, options)
	);
}

function getControlFlowTarget(node) {
	let current = node.parent;
	if (node.label) {
		while (current && !isFunction(current)) {
			if (current.type === 'LabeledStatement' && current.label.name === node.label.name) {
				return current;
			}

			current = current.parent;
		}

		return;
	}

	const isBreak = node.type === 'BreakStatement';
	while (current && !isFunction(current)) {
		if ((isBreak && (isLoop(current) || current.type === 'SwitchStatement')) || (!isBreak && isLoop(current))) {
			return current;
		}

		current = current.parent;
	}
}

function isContinueToLoop(node, loop) {
	if (node.type === 'ContinueStatement') {
		const target = getControlFlowTarget(node);
		return isControlFlowTargetCurrentLoop(target, loop);
	}

	return node.type === 'BlockStatement'
		&& node.body.length === 1
		&& isContinueToLoop(node.body[0], loop);
}

function isBreakFromLoop(node, loop) {
	return node.type === 'BreakStatement'
		&& isControlFlowTargetCurrentLoop(getControlFlowTarget(node), loop);
}

function isControlFlowTargetCurrentLoop(target, loop) {
	return target === loop || (target?.type === 'LabeledStatement' && target.body === loop);
}

function isControlFlowTargetInOuterScope(target, loop) {
	for (let current = loop.parent; current; current = current.parent) {
		if (current === target) {
			return true;
		}

		if (isFunction(current)) {
			break;
		}
	}

	return false;
}

function isConditionalContinueToLoop(node, loop, context) {
	return node.type === 'IfStatement'
		&& isDefinitelyNotThrowingReference(node.test, context)
		&& isContinueToLoop(node.consequent, loop);
}

function hasControlFlowExitBeforeLoopTest(node, loop, context) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (node.type === 'BreakStatement' || node.type === 'ContinueStatement') {
		const target = getControlFlowTarget(node);
		const targetsCurrentLoop = isControlFlowTargetCurrentLoop(target, loop);
		if (
			(node.type === 'BreakStatement' && targetsCurrentLoop)
			|| (!targetsCurrentLoop && isControlFlowTargetInOuterScope(target, loop))
		) {
			return true;
		}
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasControlFlowExitBeforeLoopTest(child, loop, context))) {
			return true;
		}
	}

	return false;
}

function hasControlFlowExitFromLoop(node, loop, context) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (node.type === 'BreakStatement' || node.type === 'ContinueStatement') {
		const target = getControlFlowTarget(node);
		if (
			isControlFlowTargetCurrentLoop(target, loop)
			|| isControlFlowTargetInOuterScope(target, loop)
		) {
			return true;
		}
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasControlFlowExitFromLoop(child, loop, context))) {
			return true;
		}
	}

	return false;
}

function isBreakFromSwitch(node, switchStatement) {
	return node.type === 'BreakStatement'
		&& isControlFlowTargetCurrentLoop(getControlFlowTarget(node), switchStatement);
}

function isControlFlowExitFromSwitch(node, switchStatement) {
	if (node.type !== 'BreakStatement' && node.type !== 'ContinueStatement') {
		return false;
	}

	const target = getControlFlowTarget(node);
	if (
		!target
		|| isControlFlowTargetCurrentLoop(target, switchStatement)
	) {
		return false;
	}

	return isControlFlowTargetInOuterScope(target, switchStatement);
}

function hasSwitchControlFlowExitInStatements(statements, context, switchStatement, checkOuterControlFlow) {
	for (const statement of statements) {
		if (hasSwitchControlFlowExit(statement, context, switchStatement, checkOuterControlFlow)) {
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

function hasSwitchControlFlowExit(node, context, switchStatement, checkOuterControlFlow) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (
		(node.type === 'BreakStatement' && isBreakFromSwitch(node, switchStatement))
		|| (checkOuterControlFlow && isControlFlowExitFromSwitch(node, switchStatement))
	) {
		return true;
	}

	if (node.type === 'BlockStatement') {
		return hasSwitchControlFlowExitInStatements(node.body, context, switchStatement, checkOuterControlFlow);
	}

	if (isLoop(node) || node.type === 'SwitchStatement') {
		return false;
	}

	if (node.type === 'IfStatement') {
		if (isProcessExitExpressionAtStart(node.test, context)) {
			return false;
		}

		const staticValue = getStaticValue(node.test, context.sourceCode.getScope(node.test));
		if (staticValue !== null && isDefinitelyNotThrowingExpression(node.test, context)) {
			const selectedBranch = staticValue.value ? node.consequent : node.alternate;
			return Boolean(selectedBranch && hasSwitchControlFlowExit(selectedBranch, context, switchStatement, checkOuterControlFlow));
		}
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasSwitchControlFlowExit(child, context, switchStatement, checkOuterControlFlow))) {
			return true;
		}
	}

	return false;
}

function isSwitchBranchExit(branch, context, branchAlwaysExits, checkTryStatements) {
	const caseExits = [];
	const caseBranchAlwaysExits = branchAlwaysExits === isNeverExiting
		? branchAlwaysExits
		: caseBranch => isReturnOrThrowStatement(caseBranch)
			|| branchAlwaysExits(caseBranch)
			|| isControlFlowExitFromSwitch(caseBranch, branch);
	let fallThroughExits = false;
	for (let index = branch.cases.length - 1; index >= 0; index--) {
		const switchCase = branch.cases[index];
		if (hasSwitchControlFlowExitInStatements(
			switchCase.consequent,
			context,
			branch,
			branchAlwaysExits === isNeverExiting,
		)) {
			fallThroughExits = false;
		} else {
			const caseConsequentExits = switchCase.consequent.some(statement =>
				isBranchExit(statement, context, caseBranchAlwaysExits)
				|| isProcessExitBranch(statement, context, checkTryStatements),
			);
			fallThroughExits = caseConsequentExits || fallThroughExits;
		}

		caseExits[index] = fallThroughExits;
	}

	const firstProcessExitCaseIndex = branch.cases.findIndex(switchCase =>
		switchCase.test && isProcessExitExpressionAtStart(switchCase.test, context),
	);
	if (firstProcessExitCaseIndex !== -1) {
		return branch.cases.every((switchCase, index) =>
			index >= firstProcessExitCaseIndex
			|| caseExits[index],
		);
	}

	return branch.cases.some(switchCase => switchCase.test === null)
		&& caseExits.every(Boolean);
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

	if (branch.type === 'IfStatement' || branch.type === 'ConditionalExpression') {
		const staticValue = getStaticValue(branch.test, context.sourceCode.getScope(branch.test));
		if (staticValue !== null && isDefinitelyNotThrowingExpression(branch.test, context)) {
			const selectedBranch = staticValue.value ? branch.consequent : branch.alternate;
			return Boolean(selectedBranch && isBranchExit(selectedBranch, context, branchAlwaysExits));
		}
	}

	return (
		(branch.type === 'IfStatement' || branch.type === 'ConditionalExpression')
		&& branch.alternate
		&& isBranchExit(branch.consequent, context, branchAlwaysExits)
		&& isBranchExit(branch.alternate, context, branchAlwaysExits)
	);
}
