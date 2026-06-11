import {isFunction, isMethodCall, isStringLiteral} from './ast/index.js';
import {unwrapExpression} from './utils/comparison.js';

const MESSAGE_ID = 'no-unsafe-string-replacement';
const messages = {
	[MESSAGE_ID]: 'Do not use a non-literal replacement value with `String#{{method}}()`.',
};

const isStaticTemplateLiteral = node =>
	node.type === 'TemplateLiteral'
	&& node.expressions.length === 0;

const isAllowedReplacement = node => {
	node = unwrapExpression(node);

	return isStringLiteral(node)
		|| isStaticTemplateLiteral(node)
		|| isFunction(node);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			argumentsLength: 2,
		})) {
			return;
		}

		const [, replacement] = node.arguments;
		if (isAllowedReplacement(replacement)) {
			return;
		}

		return {
			node: replacement,
			messageId: MESSAGE_ID,
			data: {
				method: node.callee.property.name,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
