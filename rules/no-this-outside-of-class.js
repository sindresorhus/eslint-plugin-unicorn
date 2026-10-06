import {isInTypeQuery} from './ast/index.js';

const MESSAGE_ID = 'no-this-outside-of-class';
const messages = {
	[MESSAGE_ID]: 'Do not use `this` outside of classes.',
};

const isNonArrowFunction = node =>
	node.type === 'FunctionDeclaration'
	|| node.type === 'FunctionExpression';

const hasThisParameter = node =>
	node.params.some(parameter => parameter.type === 'Identifier' && parameter.name === 'this');

const isClassMethodFunction = node =>
	node.parent.type === 'MethodDefinition'
	&& node.parent.value === node;

const isClassFieldValue = (node, child) =>
	(
		node.type === 'AccessorProperty'
		|| node.type === 'PropertyDefinition'
	)
	&& node.value === child;

/**
@param {import('estree').ThisExpression} node
*/
const isAllowedThisBinding = node => {
	let child = node;
	let {parent} = node;

	for (; parent; child = parent, parent = parent.parent) {
		if (parent.type === 'ArrowFunctionExpression') {
			continue;
		}

		if (isNonArrowFunction(parent)) {
			return isClassMethodFunction(parent) || hasThisParameter(parent);
		}

		if (parent.type === 'StaticBlock' || isClassFieldValue(parent, child)) {
			return true;
		}
	}

	return false;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('ThisExpression', node => {
		// A type query has no `this` value at runtime
		// `typeof this` and `typeof this.foo` are a `TSTypeQuery`, the `ThisExpression` is nested in the queried name, so the whole chain is a type position.
		if (isInTypeQuery(node)) {
			return;
		}

		if (isAllowedThisBinding(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
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
			description: 'Disallow `this` outside of classes.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
