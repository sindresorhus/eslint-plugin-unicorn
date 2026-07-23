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
	getStaticValue(node, context.sourceCode.getScope(node)) !== null;

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

const isDefinitelyNotThrowingReference = (node, context) => {
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

	return node.type === 'VariableDeclaration'
		&& !isUsingDeclaration(node)
		&& node.declarations.every(declaration =>
			declaration.id.type === 'Identifier'
			&& (!declaration.init || isDefinitelyNotThrowingExpression(declaration.init, context)),
		);
};

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

const isProcessExitStatementListAtStart = (statements, context, checkTryStatements) => {
	for (const statement of statements) {
		if (isProcessExitBranchAtStart(statement, context, checkTryStatements)) {
			return true;
		}

		if (isNonThrowingConditionalReturn(statement, context)) {
			continue;
		}

		if (!isDefinitelyNotThrowingStatement(statement, context)) {
			return false;
		}
	}

	return false;
};

export const isProcessExitBlockAtStart = (branch, context, checkTryStatements = true) =>
	!hasPossiblyThrowingClassHeritage(branch, context)
	&& isProcessExitStatementListAtStart(branch.body, context, checkTryStatements);

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
	return staticValue !== null
		&& isDefinitelyNotThrowingExpression(node.test, context)
		&& isProcessExitExpressionAtStart(staticValue.value ? node.consequent : node.alternate, context);
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

function isProcessExitTryStatement(branch, context, checkTryStatements) {
	if (branch.finalizer && isProcessExitBranch(branch.finalizer, context)) {
		return true;
	}

	const tryBlockAlwaysExits = branch.handler
		? isProcessExitBlockAtStart(branch.block, context, checkTryStatements)
		: isProcessExitBranch(branch.block, context, checkTryStatements);

	if (!checkTryStatements) {
		return tryBlockAlwaysExits
			|| (
				branch.handler
				&& isBranchExit(branch.block, context, isThrowStatement)
				&& isProcessExitBranch(branch.handler, context, false)
			);
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

const isProcessExitConditionalBranchAtStart = (branch, context, checkTryStatements) => {
	if (isProcessExitExpressionAtStart(branch.test, context)) {
		return true;
	}

	const staticValue = getStaticValue(branch.test, context.sourceCode.getScope(branch.test));
	if (staticValue === null || !isDefinitelyNotThrowingExpression(branch.test, context)) {
		return false;
	}

	const selectedBranch = staticValue.value ? branch.consequent : branch.alternate;
	return Boolean(selectedBranch && isProcessExitBranchAtStart(selectedBranch, context, checkTryStatements));
};

const isProcessExitTryStatementAtStart = (branch, context, checkTryStatements) => {
	if (branch.finalizer && isProcessExitBranchAtStart(branch.finalizer, context, checkTryStatements)) {
		return true;
	}

	return branch.handler
		? isProcessExitTryStatement(branch, context, checkTryStatements)
		: isProcessExitBlockAtStart(branch.block, context, checkTryStatements);
};

const isProcessExitSwitchCaseAtStart = (cases, startIndex, context, checkTryStatements) => {
	const statements = [];
	for (let index = startIndex; index < cases.length; index++) {
		statements.push(...cases[index].consequent);
	}

	return isProcessExitStatementListAtStart(statements, context, checkTryStatements);
};

const isProcessExitSwitchAtStart = (branch, context, checkTryStatements) => {
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
			|| !isProcessExitSwitchCaseAtStart(branch.cases, index, context, checkTryStatements)
		) {
			return false;
		}
	}

	return firstProcessExitCaseIndex !== -1
		|| (
			defaultCaseIndex !== -1
			&& isProcessExitSwitchCaseAtStart(branch.cases, defaultCaseIndex, context, checkTryStatements)
		);
};

