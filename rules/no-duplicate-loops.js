import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-duplicate-loops';
const messages = {
	[MESSAGE_ID]: 'Do not use `{{method}}` in a `for…of` loop header. Move the operation into the loop body to avoid iterating twice.',
};

const duplicateIterationMethods = [
	'filter',
	'map',
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ForOfStatement', node => {
		const {right} = node;

		if (!isMethodCall(right, {
			methods: duplicateIterationMethods,
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		return {
			node: right.callee.property,
			messageId: MESSAGE_ID,
			data: {
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
			description: 'Disallow duplicate loops in `for…of` loop headers.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
