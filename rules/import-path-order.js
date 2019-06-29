'use strict';

const coreModules = require('resolve/lib/core');
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID_BLANKLINES = 'import-path-blanklines';
const MESSAGE_ID_DEPTH = 'import-path-order-depth';
const MESSAGE_ID_GROUP = 'import-path-order-group';
const MESSAGE_ID_ORDER = 'import-path-order';

const GROUP_BUILTIN = 1;
const GROUP_ABSOLUTE = 2;
const GROUP_PARENT = 3;
const GROUP_SIBLING = 4;

const GROUP_NAMES = {
	[GROUP_BUILTIN]: 'Built-in',
	[GROUP_ABSOLUTE]: 'Absolute',
	[GROUP_PARENT]: 'Relative',
	[GROUP_SIBLING]: 'Sibling'
};

function getOrder(source) {
	if (coreModules[source]) {
		return {
			name: source,
			group: GROUP_BUILTIN,
			depth: 0
		};
	}

	if (source.match(/^\.\//)) {
		return {
			name: source,
			group: GROUP_SIBLING,
			depth: 0
		};
	}

	const relative = source.match(/^((\.\.\/)+)/);
	if (relative) {
		return {
			name: source,
			group: GROUP_PARENT,
			depth: relative[1].split('..').length
		};
	}

	return {
		name: source,
		group: GROUP_ABSOLUTE,
		depth: 0
	};
}

function getInvalidBlankLinesMessage(prev, next, context) {
	if (prev === null) {
		return null;
	}

	const prevEndLine = prev.loc.end.line;
	const nextStartLine = next.loc.end.line;

	if (prevEndLine + 1 === nextStartLine) {
		return null;
	}

	const sourceCode = context.getSourceCode();

	for (let i = prevEndLine + 1; i < nextStartLine; i++) {
		const index = sourceCode.getIndexFromLoc({
			line: prevEndLine + 1,
			column: 0
		});

		const lineContents = sourceCode.getTokenByRangeStart(index, {includeComments: true});
		const {type} = lineContents || {};

		if (type === 'Line') {
			continue;
		}

		if (type === 'Block') {
			continue;
		}

		return {
			messageId: MESSAGE_ID_BLANKLINES
		};
	}

	return null;
}

function getInvalidOrderMessage(prev, next) {
	if (prev === null) {
		return null;
	}

	if (prev.group !== next.group) {
		if (prev.group > next.group) {
			return {
				messageId: MESSAGE_ID_GROUP,
				data: {
					earlier: GROUP_NAMES[next.group],
					later: GROUP_NAMES[prev.group].toLowerCase()
				}
			};
		}

		return null;
	}

	if (prev.depth !== next.depth) {
		if (prev.depth < next.depth) {
			return {
				messageId: MESSAGE_ID_DEPTH
			};
		}

		return null;
	}

	// TODO: Case insensitive
	if (next.name < prev.name) {
		return {
			messageId: MESSAGE_ID_ORDER
		};
	}

	return null;
}

const create = context => {
	const {options} = context;
	const {
		allowBlankLines = false
	} = options[0] || {};

	let prevOrder = null;
	let prevNode = null;

	return {
		'Program > VariableDeclaration[declarations.length=1] > VariableDeclarator:matches([id.type="Identifier"],[id.type="ObjectPattern"]) > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const nextOrder = getOrder(node.arguments[0].value);

			const message = getInvalidOrderMessage(prevOrder, nextOrder);

			if (message) {
				context.report({
					node,
					...message
				});
			}

			if (!allowBlankLines) {
				const blankLinesMessage = getInvalidBlankLinesMessage(prevNode, node, context);
				if (blankLinesMessage) {
					context.report({
						node,
						...blankLinesMessage
					});
				}
			}

			prevOrder = nextOrder;
			prevNode = node;
		},
		'Program > ImportDeclaration[specifiers.length>0]': node => {
			const next = getOrder(node.source.value);

			const message = getInvalidOrderMessage(prevOrder, next);

			if (message) {
				context.report({
					node: node.source,
					...message
				});
			}

			if (!allowBlankLines) {
				const blankLinesMessage = getInvalidBlankLinesMessage(prevNode, node, context);
				if (blankLinesMessage) {
					context.report({
						node,
						...blankLinesMessage
					});
				}
			}

			prevOrder = next;
			prevNode = node;
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		messages: {
			[MESSAGE_ID_BLANKLINES]: 'Imports should not have blank lines between them',
			[MESSAGE_ID_DEPTH]: 'Relative paths should be sorted by depth',
			[MESSAGE_ID_GROUP]: '{{earlier}} imports should come before {{later}} imports',
			[MESSAGE_ID_ORDER]: 'Imports should be sorted alphabetically'
		}
	}
};
