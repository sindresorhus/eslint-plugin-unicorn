import {isMethodCall} from './ast/index.js';
import {isIteratorExpression, unwrapExpression} from './shared/iterator-helpers.js';

const MESSAGE_ID = 'no-duplicate-loops';
const messages = {
	[MESSAGE_ID]: 'Do not use `.{{method}}()` directly in a `{{loopKind}}` loop header. It creates an intermediate array before the loop.',
};

const duplicateIterationMethods = [
	'filter',
	'map',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ForOfStatement', node => {
		const right = unwrapExpression(node.right);

		if (!isMethodCall(right, {
			methods: duplicateIterationMethods,
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		if (isIteratorExpression(right.callee.object, context)) {
			return;
		}

		return {
			node: right.callee.property,
			messageId: MESSAGE_ID,
			data: {
				loopKind: node.await ? 'for await…of' : 'for…of',
				method: right.callee.property.name,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `.map()` and `.filter()` in `for…of` and `for await…of` loop headers.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
