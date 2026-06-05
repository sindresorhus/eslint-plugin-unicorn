import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-array-from-fill';
const messages = {
	[MESSAGE_ID]: 'Use the `Array.from(…, mapFunction)` argument instead of chaining `.fill()`.',
};

const isLengthProperty = property => (
	property.type === 'Property'
	&& !property.computed
	&& !property.method
	&& property.kind === 'init'
	&& property.key.type === 'Identifier'
	&& property.key.name === 'length'
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

const isArrayFromFillMapCall = (node, sourceCode) => (
	isMethodCall(node, {
		methods: ['map', 'flatMap'],
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isArrayFromFillCall(node.callee.object, sourceCode)
);

const isReportedByParentMapCall = (node, context) => {
	const {parent} = node;

	return (
		parent.type === 'MemberExpression'
		&& parent.object === node
		&& parent.parent.type === 'CallExpression'
		&& parent.parent.callee === parent
		&& isArrayFromFillMapCall(parent.parent, context.sourceCode)
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (isArrayFromFillMapCall(callExpression, context.sourceCode)) {
			return {
				node: callExpression.callee.object.callee.property,
				messageId: MESSAGE_ID,
			};
		}

		if (
			isArrayFromFillCall(callExpression, context.sourceCode)
			&& !isReportedByParentMapCall(callExpression, context)
		) {
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
	},
};

export default config;
