import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isMemberExpression,
	isNewExpression,
} from '../ast/index.js';
import {removeStatement} from '../fix/index.js';
import {
	getCommentSafeProblem,
	getFunctionOnlyExpression,
	getLastTrailingCommentOnSameLine,
	getOutermostTypeScriptExpression,
	hasNonDirectiveComment,
	isGlobalIdentifier,
	isGlobalNameAvailable,
	isLeftHandSide,
	isSameBinding,
	unwrapTypeScriptExpression,
} from '../utils/index.js';

/*
Shared logic for `prefer-abort-signal-any` and `prefer-abort-signal-timeout`, which replace a `const controller = new AbortController()` that is only aborted by the statements after it with an `AbortSignal` call.
*/

const reasonSensitiveProperties = new Set([
	'reason',
	'throwIfAborted',
]);

const getStatementList = statement => {
	if (Array.isArray(statement.parent.body)) {
		return statement.parent.body;
	}

	if (Array.isArray(statement.parent.consequent)) {
		return statement.parent.consequent;
	}
};

/**
Get the statement after `statement` in the same statement list. Returns `undefined` for a statement that is not in a statement list, like `export const controller = …`.

@param {import('estree').Statement} statement
@returns {import('estree').Statement | undefined}
*/
export const getNextStatement = statement => {
	const statements = getStatementList(statement);
	if (!statements) {
		return;
	}

	return statements[statements.indexOf(statement) + 1];
};

/**
Check if the declarator is `const controller = new AbortController()`, alone in its declaration, without comments that a fix would remove, and in a scope where the global `AbortSignal` is available.

@param {import('estree').VariableDeclarator} declarator
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export const isAbortControllerDeclarator = (declarator, context) => {
	const declaration = declarator.parent;
	const {id, init} = declarator;

	return declaration.type === 'VariableDeclaration'
		&& declaration.kind === 'const'
		&& declaration.declarations.length === 1
		&& id.type === 'Identifier'
		&& isNewExpression(init, {
			name: 'AbortController',
			argumentsLength: 0,
		})
		&& isGlobalIdentifier(init.callee, context)
		&& isGlobalNameAvailable('AbortSignal', id, context)
		&& !hasNonDirectiveComment(context, init)
		&& !(
			id.typeAnnotation
			&& hasNonDirectiveComment(context, id.typeAnnotation)
		);
};

/**
Check if there is a comment between two nodes.

@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} leftNode
@param {import('estree').Node} rightNode
@returns {boolean}
*/
export const hasCommentBetween = (context, leftNode, rightNode) => {
	const {sourceCode} = context;
	const [, leftEnd] = sourceCode.getRange(leftNode);
	const [rightStart] = sourceCode.getRange(rightNode);

	return hasNonDirectiveComment(context, [leftEnd, rightStart]);
};

/**
Check if a statement has no comment inside it or trailing it on the same line.

@param {import('estree').Statement} statement
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export const isStatementCommentFree = (statement, context) =>
	!hasNonDirectiveComment(context, statement)
	&& !getLastTrailingCommentOnSameLine(context, statement, {ignoreDirectives: true});

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

	return getFunctionOnlyExpression(callback);
};

const isSourceReason = (node, sourceSignal, context) => {
	if (!isMemberExpression(node, {
		property: 'reason',
		computed: false,
		optional: false,
	})) {
		return false;
	}

	const object = unwrapTypeScriptExpression(node.object);
	sourceSignal = unwrapTypeScriptExpression(sourceSignal);

	return object.type === 'Identifier'
		&& sourceSignal.type === 'Identifier'
		&& isSameBinding(object, sourceSignal, context);
};

/**
Get the `controller` identifier of a callback that only calls `controller.abort()`. When `sourceSignal` is given, `controller.abort(sourceSignal.reason)` is also accepted.

@param {import('estree').Node | undefined} callback
@param {string} controllerName
@param {import('estree').Node} [sourceSignal]
@param {import('eslint').Rule.RuleContext} [context]
@returns {import('estree').Identifier | undefined}
*/
export const getAbortReference = (callback, controllerName, sourceSignal, context) => {
	const expression = getCallbackExpression(callback);

	if (
		!isCallExpression(expression, {
			optional: false,
		})
		|| !isMemberExpression(expression.callee, {
			property: 'abort',
			computed: false,
			optional: false,
		})
		|| expression.callee.object.type !== 'Identifier'
		|| expression.callee.object.name !== controllerName
		|| !(
			expression.arguments.length === 0
			|| (
				sourceSignal
				&& expression.arguments.length === 1
				&& isSourceReason(expression.arguments[0], sourceSignal, context)
			)
		)
	) {
		return;
	}

	return expression.callee.object;
};

