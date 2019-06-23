'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID_IMPORT = 'import-path-order';
const MESSAGE_ID_REQUIRE = 'require-path-order';

const GROUP_ABSOLUTE = 3;
const GROUP_PARENT = 2;
const GROUP_LOCAL = 1;

function getOrder(source) {
	if (source.match(/^\.\//)) {
		return {
			group: GROUP_LOCAL,
			depth: 0
		};
	}

	const relative = source.match(/^(\.\.\/)+/);
	if (relative) {
		return {
			group: GROUP_PARENT,
			depth: relative[0].split('..').length
		};
	}

	return GROUP_ABSOLUTE;
}

function isValid(prev, next) {
	const prevOrder = getOrder(prev);
	const nextOrder = getOrder(next);

	if (nextOrder.group !== prevOrder.group) {
		return nextOrder.group >= prevOrder.group;
	}

	if (nextOrder.depth !== prevOrder.depth) {
		return nextOrder.depth >= prevOrder.depth;
	}

	// TODO: Case insensitive
	return next >= prev;
}

const create = context => {
	let prev = null;
	return {
		'Program > VariableDeclaration[declarations.length=1] > VariableDeclarator:matches([id.type="Identifier"],[id.type="ObjectPattern"]) > CallExpression[callee.name="require"][arguments.length=1][arguments.0.type="Literal"]': node => {
			const next = node.arguments[0].value;

			if (prev !== null && !isValid(prev, next)) {
				context.report({
					node,
					messageId: MESSAGE_ID_REQUIRE
				});
			}

			prev = next;
		},
		'Program > ImportDeclaration[specifiers.length>0]': node => {
			const next = node.source.value;

			if (prev !== null && !isValid(prev, next)) {
				context.report({
					node: node.source,
					messageId: MESSAGE_ID_IMPORT
				});
			}

			prev = next;
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
			[MESSAGE_ID_IMPORT]: '`import` statements should be sorted by path',
			[MESSAGE_ID_REQUIRE]: '`require` statements should be sorted by path'
		}
	}
};
