import {isMethodCall} from './ast/index.js';
import {isNodeMatches, shouldSkipKnownNonArrayReceiver} from './utils/index.js';

const MESSAGE_ID = 'no-array-front-mutation';
const messages = {
	[MESSAGE_ID]: 'Avoid front-of-array mutation with `Array#{{method}}()`.',
};

const ignoredUnshiftCallees = [
	'stream.unshift',
	'this.unshift',
	'this.stream.unshift',
	'process.stdin.unshift',
	'process.stdout.unshift',
	'process.stderr.unshift',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['shift', 'unshift'],
			optionalCall: false,
			computed: false,
		})) {
			return;
		}

		const {object, property} = callExpression.callee;
		const {name: method} = property;

		if (
			(method === 'unshift' && isNodeMatches(callExpression.callee, ignoredUnshiftCallees))
			|| shouldSkipKnownNonArrayReceiver(object, context)
		) {
			return;
		}

		return {
			node: property,
			messageId: MESSAGE_ID,
			data: {method},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow front-of-array mutation.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
