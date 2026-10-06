import {findVariable} from '@eslint-community/eslint-utils';
import {
	getOutermostTypeScriptExpression,
	getTypeArgumentsText,
	trackLocalFunctionCalls,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-repeated-call-wrappers';
const messages = {
	[MESSAGE_ID]: 'Every call wraps the result of this function in `{{wrapper}}`. Consider returning the wrapped value directly.',
};

const primitiveConversions = new Set(['String', 'Number', 'Boolean', 'BigInt']);

function getWrapper(call) {
	const wrapper = call.parent;
	const callee = unwrapTypeScriptExpression(call.callee);
	if (
		call.type === 'CallExpression'
		&& !call.optional
		&& !callee.optional
		&& (wrapper.type === 'NewExpression'
			|| (wrapper.type === 'CallExpression' && !wrapper.optional && primitiveConversions.has(wrapper.callee.name)))
		&& wrapper.callee.type === 'Identifier'
		&& wrapper.arguments.length === 1
		&& wrapper.arguments[0] === call
	) {
		return wrapper;
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const getTargets = trackLocalFunctionCalls(context);

	context.onExit('Program', function * () {
		for (const {node, calls} of getTargets()) {
			if (node.async || node.generator || calls.size < 2) {
				continue;
			}

			const callNodes = [...calls];
			const wrappers = callNodes.map(call => getWrapper(call));
			if (wrappers.some(wrapper => !wrapper) || callNodes.some(call => sourceCode.getAncestors(call).includes(node))) {
				continue;
			}

			const [first] = wrappers;
			const wrapperName = first.callee.name;
			const wrapperVariable = findVariable(sourceCode.getScope(first), wrapperName);
			const typeArgumentsText = getTypeArgumentsText(first, context);
			if (
				findVariable(sourceCode.getScope(node), wrapperName) !== wrapperVariable
				|| wrappers.some(wrapper =>
					wrapper.type !== first.type
					|| wrapper.callee.name !== wrapperName
					|| findVariable(sourceCode.getScope(wrapper), wrapperName) !== wrapperVariable
					|| getTypeArgumentsText(wrapper, context) !== typeArgumentsText)
			) {
				continue;
			}

			const {parent} = getOutermostTypeScriptExpression(node);

			yield {
				node: node.id ?? parent.id ?? parent.key ?? node,
				messageId: MESSAGE_ID,
				data: {wrapper: `${first.type === 'NewExpression' ? 'new ' : ''}${wrapperName}()`},
			};
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow repeating the same wrapper at every call to a function.',
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
