import {getBuiltinRule} from './utils/index.js';

const baseRule = getBuiltinRule('id-match');

const schema = structuredClone(baseRule.meta.schema);
schema[1].properties.checkNamedImports = {
	type: 'boolean',
	description: 'Whether to check named imports.',
};

const shouldIgnoreImportReport = (problem, checkNamedImports) =>
	!checkNamedImports
	&& problem.node.parent?.type === 'ImportSpecifier';

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const checkNamedImports = context.options[1]?.checkNamedImports !== false;
	const fakeContext = Object.create(context, {
		report: {
			value(problem) {
				if (shouldIgnoreImportReport(problem, checkNamedImports)) {
					return;
				}

				context.report(problem);
			},
		},
	});
	const listeners = baseRule.create(fakeContext);
	const {
		Program: onProgram,
		Identifier: onIdentifier,
		PrivateIdentifier: onPrivateIdentifier,
	} = listeners;

	context.on('Program', node => onProgram(node));
	context.on('Identifier', node => onIdentifier(node));
	context.on('PrivateIdentifier', node => onPrivateIdentifier(node));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require identifiers to match a specified regular expression.',
			recommended: false,
		},
		schema,
		defaultOptions: [
			'^.+$',
			{
				classFields: false,
				ignoreDestructuring: false,
				onlyDeclarations: false,
				checkNamedImports: true,
				properties: false,
			},
		],
		messages: baseRule.meta.messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
