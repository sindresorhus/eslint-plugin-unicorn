import {hasSideEffect} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Top-level side effect is not allowed.',
};

const exportDeclarationTypes = new Set([
	'ExportAllDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
]);

const isExportDeclaration = node => exportDeclarationTypes.has(node.type);
const isAssignmentExpression = node => node.type === 'AssignmentExpression';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	let shouldCheckProgram = true;

	context.on('Program', node => {
		const hasHashbang = sourceCode
			.getAllComments()
			.some(comment => comment.type === 'Shebang');
		const hasExports = node.body.some(node => isExportDeclaration(node));

		shouldCheckProgram = hasExports && !hasHashbang;
	});
	context.on('ExpressionStatement', node => {
		if (
			!shouldCheckProgram
			|| isAssignmentExpression(node.expression)
			|| node.parent.type !== 'Program'
			|| !hasSideEffect(node.expression, sourceCode)
		) {
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
			description: 'Disallow top-level side effects.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
