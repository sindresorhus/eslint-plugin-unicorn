import {getStaticValue} from '@eslint-community/eslint-utils';
import {isCallExpression} from './ast/index.js';
import {
	hasPotentiallyMutableMemberAccess,
	isGlobalIdentifier,
	getStaticValueIfNoSideEffects,
} from './utils/index.js';
import {
	getAbortControllerProblem,
	getAbortReference,
	getNextStatement,
	getSignalMembers,
	isAbortControllerDeclarator,
} from './shared/abort-controller.js';

const MESSAGE_ID = 'prefer-abort-signal-timeout';
const SUGGESTION_ID = 'prefer-abort-signal-timeout/suggestion';
const MAX_SET_TIMEOUT_DELAY = (2 ** 31) - 1;

const messages = {
	[MESSAGE_ID]: 'Prefer `AbortSignal.timeout()` over manually aborting an `AbortController` with `setTimeout()`.',
	[SUGGESTION_ID]: 'Replace with `AbortSignal.timeout()`.',
};

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

const isInsideRange = (node, range, sourceCode) => {
	const nodeRange = sourceCode.getRange(node);
	return nodeRange[0] >= range[0] && nodeRange[1] <= range[1];
};

const isValidAbortSignalTimeoutDelay = (node, context) => {
	const staticValue = getStaticValueIfNoSideEffects(node, context);
	if (
		!staticValue
		&& hasPotentiallyMutableMemberAccess(node, context)
		&& getStaticValue(node, context.sourceCode.getScope(node))
	) {
		return false;
	}

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

const createProblem = (declarator, context) => {
	if (!isAbortControllerDeclarator(declarator, context)) {
		return;
	}

	const {sourceCode} = context;
	const declaration = declarator.parent;
	const timeoutStatement = getNextStatement(declaration);
	const timeoutCall = getTimeoutCall(timeoutStatement, context);
	if (!timeoutCall) {
		return;
	}

	const [callback, delay] = timeoutCall.arguments;
	const abortReference = getAbortReference(callback, declarator.id.name);
	if (!abortReference) {
		return;
	}

	const signalMembers = getSignalMembers(declarator, new Set([abortReference]), context);
	if (
		!signalMembers
		|| shouldSkipDelay(delay, signalMembers, sourceCode.getRange(timeoutStatement), context)
	) {
		return;
	}

	return getAbortControllerProblem({
		declarator,
		statements: [timeoutStatement],
		replacement: `AbortSignal.timeout(${sourceCode.getText(delay)})`,
		signalMembers,
		messageId: MESSAGE_ID,
		suggestion: {messageId: SUGGESTION_ID},
	}, context);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('VariableDeclarator', node => createProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
