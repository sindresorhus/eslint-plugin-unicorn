import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'try-complexity';
const messages = {
	[MESSAGE_ID]: 'Try block has a complexity of {{complexity}}. Maximum allowed is {{max}}.',
};

const DEFAULT_MAXIMUM_COMPLEXITY = 1;

const logicalAssignmentOperators = new Set(['&&=', '||=', '??=']);

const increasesComplexity = node => {
	switch (node.type) {
		case 'AssignmentExpression': {
			return logicalAssignmentOperators.has(node.operator);
		}

		case 'CallExpression':
		case 'MemberExpression': {
			return node.optional === true;
		}

		case 'SwitchCase': {
			return Boolean(node.test);
		}

		default: {
			return true;
		}
	}
};

const isTryBlock = node =>
	node.parent?.type === 'TryStatement'
	&& node.parent.block === node;

const classFieldTypes = new Set(['AccessorProperty', 'PropertyDefinition']);

const getContainingInstanceClassFieldValue = node => {
	let child = node;
	for (let {parent} = node; parent; child = parent, parent = parent.parent) {
		if (functionTypes.includes(parent.type)) {
			return;
		}

		if (
			classFieldTypes.has(parent.type)
			&& !parent.static
			&& parent.value === child
		) {
			return parent;
		}
	}
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			max: {
				type: 'integer',
				minimum: 1,
				description: 'The maximum allowed complexity of a `try` block.',
			},
		},
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {max} = context.options[0];
	const tryBlockStack = [];
	let functionDepth = 0;

	const increaseComplexity = node => {
		if (
			tryBlockStack.length === 0
			|| !increasesComplexity(node)
		) {
			return;
		}

		const classField = getContainingInstanceClassFieldValue(node);
		const classFieldRange = classField && sourceCode.getRange(classField);

		for (const tryBlock of tryBlockStack) {
			if (tryBlock.functionDepth !== functionDepth) {
				continue;
			}

			if (classFieldRange) {
				const tryBlockRange = sourceCode.getRange(tryBlock.block);

				if (
					tryBlockRange[0] <= classFieldRange[0]
					&& classFieldRange[1] <= tryBlockRange[1]
				) {
					continue;
				}
			}

			tryBlock.complexity++;
		}
	};

	context.on(functionTypes, () => {
		functionDepth++;
	});

	context.onExit(functionTypes, () => {
		functionDepth--;
	});

	context.on('BlockStatement', node => {
		if (!isTryBlock(node)) {
			return;
		}

		tryBlockStack.push({
			node: node.parent,
			block: node,
			functionDepth,
			complexity: 1,
		});
	});

	context.onExit('BlockStatement', node => {
		if (tryBlockStack.at(-1)?.block !== node) {
			return;
		}

		const tryBlock = tryBlockStack.pop();
		const {complexity} = tryBlock;

		if (complexity <= max) {
			return;
		}

		return {
			node: tryBlock.node,
			messageId: MESSAGE_ID,
			data: {
				complexity,
				max,
			},
		};
	});

	context.on([
		'AssignmentExpression',
		'AssignmentPattern',
		'CallExpression',
		'CatchClause',
		'ConditionalExpression',
		'DoWhileStatement',
		'ForInStatement',
		'ForOfStatement',
		'ForStatement',
		'IfStatement',
		'LogicalExpression',
		'MemberExpression',
		'SwitchCase',
		'WhileStatement',
	], increaseComplexity);
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Limit the complexity of `try` blocks.',
			recommended: false,
		},
		schema,
		defaultOptions: [{max: DEFAULT_MAXIMUM_COMPLEXITY}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