const isProcessExitClassAtStart = (node, context, checkTryStatements) => {
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
			if (isProcessExitBlockAtStart(element, context, checkTryStatements)) {
				return true;
			}

			if (element.body.some(statement => !isDefinitelyNotThrowingStatement(statement, context))) {
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

export function isProcessExitBranchAtStart(branch, context, checkTryStatements = true) {
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
		return isProcessExitConditionalBranchAtStart(branch, context, checkTryStatements);
	}

	if (branch.type === 'BlockStatement') {
		return isProcessExitBlockAtStart(branch, context, checkTryStatements);
	}

	if (branch.type === 'TryStatement') {
		return isProcessExitTryStatementAtStart(branch, context, checkTryStatements);
	}

	if (branch.type === 'SwitchStatement') {
		return isProcessExitSwitchAtStart(branch, context, checkTryStatements);
	}

	if (branch.type === 'ClassDeclaration' || branch.type === 'ClassExpression') {
		return isProcessExitClassAtStart(branch, context, checkTryStatements);
	}

	return isProcessExitBranch(branch, context, checkTryStatements);
}

const isProcessExitClass = (node, context, checkTryStatements) => {
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
			return isProcessExitBlock(element, context, checkTryStatements);
		}

		return element.type === 'PropertyDefinition'
			&& element.static
			&& isProcessExitExpression(element.value, context);
	});
};

export function isProcessExitBranch(branch, context, checkTryStatements = true) {
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
		return isProcessExitBlock(branch, context, checkTryStatements);
	}

	if (branch.type === 'CatchClause') {
		return isProcessExitBranch(branch.body, context, checkTryStatements);
	}

	if (branch.type === 'VariableDeclaration') {
		return isProcessExitVariableDeclaration(branch, context);
	}

	if (branch.type === 'ClassDeclaration' || branch.type === 'ClassExpression') {
		return isProcessExitClass(branch, context, checkTryStatements);
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

function getControlFlowTarget(node) {
	let current = node.parent;
	if (node.label) {
		while (current && !isFunction(current)) {
			if (current.type === 'LabeledStatement' && current.label.name === node.label.name) {
				return current.body;
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

function isBreakFromSwitch(node, switchStatement) {
	return getControlFlowTarget(node) === switchStatement;
}

function isControlFlowExitFromSwitch(node, switchStatement) {
	if (node.type !== 'BreakStatement' && node.type !== 'ContinueStatement') {
		return false;
	}

	const target = getControlFlowTarget(node);
	if (!target || target === switchStatement || (!isLoop(target) && target.type !== 'SwitchStatement')) {
		return false;
	}

	for (let current = switchStatement.parent; current; current = current.parent) {
		if (current === target) {
			return true;
		}

		if (isFunction(current)) {
			break;
		}
	}

	return false;
}

function hasSwitchControlFlowExitInStatements(statements, context, switchStatement) {
	for (const statement of statements) {
		if (hasSwitchControlFlowExit(statement, context, switchStatement)) {
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

function hasSwitchControlFlowExit(node, context, switchStatement) {
	if (!node || isFunction(node)) {
		return false;
	}

	if (node.type === 'BreakStatement' && isBreakFromSwitch(node, switchStatement)) {
		return true;
	}

	if (node.type === 'BlockStatement') {
		return hasSwitchControlFlowExitInStatements(node.body, context, switchStatement);
	}

	if (isLoop(node) || node.type === 'SwitchStatement') {
		return false;
	}

	for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];
		const children = Array.isArray(value) ? value : [value];
		if (children.some(child => hasSwitchControlFlowExit(child, context, switchStatement))) {
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
		if (hasSwitchControlFlowExitInStatements(switchCase.consequent, context, branch)) {
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

	return (
		(branch.type === 'IfStatement' || branch.type === 'ConditionalExpression')
		&& branch.alternate
		&& isBranchExit(branch.consequent, context, branchAlwaysExits)
		&& isBranchExit(branch.alternate, context, branchAlwaysExits)
	);
}
