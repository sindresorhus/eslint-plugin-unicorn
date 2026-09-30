import {unwrapTypeScriptExpression} from './utils/index.js';
import {isFunction} from './ast/index.js';

const MESSAGE_ID_IDENTIFIER = 'identifier';
const MESSAGE_ID_NON_IDENTIFIER = 'non-identifier';
const messages = {
	[MESSAGE_ID_IDENTIFIER]: 'Do not use an object literal as default for parameter `{{parameter}}`.',
	[MESSAGE_ID_NON_IDENTIFIER]: 'Do not use an object literal as default.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('AssignmentPattern', node => {
		// `x = {…} as const`, the wrappers have no runtime effect
		const right = unwrapTypeScriptExpression(node.right);
		// A TypeScript parameter property (`constructor(public x = {…})`) wraps the parameter
		const parameter = node.parent.type === 'TSParameterProperty' ? node.parent : node;
		const functionNode = parameter.parent;
		if (!(
			right.type === 'ObjectExpression'
			&& right.properties.length > 0
			&& isFunction(functionNode)
			&& functionNode.params.includes(parameter)
		)) {
			return;
		}

		const {left} = node;

		if (left.type === 'Identifier') {
			return {
				node: left,
				messageId: MESSAGE_ID_IDENTIFIER,
				data: {parameter: left.name},
			};
		}

		return {
			node: right,
			messageId: MESSAGE_ID_NON_IDENTIFIER,
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow the use of objects as default parameters.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
