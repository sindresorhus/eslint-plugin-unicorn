import {isMethodCall} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';

const MESSAGE_ID = 'prefer-array-last-methods';
const SUGGESTION_ID = 'replace';

const replacements = new Map([
	['find', 'findLast'],
	['findIndex', 'findLastIndex'],
	['indexOf', 'lastIndexOf'],
	['reduce', 'reduceRight'],
]);

const reversingMethods = [
	'reverse',
	'toReversed',
];

const messages = {
	[MESSAGE_ID]: 'Prefer `Array#{{replacement}}()` over `Array#{{reversingMethod}}().{{method}}()`.',
	[SUGGESTION_ID]: 'Replace `.{{reversingMethod}}().{{method}}()` with `.{{replacement}}()`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: [...replacements.keys()],
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const reversingCallExpression = callExpression.callee.object;

		if (!isMethodCall(reversingCallExpression, {
			methods: reversingMethods,
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const method = callExpression.callee.property.name;
		const replacement = replacements.get(method);
		const reversingMethod = reversingCallExpression.callee.property.name;
		const data = {
			method,
			replacement,
			reversingMethod,
		};
		const problem = {
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			data,
		};

		if (sourceCode.getCommentsInside(callExpression).length === 0) {
			problem.suggest = [
				{
					messageId: SUGGESTION_ID,
					data,
					* fix(fixer) {
						yield fixer.replaceText(callExpression.callee.property, replacement);
						yield removeMethodCall(fixer, reversingCallExpression, context);
					},
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer last-oriented array methods over `Array#reverse()` or `Array#toReversed()` followed by a method.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
