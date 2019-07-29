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

const COMPARATOR_CASE_SENSITIVE = 'case-sensitive';
const COMPARATOR_CASE_INSENSITIVE = 'case-insensitive';
const COMPARATOR_CASE_PARTS = 'parts';
const COMPARATOR_CASE_OFF = 'off';

function getOrder(name, partsRegex) {
	const parts = {};
	partsRegex.forEach(regex => {
		parts[regex] = name.split(new RegExp(regex));
	});

	if (isBuiltin(name)) {
		return {
			name,
			group: GROUP_BUILTIN,
			depth: 0,
			parts
		};
	}

	if (name.match(/^\.\//)) {
		return {
			name,
			group: GROUP_SIBLING,
			depth: 0,
			parts
		};
	}

	const relative = name.match(/^((\.\.\/)+)/);
	if (relative) {
		return {
			name,
			group: GROUP_PARENT,
			depth: relative[1].split('..').length,
			parts
		};
	}

	return {
		name,
		group: GROUP_ABSOLUTE,
		depth: 0,
		parts
	};
}

function getInvalidBlankLinesReport(nodePrev, nodeNext, context) {
	if (nodePrev === null) {
		return null;
	}

	const prevEndLine = nodePrev.loc.end.line;
	const nextStartLine = nodeNext.loc.start.line;

	if (prevEndLine + 1 === nextStartLine) {
		return null;
	}

	const sourceCode = context.getSourceCode();

	for (let line = prevEndLine + 1; line < nextStartLine; line++) {
		const index = sourceCode.getIndexFromLoc({
			line: prevEndLine + 1,
			column: 0
		});

		const lineContents = sourceCode.getTokenByRangeStart(index, {includeComments: true});
		const {
			type: contentType,
			loc: contentLoc
		} = lineContents || {};

		const {
			end: contentEnd
		} = contentLoc || {};

		const {
			line: contentEndLine
		} = contentEnd || {};

		// Ignore lines with comments on them but only if they actually end on
		// the line we are checking. This catches the strange case of:
		//
		// const b = require('b');
		// // Comment with blank line afterward
		//
		// const a = require('a');
		//
		if (contentType === 'Line' && line === contentEndLine) {
			continue;
		}

		// Ignore block comments
		if (contentType === 'Block') {
			continue;
		}

		const reportLocation = {
			start: {
				line,
				column: 0
			},
			end: {
				line: line + 1,
				column: 0
			}
		};

		return {
			loc: reportLocation,
			messageId: MESSAGE_ID_BLANKLINES
		};
	}

	return null;
}

function alphaSensitive(prev, next) {
	if (prev.name === next.name) {
		return 0;
	}

	if (prev.name < next.name) {
		return -1;
	}

	return 1;
}

function alphaInsensitive(prev, next) {
	const prevName = prev.name.toLowerCase();
	const nextName = next.name.toLowerCase();

	if (prevName === nextName) {
		return 0;
	}

	if (prevName < nextName) {
		return -1;
	}

	return 1;
}

function alphaOff() {
	return 0;
}

function partsComparator(prev, next, partsSeen) {
	if (prev.name === next.name) {
		return 0;
	}

	for (const delimiter in next.parts) {
		if (!Object.prototype.hasOwnProperty.call(next.parts, delimiter)) {
			continue;
		}

		const prevParts = prev.parts[delimiter];
		const nextParts = next.parts[delimiter];

		const length = Math.min(prevParts.length, nextParts.length);

		for (let depth = 0; depth < length; depth++) {
			const prevPart = prevParts[depth];
			const nextPart = nextParts[depth];

			if (prevPart === nextPart) {
				continue;
			}

			const prevScore = partsSeen[delimiter][depth][prevPart];
			const nextScore = partsSeen[delimiter][depth][nextPart];

			if (prevScore < nextScore) {
				return -1;
			}
		}
	}

	return 1;
}

function getComparator(comparator) {
	switch (comparator) {
		case COMPARATOR_CASE_INSENSITIVE:
			return alphaInsensitive;
		case COMPARATOR_CASE_SENSITIVE:
			return alphaSensitive;
		case COMPARATOR_CASE_PARTS:
			return partsComparator;
		case COMPARATOR_CASE_OFF:
			return alphaOff;
		default:
			throw new Error(`Invalid comparator option: ${comparator}`);
	}
}

function getInvalidOrderReport(prev, next, comparator, partsSeen) {
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

	if (prev.depth < next.depth) {
		return {
			messageId: MESSAGE_ID_DEPTH
		};
	}

	if (prev.depth !== next.depth) {
		return null;
	}

	if (comparator(next, prev, partsSeen) < 0) {
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

	// Comments are annoying to auto-fix because intent is hard to interpret.
	// Turn off fixes if any comments exist between, just before, or just after
	// the affected nodes.
	if (sourceCode.commentsExistBetween(nodePrev, nodeNext)) {
		return;
	}

	if (sourceCode.getComments(nodePrev).leading.length > 0) {
		return;
	}

	if (sourceCode.getComments(nodeNext).trailing.length > 0) {
		return;
	}

	const source = sourceCode.getText();
	const [insertStart, insertEnd] = nodePrev.range;

	// Grab the node and all comments and whitespace before the node
	const start = nodePrev.range[1];
	const end = nodeNext.range[1];

	let text = source.substring(start, end);

	text = text.replace(/\n+/, '\n');

	// Preserve newline previously between nodes
	if (text[0] === '\n') {
		text = text.substring(1) + '\n';
	}

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
		allowBlankLines = false,
		comparator: comparatorOption = COMPARATOR_CASE_PARTS,
		partsRegex = ['-', '/']
	} = options[0] || {};

	let orderPrev = null;
	let nodePrev = null;

	const comparator = getComparator(comparatorOption);

	const partsSeen = {};
	const partsMaxDepth = {};

	function runRule(nodeNext, orderNext, reportTarget) {
		for (const delimiter in orderNext.parts) {
			if (!Object.prototype.hasOwnProperty.call(orderNext.parts, delimiter)) {
				continue;
			}

			const parts = orderNext.parts[delimiter];
			if (!partsSeen[delimiter]) {
				partsSeen[delimiter] = [];
				partsMaxDepth[delimiter] = [];
			}

			parts.forEach((group, i) => {
				if (i >= partsSeen[delimiter].length) {
					partsSeen[delimiter][i] = {};
					partsMaxDepth[delimiter][i] = 0;
				}

				if (partsSeen[delimiter][i][group] === undefined) {
					partsSeen[delimiter][i][group] = partsMaxDepth[delimiter][i];
					partsMaxDepth[delimiter][i] += 1;
				}
			});
		}

		const message = getInvalidOrderReport(orderPrev, orderNext, comparator, partsSeen);

		if (message) {
			context.report({
				node: reportTarget,
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
	}

	return {
		'Program > VariableDeclaration[declarations.length=1] > VariableDeclarator:matches([id.type="Identifier"],[id.type="ObjectPattern"]) > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const orderNext = getOrder(node.arguments[0].value, partsRegex);
			const nodeNext = node.parent.parent;

			runRule(nodeNext, orderNext, node.arguments[0]);
		},
		'Program > ExpressionStatement > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const orderNext = getOrder(node.arguments[0].value, partsRegex);
			const nodeNext = node.parent;

			runRule(nodeNext, orderNext, node.arguments[0]);
		},
		'Program > ImportDeclaration': node => {
			const orderNext = getOrder(node.source.value, partsRegex);
			const nodeNext = node;

			runRule(nodeNext, orderNext, node.source);
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
			[MESSAGE_ID_BLANKLINES]: 'Imports should be grouped together',
			[MESSAGE_ID_DEPTH]: 'Relative paths should be sorted by depth',
			[MESSAGE_ID_GROUP]: '{{earlier}} imports should come before {{later}} imports',
			[MESSAGE_ID_ORDER]: 'Imports should be sorted alphabetically'
		}
	},
	schema: [{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowBlankLines: {
				type: 'boolean',
				default: false
			},
			comparator: {
				type: 'string',
				enum: [
					COMPARATOR_CASE_SENSITIVE,
					COMPARATOR_CASE_INSENSITIVE,
					COMPARATOR_CASE_PARTS,
					COMPARATOR_CASE_OFF
				],
				default: COMPARATOR_CASE_PARTS
			},
			partsRegex: {
				type: 'array',
				default: [
					'-',
					'/'
				],
				minItems: 1,
				items: {
					type: 'string'
				}
			}
		}
	}]
};
