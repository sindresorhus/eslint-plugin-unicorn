'use strict';

const isBuiltin = require('is-builtin-module');
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
	if (isBuiltin(source)) {
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

function getInvalidBlankLinesReport(nodePrev, nodeNext, context) {
	if (nodePrev === null) {
		return null;
	}

	const prevEndLine = nodePrev.loc.end.line;
	const nextStartLine = nodeNext.loc.end.line;

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

		// Ignore lines with comments on them
		if (type === 'Line') {
			continue;
		}

		// Ignore block comments
		if (type === 'Block') {
			continue;
		}

		return {
			messageId: MESSAGE_ID_BLANKLINES
		};
	}

	return null;
}

function getInvalidOrderReport(prev, next) {
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

function swapNodeLocation({
	fixer,
	nodePrev,
	nodeNext,
	sourceCode
}) {
	const tokensBetween = sourceCode.getTokensBetween(nodePrev, nodeNext);

	if (tokensBetween && tokensBetween.length > 0) {
		return;
	}

	const source = sourceCode.getText();
	let [insertStart, insertEnd] = nodePrev.range;

	// Grab the node and all comments and whitespace before the node
	const start = nodePrev.range[1];
	const end = nodeNext.range[1];

	let text = source.substring(start, end);

	// Preserve newline previously between nodes
	if (source[start] === '\n') {
		text = text.substring(1) + '\n';
	}

	// Preserve blank line previously between nodes
	if (source.length >= (start + 1) && source[start + 1] === '\n') {
		text = text.substring(1) + '\n';
	}

	// Preserve newline that was previously before nodes
	if ((insertStart - 1) > 0 && source[insertStart - 1] === '\n') {
		insertStart -= 1;
	}

	text = text.replace(/\n\n+/, '\n');

	console.log('AAA', {
		nodePrev: nodePrev.range,
		nodeNext: nodeNext.range,
		start,
		end,
		insertStart,
		insertEnd,
		text,
		source,
	});

	return [
		fixer.insertTextBeforeRange([insertStart, insertEnd], text),
		fixer.removeRange([start, end])
	];
}

function removeBlankLines({
	fixer,
	nodePrev,
	nodeNext,
	sourceCode
}) {
	const source = sourceCode.getText();

	const start = nodePrev.range[1];
	const end = nodeNext.range[0];

	let text = source.substring(start, end);
	text = text.replace(/\n\n+/, '\n');

	return fixer.replaceTextRange([start, end], text);
}

const create = context => {
	const {options} = context;
	const sourceCode = context.getSourceCode();
	const {
		allowBlankLines = false
	} = options[0] || {};

	let orderPrev = null;
	let nodePrev = null;

	return {
		'Program > VariableDeclaration[declarations.length=1] > VariableDeclarator:matches([id.type="Identifier"],[id.type="ObjectPattern"]) > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const nodeNext = node.parent.parent;
			const orderNext = getOrder(node.arguments[0].value);

			const message = getInvalidOrderReport(orderPrev, orderNext);

			if (message) {
				context.report({
					node,
					fix: fixer => {
						return swapNodeLocation({
							fixer,
							nodeNext,
							nodePrev,
							sourceCode
						});
					},
					...message
				});
			}

			if (!allowBlankLines) {
				const blankLinesMessage = getInvalidBlankLinesReport(nodePrev, nodeNext, context);
				if (blankLinesMessage) {
					context.report({
						node,
						fix: fixer => {
							return removeBlankLines({
								fixer,
								nodeNext,
								nodePrev,
								sourceCode
							});
						},
						...blankLinesMessage
					});
				}
			}

			orderPrev = orderNext;
			nodePrev = nodeNext;
		},
		'Program > ExpressionStatement > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const nodeNext = node.parent.parent;
			const nextOrder = getOrder(node.arguments[0].value);

			const message = getInvalidOrderReport(orderPrev, nextOrder);

			if (message) {
				context.report({
					node,
					fix: fixer => {
						return swapNodeLocation({
							fixer,
							nodeNext,
							nodePrev,
							sourceCode
						});
					},
					...message
				});
			}

			if (!allowBlankLines) {
				const blankLinesMessage = getInvalidBlankLinesReport(nodePrev, nodeNext, context);
				if (blankLinesMessage) {
					context.report({
						node,
						fix: fixer => {
							return removeBlankLines({
								fixer,
								nodeNext,
								nodePrev,
								sourceCode
							});
						},
						...blankLinesMessage
					});
				}
			}

			orderPrev = nextOrder;
			nodePrev = nodeNext;
		},
		'Program > ImportDeclaration': node => {
			const nodeNext = node;
			const orderNext = getOrder(node.source.value);

			const report = getInvalidOrderReport(orderPrev, orderNext);

			if (report) {
				context.report({
					node: node.source,
					fix: fixer => {
						return swapNodeLocation({
							fixer,
							nodeNext: node,
							nodePrev,
							sourceCode
						});
					},
					...report
				});
			}

			if (!allowBlankLines) {
				const blankLinesReport = getInvalidBlankLinesReport(nodePrev, nodeNext, context);
				if (blankLinesReport) {
					context.report({
						node: node.source,
						fix: fixer => {
							return removeBlankLines({
								fixer,
								nodeNext: node,
								nodePrev,
								sourceCode
							});
						},
						...blankLinesReport
					});
				}
			}

			orderPrev = orderNext;
			nodePrev = node;
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
		fixable: 'code',
		messages: {
			[MESSAGE_ID_BLANKLINES]: 'Imports should be on adjacent lines',
			[MESSAGE_ID_DEPTH]: 'Relative paths should be sorted by depth',
			[MESSAGE_ID_GROUP]: '{{earlier}} imports should come before {{later}} imports',
			[MESSAGE_ID_ORDER]: 'Imports should be sorted alphabetically'
		}
	}
};