// An alias like `const signal = controller.signal`, or a write through a TypeScript wrapper like `(controller.signal as AbortSignal) = value`
const isSignalAliasOrWrite = node => {
	const {parent} = getOutermostTypeScriptExpression(node);
	return parent.type === 'VariableDeclarator' || parent.type === 'AssignmentExpression';
};

const isReasonSensitiveRead = (node, context) => {
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;

	return isMemberExpression(parent)
		&& parent.object === expression
		&& reasonSensitiveProperties.has(getPropertyName(parent, context.sourceCode.getScope(parent)));
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
		|| isReasonSensitiveRead(parent, context)
		|| isSignalAliasOrWrite(parent)
		|| hasNonDirectiveComment(context, parent)
	) {
		return;
	}

	return parent;
};

/**
Get the `controller.signal` reads that can be replaced with the new signal. Returns `undefined` when an abort reference is not the declared controller, when there are no reads, or when the controller is used in any other way.

@param {import('estree').VariableDeclarator} declarator
@param {Set<import('estree').Identifier>} abortReferences - The `controller` identifiers of the removed `controller.abort()` calls.
@param {import('eslint').Rule.RuleContext} context
@returns {import('estree').MemberExpression[] | undefined}
*/
export const getSignalMembers = (declarator, abortReferences, context) => {
	const {sourceCode} = context;
	const variable = findVariable(sourceCode.getScope(declarator.id), declarator.id);

	for (const abortReference of abortReferences) {
		if (findVariable(sourceCode.getScope(abortReference), abortReference) !== variable) {
			return;
		}
	}

	const signalMembers = [];

	for (const reference of variable.references) {
		const {identifier} = reference;

		if (
			abortReferences.has(identifier)
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

/**
Get the problem for a controller declaration whose initializer can be replaced, with a suggestion that replaces the initializer, renames `controller` to `signal` (and `abortController` to `abortSignal`) when possible, replaces the `controller.signal` reads, and removes the statements that abort the controller.

@param {object} options
@param {import('estree').VariableDeclarator} options.declarator
@param {import('estree').Statement[]} options.statements - The statements after the declaration to remove.
@param {string} options.replacement - The text of the new initializer.
@param {import('estree').MemberExpression[]} options.signalMembers - From `getSignalMembers()`.
@param {string} options.messageId
@param {{messageId: string}} options.suggestion - The suggestion `messageId`.
@param {import('eslint').Rule.RuleContext} context
@returns {import('eslint').Rule.ReportDescriptor}
*/
export const getAbortControllerProblem = ({declarator, statements, replacement, signalMembers, messageId, suggestion}, context) => {
	const {sourceCode} = context;
	const declaration = declarator.parent;
	const {id, init} = declarator;
	const variable = findVariable(sourceCode.getScope(id), id);
	const replacementName = getReplacementName(id.name, variable, signalMembers, context);

	const lastStatement = statements.at(-1);
	const lastTrailingComment = getLastTrailingCommentOnSameLine(context, lastStatement);
	const range = [sourceCode.getRange(declaration)[1], sourceCode.getRange(lastStatement)[1]];
	let problem = getCommentSafeProblem(context, {
		node: id,
		messageId,
		suggest: [
			{
				...suggestion,
				* fix(fixer) {
					yield fixer.replaceText(init, replacement);

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

					yield removeStatement(statements, context, fixer);
				},
			},
		],
	}, range);
	const affectedNodes = [init, id.typeAnnotation, lastTrailingComment, ...signalMembers].filter(Boolean);
	for (const affectedNode of affectedNodes) {
		problem = getCommentSafeProblem(context, problem, affectedNode);
	}

	return problem;
};
