import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-flat-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer a flat `Math.{{method}}()` call instead of nested calls.',
};

const mathMethods = ['min', 'max'];

const isMathMinMaxCall = (node, method) => isMethodCall(node, {
	object: 'Math',
	method,
	optionalCall: false,
	optionalMember: false,
});

const getMathMinMaxMethod = node => {
	for (const method of mathMethods) {
		if (isMathMinMaxCall(node, method)) {
			return method;
		}
	}
};

const hasNestedMathMinMaxCall = (callExpression, method) => callExpression.arguments.some(argument => isMathMinMaxCall(argument, method));

const getFlattenedArguments = (callExpression, method) => {
	const flattenedArguments = [];

	for (const argument of callExpression.arguments) {
		if (isMathMinMaxCall(argument, method)) {
			flattenedArguments.push(...getFlattenedArguments(argument, method));
			continue;
		}

		flattenedArguments.push(argument);
	}

	return flattenedArguments;
};

const isNestedInSameMathMinMaxCall = (callExpression, method) => {
	const {parent} = callExpression;

	return isMathMinMaxCall(parent, method) && parent.arguments.includes(callExpression);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', callExpression => {
		const method = getMathMinMaxMethod(callExpression);

		if (
			!method
			|| !hasNestedMathMinMaxCall(callExpression, method)
			|| isNestedInSameMathMinMaxCall(callExpression, method)
		) {
			return;
		}

		return {
			node: callExpression,
			messageId: MESSAGE_ID,
			data: {
				method,
			},
			* fix(fixer, {abort}) {
				if (sourceCode.getCommentsInside(callExpression).length > 0) {
					return abort();
				}

				const calleeText = sourceCode.getText(callExpression.callee);
				const argumentsText = getFlattenedArguments(callExpression, method)
					.map(argument => sourceCode.getText(argument))
					.join(', ');

				yield fixer.replaceText(callExpression, `${calleeText}(${argumentsText})`);
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
			description: 'Prefer flat `Math.min()` and `Math.max()` calls over nested calls.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
