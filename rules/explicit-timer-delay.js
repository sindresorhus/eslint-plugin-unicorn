import {isLiteral} from './ast/index.js';
import {getParenthesizedRange} from './utils/index.js';

const MODE_ALWAYS = 'always';
const MODE_NEVER = 'never';

const MESSAGE_ID_MISSING_DELAY = 'missing-delay';
const MESSAGE_ID_REDUNDANT_DELAY = 'redundant-delay';

const messages = {
	[MESSAGE_ID_MISSING_DELAY]: '`{{name}}` should have an explicit delay argument.',
	[MESSAGE_ID_REDUNDANT_DELAY]: '`{{name}}` should not have an explicit delay of `0`.',
};

const timerFunctions = new Set(['setTimeout', 'setInterval']);
const globalObjects = new Set(['window', 'globalThis', 'global', 'self']);

/**
Check if a call expression is a timer function call.
@param {import('estree').CallExpression} node - The call expression node.
@param {import('eslint').SourceCode} sourceCode
@returns {{isTimer: boolean, name?: string}} Object with isTimer flag and function name.
*/
const checkTimerCall = (node, sourceCode) => {
	const {callee} = node;

	if (
		callee.type === 'Identifier'
		&& timerFunctions.has(callee.name)
		&& sourceCode.isGlobalReference(callee)
	) {
		return {isTimer: true, name: callee.name};
	}

	if (
		callee.type === 'MemberExpression'
		&& !callee.computed
		&& callee.property.type === 'Identifier'
		&& timerFunctions.has(callee.property.name)
	) {
		const {object} = callee;

		if (
			object.type === 'Identifier'
			&& globalObjects.has(object.name)
			&& sourceCode.isGlobalReference(object)
		) {
			return {isTimer: true, name: callee.property.name};
		}

		return {isTimer: false};
	}

	return {isTimer: false};
};

/**
  Check if the delay argument is explicitly zero.
  @param {import('estree').Node} node - The argument node.
  @returns {boolean} True if the argument is zero.
  */
const isZeroDelay = node =>
	isLiteral(node, 0)
	|| (node.type === 'UnaryExpression' && node.operator === '-' && isLiteral(node.argument, 0));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const mode = context.options[0] || MODE_ALWAYS;
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (node.optional) {
			return;
		}

		const {isTimer, name} = checkTimerCall(node, sourceCode);

		if (!isTimer) {
			return;
		}

		const {arguments: arguments_} = node;
		const hasDelayArgument = arguments_.length >= 2;

		if (mode === MODE_ALWAYS && !hasDelayArgument) {
			if (arguments_.length === 0) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name},
			};

			const [firstArgument] = arguments_;
			if (firstArgument && firstArgument.type !== 'SpreadElement') {
				problem.fix = fixer => fixer.insertTextAfterRange(
					getParenthesizedRange(firstArgument, context), ', 0',
				);
			}

			return problem;
		}

		if (mode === MODE_NEVER && hasDelayArgument) {
			const delayArgument = arguments_[1];

			if (isZeroDelay(delayArgument)) {
				const problem = {
					node: delayArgument,
					messageId: MESSAGE_ID_REDUNDANT_DELAY,
					data: {name},
				};

				if (arguments_.length === 2) {
					problem.fix = function (fixer) {
						const [firstArgument] = arguments_;
						const [, firstArgumentEnd] = getParenthesizedRange(firstArgument, context);
						const [, delayArgumentEnd] = getParenthesizedRange(delayArgument, context);
						return fixer.removeRange([firstArgumentEnd, delayArgumentEnd]);
					};
				}

				return problem;
			}
		}
	});
};

const schema = [
	{
		enum: [MODE_ALWAYS, MODE_NEVER],
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce or disallow explicit `delay` argument for `setTimeout()` and `setInterval()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [MODE_ALWAYS],
		messages,
	},
};

export default config;
