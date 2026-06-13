import {hasSideEffect} from '@eslint-community/eslint-utils';
import {unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in exported modules.',
};

const exportDeclarationTypes = new Set([
	'ExportAllDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
]);

const isExportDeclaration = node => exportDeclarationTypes.has(node.type);

const isAllowedAssignment = node => unwrapTypeScriptExpression(node).type === 'AssignmentExpression';

const hasTopLevelSideEffect = (node, sourceCode) =>
	node.type === 'TaggedTemplateExpression'
	|| hasSideEffect(node, sourceCode);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	let shouldCheck = false;

	context.on('Program', program => {
		shouldCheck = !sourceCode.lines[0].startsWith('#!')
			&& program.body.some(node => isExportDeclaration(node));
	});

	context.on('ExpressionStatement', node => {
		if (
			!shouldCheck
			|| node.parent.type !== 'Program'
			|| isAllowedAssignment(node.expression)
			|| !hasTopLevelSideEffect(node.expression, sourceCode)
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
			description: 'Disallow top-level side effects in exported modules.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
