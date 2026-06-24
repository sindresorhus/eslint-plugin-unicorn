import {
	findVariable,
	getPropertyName,
	getStaticValue,
} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	getLastTrailingCommentOnSameLine,
	hasCommentInRange,
	isGlobalIdentifier,
	isLeftHandSide,
	isTypeScriptExpressionWrapper,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-abort-signal-timeout';
const SUGGESTION_ID = 'prefer-abort-signal-timeout/suggestion';
const MAX_SET_TIMEOUT_DELAY = (2 ** 31) - 1;
const reasonSensitiveProperties = new Set([
	'reason',
	'throwIfAborted',
]);

const messages = {
	[MESSAGE_ID]: 'Prefer `AbortSignal.timeout()` over manually aborting an `AbortController` with `setTimeout()`.',
	[SUGGESTION_ID]: 'Replace with `AbortSignal.timeout()`.',
};

const getStatementList = statement => {
	if (Array.isArray(statement.parent.body)) {
		return statement.parent.body;
	}

	if (Array.isArray(statement.parent.consequent)) {
		return statement.parent.consequent;
	}
};

const getNextStatement = statement => {
	const statements = getStatementList(statement);
	if (!statements) {
		return;
	}

	return statements[statements.indexOf(statement) + 1];
};

const isGlobalNameAvailable = (name, node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), name);
	return !variable || variable.defs.length === 0;
};

const isGlobalAbortControllerConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'AbortController',
		argumentsLength: 0,
	})
	&& isGlobalIdentifier(node.callee, context);

const getTimeoutCall = (statement, context) => {
	if (
		statement?.type !== 'ExpressionStatement'
		|| !isCallExpression(statement.expression, {
			name: 'setTimeout',
			argumentsLength: 2,
			optional: false,
		})
		|| !isGlobalIdentifier(statement.expression.callee, context)
	) {
		return;
	}

	return statement.expression;
};

const getCallbackExpression = callback => {
	if (
		!callback
		|| (
			callback.type !== 'ArrowFunctionExpression'
			&& callback.type !== 'FunctionExpression'
		)
		|| callback.async
		|| callback.generator
		|| callback.params.length > 0
	) {
		return;
	}

	if (callback.body.type !== 'BlockStatement') {
		return callback.body;
	}

	if (
		callback.body.body.length !== 1
		|| callback.body.body[0].type !== 'ExpressionStatement'
	) {
		return;
	}

	return callback.body.body[0].expression;
};

const getAbortReference = (timeoutCall, controllerName) => {
	const [callback] = timeoutCall.arguments;
	const expression = getCallbackExpression(callback);

	if (
		!isCallExpression(expression, {
			argumentsLength: 0,
			optional: false,
		})
		|| !isMemberExpression(expression.callee, {
			property: 'abort',
			computed: false,
			optional: false,
		})
		|| expression.callee.object.type !== 'Identifier'
		|| expression.callee.object.name !== controllerName
	) {
		return;
	}

	return expression.callee.object;
};

const isForLoopLeftSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const isReasonSensitiveProperty = (node, context) =>
	reasonSensitiveProperties.has(getPropertyName(node, context.sourceCode.getScope(node)));

const isReasonSensitiveRead = (node, context) =>
	isMemberExpression(node.parent)
	&& node.parent.object === node
	&& isReasonSensitiveProperty(node.parent, context);

const getExpressionParentIgnoringTypeScriptWrappers = node => {
	let expression = node;
	let {parent} = node;

	while (isTypeScriptExpressionWrapper(parent)) {
		expression = parent;
		parent = parent.parent;
	}

	return {expression, parent};
};

const isSignalAlias = node => {
	const {expression, parent} = getExpressionParentIgnoringTypeScriptWrappers(node);

	return (
		parent.type === 'VariableDeclarator'
		&& parent.init === expression
	) || (
		parent.type === 'AssignmentExpression'
		&& parent.right === expression
	);
};

const getSignalMember = (identifier, context) => {
	const {parent} = identifier;

	if (
		!isMemberExpression(parent, {
			property: 'signal',
			computed: false,
			optional: false,
		})
		|| parent.object !== identifier
		|| isLeftHandSide(parent)
		|| isForLoopLeftSide(parent)
		|| isReasonSensitiveRead(parent, context)
		|| isSignalAlias(parent)
		|| hasCommentInRange(context, context.sourceCode.getRange(parent))
	) {
		return;
	}

	return parent;
};

const getSignalMembers = (variable, abortReference, context) => {
	const signalMembers = [];

	for (const reference of variable.references) {
		const {identifier} = reference;

		if (
			identifier === abortReference
			|| reference.init
		) {
			continue;
		}

		if (reference.isWrite()) {
			return;
		}

		const signalMember = getSignalMember(identifier, context);
		if (!signalMember) {
			return;
		}

		signalMembers.push(signalMember);
	}

	return signalMembers.length > 0 ? signalMembers : undefined;
};

