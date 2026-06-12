import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-array-from-fill';
const messages = {
	[MESSAGE_ID]: 'Use the `Array.from(…, mapFunction)` argument instead of chaining `.fill()`.',
};

const isLengthPropertyKey = key => (
	(
		key.type === 'Identifier'
		&& key.name === 'length'
	)
	|| (
		key.type === 'Literal'
		&& key.value === 'length'
	)
);

const isLengthProperty = property => (
	property.type === 'Property'
	&& !property.computed
	&& !property.method
	&& property.kind === 'init'
	&& isLengthPropertyKey(property.key)
);

const isArrayFromLengthCall = (node, sourceCode) => (
	isMethodCall(node, {
		object: 'Array',
		method: 'from',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& sourceCode.isGlobalReference(node.callee.object)
	&& node.arguments[0].type === 'ObjectExpression'
	&& node.arguments[0].properties.length === 1
	&& isLengthProperty(node.arguments[0].properties[0])
);

const isArrayFromFillCall = (node, sourceCode) => (
	isMethodCall(node, {
		method: 'fill',
		maximumArguments: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isArrayFromLengthCall(node.callee.object, sourceCode)
);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (isArrayFromFillCall(callExpression, context.sourceCode)) {
			return {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID,
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `.fill()` after `Array.from({length: …})`.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
