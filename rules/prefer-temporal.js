import {getPropertyName, getStaticValue} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';

const MESSAGE_ID = 'prefer-temporal';
const MESSAGE_ID_PARSE = 'prefer-temporal/parse';
const MESSAGE_ID_MONTH = 'prefer-temporal/month';
const MESSAGE_ID_SUGGESTION = 'prefer-temporal/suggestion';
const DATE_MAX_TIME = 8_640_000_000_000_000;
const DATE_METHODS = new Set([
	'getDate',
	'getDay',
	'getFullYear',
	'getHours',
	'getMilliseconds',
	'getMinutes',
	'getMonth',
	'getSeconds',
	'getTime',
	'getTimezoneOffset',
	'getUTCDate',
	'getUTCDay',
	'getUTCFullYear',
	'getUTCHours',
	'getUTCMilliseconds',
	'getUTCMinutes',
	'getUTCMonth',
	'getUTCSeconds',
	'getYear',
	'setDate',
	'setFullYear',
	'setHours',
	'setMilliseconds',
	'setMinutes',
	'setMonth',
	'setSeconds',
	'setTime',
	'setUTCDate',
	'setUTCFullYear',
	'setUTCHours',
	'setUTCMilliseconds',
	'setUTCMinutes',
	'setUTCMonth',
	'setUTCSeconds',
	'setYear',
	'toDateString',
	'toGMTString',
	'toISOString',
	'toJSON',
	'toLocaleDateString',
	'toLocaleString',
	'toLocaleTimeString',
	'toString',
	'toTimeString',
	'toUTCString',
	'valueOf',
]);
const messages = {
	[MESSAGE_ID]: 'Prefer `Temporal` over `{{description}}`.',
	[MESSAGE_ID_PARSE]: 'Prefer `Temporal` over `{{description}}`. Parsing date strings with `Date` is inconsistent across implementations.',
	[MESSAGE_ID_MONTH]: 'Prefer `Temporal` over `{{description}}`. The month argument of `Date` is zero-indexed, which is error-prone.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

// A handler that always reports the matched node with a fixed message and description.
const report = (messageId, description) => ({node}) => ({node, messageId, data: {description}});

// Build `suggest` entries that replace `node` wholesale, unless doing so would drop a comment.
function replacementSuggestions(node, context, replacements) {
	if (context.sourceCode.getCommentsInside(node).length > 0) {
		return;
	}

	return replacements.map(replacement => ({
		messageId: MESSAGE_ID_SUGGESTION,
		data: {replacement},
		fix: fixer => fixer.replaceText(node, replacement),
	}));
}

function getNewDateProblem({node}, context) {
	const {sourceCode} = context;
	const {arguments: argumentNodes} = node;

	// `new Date()` — the current moment.
	if (argumentNodes.length === 0) {
		return {
			node,
			messageId: MESSAGE_ID,
			data: {description: 'new Date()'},
			suggest: replacementSuggestions(node, context, [
				'Temporal.Now.instant()',
				'Temporal.Now.zonedDateTimeISO()',
				'Temporal.Now.plainDateTimeISO()',
			]),
		};
	}

	// `new Date(year, month, …)` — calendar parts, with the infamous zero-indexed month.
	if (argumentNodes.length > 1) {
		return {node, messageId: MESSAGE_ID_MONTH, data: {description: 'new Date(…)'}};
	}

	const [argumentNode] = argumentNodes;
	if (argumentNode.type === 'SpreadElement') {
		return {node, messageId: MESSAGE_ID, data: {description: 'new Date(…)'}};
	}

	const staticValue = getStaticValue(argumentNode, sourceCode.getScope(argumentNode));

	// `new Date(milliseconds)` — a number argument is always epoch milliseconds.
	// `Temporal.Instant.fromEpochMilliseconds()` throws on a non-integer or out-of-range value, whereas `Date` returns an invalid date or truncates. The whole valid epoch-millisecond range fits within the safe integers, so only suggest it for those.
	if (
		staticValue
		&& Number.isSafeInteger(staticValue.value)
		&& Math.abs(staticValue.value) <= DATE_MAX_TIME
	) {
		return {
			node,
			messageId: MESSAGE_ID,
			data: {description: 'new Date(…)'},
			suggest: replacementSuggestions(node, context, [
				`Temporal.Instant.fromEpochMilliseconds(${sourceCode.getText(argumentNode)})`,
			]),
		};
	}

	// `new Date(dateString)` — string parsing is inconsistent.
	if (staticValue && typeof staticValue.value === 'string') {
		return {node, messageId: MESSAGE_ID_PARSE, data: {description: 'new Date(…)'}};
	}

	// Unknown single argument; it could be a number, a string, or a `Date`.
	return {node, messageId: MESSAGE_ID, data: {description: 'new Date(…)'}};
}

function getDateNowProblem({node}, context) {
	const problem = {node, messageId: MESSAGE_ID, data: {description: 'Date.now()'}};

	// `Date.now()` and `Temporal.Now.instant().epochMilliseconds` both return the epoch milliseconds as a number, so this is an exact replacement.
	if (context.sourceCode.getCommentsInside(node).length === 0) {
		problem.fix = fixer => fixer.replaceText(node, 'Temporal.Now.instant().epochMilliseconds');
	}

	return problem;
}

// Whether the type is the `Date` instance type (not the `Date` constructor, whose symbol is `DateConstructor`).
const isDateType = type =>
	(type.isUnion() || type.isIntersection() ? type.types : [type]).some(part => {
		const symbol = part.getSymbol() ?? part.aliasSymbol;
		return symbol?.getName() === 'Date';
	});

// `date.getFullYear()`, `date.toISOString()`, … on a value typed as `Date`. Requires type information.
function getDateMethodCallProblem(node, context, services) {
	const {callee} = node;
	if (
		callee.type !== 'MemberExpression'
		|| !isDateType(services.getTypeAtLocation(callee.object))
	) {
		return;
	}

	const methodName = getPropertyName(callee, context.sourceCode.getScope(callee));
	if (!DATE_METHODS.has(methodName)) {
		return;
	}

	const method = `Date#${methodName}()`;
	return {node: callee, messageId: MESSAGE_ID, data: {description: method}};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkDateNow, checkReferences, checkMethods} = context.options[0];

	const listen = (object, type, handle, filter) => {
		const tracker = new GlobalReferenceTracker({
			object, type, filter, handle,
		});
		tracker.listen({context});
	};

	listen('Date', GlobalReferenceTracker.CONSTRUCT, getNewDateProblem);
	listen('Date', GlobalReferenceTracker.CALL, report(MESSAGE_ID, 'Date()'));
	listen('Date.parse', GlobalReferenceTracker.CALL, report(MESSAGE_ID_PARSE, 'Date.parse(…)'));
	listen('Date.UTC', GlobalReferenceTracker.CALL, report(MESSAGE_ID_MONTH, 'Date.UTC(…)'));

	if (checkDateNow) {
		listen('Date.now', GlobalReferenceTracker.CALL, getDateNowProblem);
	}

	if (checkReferences) {
		// Bare value-uses of `Date`, for example `x instanceof Date`. Construction, call, and
		// static-method references are already handled above, so skip those to avoid double-reporting.
		listen('Date', GlobalReferenceTracker.READ, report(MESSAGE_ID, 'Date'), ({node}) => {
			const {parent} = node;
			return !(
				((parent.type === 'NewExpression' || parent.type === 'CallExpression') && parent.callee === node)
				|| (parent.type === 'MemberExpression' && parent.object === node)
			);
		});
	}

	// Detecting methods on `Date` instances requires type information, so it only works under type-aware linting.
	const {parserServices} = context.sourceCode;
	if (checkMethods && parserServices?.program) {
		context.on('CallExpression', node => getDateMethodCallProblem(node, context, parserServices));
	}
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkDateNow: {
				type: 'boolean',
				description: 'Whether to also flag `Date.now()`.',
			},
			checkReferences: {
				type: 'boolean',
				description: 'Whether to also flag bare references to `Date`, such as `x instanceof Date`.',
			},
			checkMethods: {
				type: 'boolean',
				description: 'Whether to also flag methods called on `Date` instances, such as `date.getFullYear()`. Requires TypeScript type information.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Temporal` over `Date`.',
			// TODO: Move to the `recommended` config once this plugin targets Node.js 26, which ships `Temporal` unflagged.
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkDateNow: false, checkReferences: false, checkMethods: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