const isInsideRange = (node, range, sourceCode) => {
	const nodeRange = sourceCode.getRange(node);
	return nodeRange[0] >= range[0] && nodeRange[1] <= range[1];
};

const hasCommentBetween = (context, leftNode, rightNode) => {
	const {sourceCode} = context;
	const [, leftEnd] = sourceCode.getRange(leftNode);
	const [rightStart] = sourceCode.getRange(rightNode);

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= leftEnd && commentEnd <= rightStart;
	});
};

const isValidAbortSignalTimeoutDelay = (node, context) => {
	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));

	if (!staticValue) {
		return true;
	}

	const {value} = staticValue;
	return typeof value === 'number'
		&& Number.isSafeInteger(value)
		&& value >= 0
		&& value <= MAX_SET_TIMEOUT_DELAY;
};

const shouldSkipDelay = (delay, signalMembers, timeoutStatementRange, context) =>
	delay.type === 'SequenceExpression'
	|| !isValidAbortSignalTimeoutDelay(delay, context)
	|| signalMembers.some(signalMember => isInsideRange(signalMember, timeoutStatementRange, context.sourceCode));

const hasNameConflict = (name, variable, node, context) => {
	const existingVariable = findVariable(context.sourceCode.getScope(node), name);
	return existingVariable && existingVariable !== variable;
};

const getReplacementName = (name, variable, signalMembers, context) => {
	let replacementName = name;

	if (name === 'abortController') {
		replacementName = 'abortSignal';
	} else if (name === 'controller') {
		replacementName = 'signal';
	}

	if (replacementName === name) {
		return name;
	}

	if (
		hasNameConflict(replacementName, variable, variable.identifiers[0], context)
		|| signalMembers.some(signalMember => hasNameConflict(replacementName, variable, signalMember, context))
	) {
		return name;
	}

	return replacementName;
};

const createProblem = (declarator, context) => {
	const {sourceCode} = context;
	const declaration = declarator.parent;
	const {id, init} = declarator;

	if (
		declaration.type !== 'VariableDeclaration'
		|| declaration.kind !== 'const'
		|| declaration.declarations.length !== 1
		|| id.type !== 'Identifier'
		|| !isGlobalAbortControllerConstructor(init, context)
		|| !isGlobalNameAvailable('AbortSignal', id, context)
		|| hasCommentInRange(context, sourceCode.getRange(init))
		|| (
			id.typeAnnotation
			&& hasCommentInRange(context, sourceCode.getRange(id.typeAnnotation))
		)
	) {
		return;
	}

	const timeoutStatement = getNextStatement(declaration);
	const timeoutCall = getTimeoutCall(timeoutStatement, context);
	if (
		!timeoutCall
		|| hasCommentBetween(context, declaration, timeoutStatement)
		|| hasCommentInRange(context, sourceCode.getRange(timeoutStatement))
		|| getLastTrailingCommentOnSameLine(context, timeoutStatement)
	) {
		return;
	}

	const abortReference = getAbortReference(timeoutCall, id.name);
	if (!abortReference) {
		return;
	}

	const variable = findVariable(sourceCode.getScope(id), id);
	if (!variable) {
		return;
	}

	if (findVariable(sourceCode.getScope(abortReference), abortReference) !== variable) {
		return;
	}

	const signalMembers = getSignalMembers(variable, abortReference, context);
	if (!signalMembers) {
		return;
	}

	const timeoutStatementRange = sourceCode.getRange(timeoutStatement);
	const [, delay] = timeoutCall.arguments;
	if (shouldSkipDelay(delay, signalMembers, timeoutStatementRange, context)) {
		return;
	}

	const replacementName = getReplacementName(id.name, variable, signalMembers, context);
	const timeoutText = `AbortSignal.timeout(${sourceCode.getText(delay)})`;

	return {
		node: id,
		messageId: MESSAGE_ID,
		suggest: [
			{
				messageId: SUGGESTION_ID,
				* fix(fixer) {
					yield fixer.replaceText(init, timeoutText);

					if (id.typeAnnotation) {
						yield fixer.replaceText(id.typeAnnotation, ': AbortSignal');
					}

					if (replacementName !== id.name) {
						const [idStart] = sourceCode.getRange(id);
						yield fixer.replaceTextRange([idStart, idStart + id.name.length], replacementName);
					}

					for (const signalMember of signalMembers) {
						yield fixer.replaceText(signalMember, replacementName);
					}

					yield removeStatement(timeoutStatement, context, fixer);
				},
			},
		],
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => createProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `AbortSignal.timeout()` over manually aborting an `AbortController` with `setTimeout()`.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
