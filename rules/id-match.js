import {getBuiltinRule} from './utils/index.js';

const baseRule = getBuiltinRule('id-match');

const schema = structuredClone(baseRule.meta.schema);
schema[1].properties.checkNamedSpecifiers = {
	type: 'boolean',
	description: 'Whether to check named import specifiers and external named export specifiers.',
};

const isNamedSpecifierReport = problem => {
	const {parent} = problem.node;

	return parent?.type === 'ImportSpecifier'
		|| (
			parent?.type === 'ExportSpecifier'
			&& parent.parent.source
		);
};

const shouldIgnoreNamedSpecifierReport = (problem, checkNamedSpecifiers) =>
	!checkNamedSpecifiers
	&& isNamedSpecifierReport(problem);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const checkNamedSpecifiers = context.options[1]?.checkNamedSpecifiers !== false;
	const fakeContext = Object.create(context, {
		report: {
			value(problem) {
				if (shouldIgnoreNamedSpecifierReport(problem, checkNamedSpecifiers)) {
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
			baseRule.meta.defaultOptions[0],
			{
				...baseRule.meta.defaultOptions[1],
				checkNamedSpecifiers: true,
			},
		],
		messages: baseRule.meta.messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
