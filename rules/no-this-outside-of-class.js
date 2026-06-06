const MESSAGE_ID = 'no-this-outside-of-class';
const messages = {
	[MESSAGE_ID]: 'Do not use `this` outside of classes.',
};

const isNonArrowFunction = node =>
	node.type === 'FunctionDeclaration'
	|| node.type === 'FunctionExpression';

const isClassMethodFunction = node =>
	node.parent.type === 'MethodDefinition'
	&& node.parent.value === node;

const isClassFieldValue = (node, child) =>
	(
		node.type === 'AccessorProperty'
		|| node.type === 'PropertyDefinition'
	)
	&& node.value === child;

/** @param {import('estree').ThisExpression} node */
const isClassThisBinding = node => {
	let child = node;
	let {parent} = node;

	for (; parent; child = parent, parent = parent.parent) {
		if (parent.type === 'ArrowFunctionExpression') {
			continue;
		}

		if (isNonArrowFunction(parent)) {
			return isClassMethodFunction(parent);
		}

		if (parent.type === 'StaticBlock') {
			return true;
		}

		if (isClassFieldValue(parent, child)) {
			return true;
		}
	}

	return false;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ThisExpression', node => {
		if (isClassThisBinding(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
