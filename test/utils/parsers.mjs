import defaultOptions from './default-options.mjs';
import babelEslintParser from '@babel/eslint-parser';
import typescriptEslintParser from '@typescript-eslint/parser';
import vueEslintParser from 'vue-eslint-parser';

const babelParser = {
	name: 'babel',
	implementation: babelEslintParser,
	mergeParserOptions(options) {
		options = options || {};
		options.babelOptions = options.babelOptions || {};
		options.babelOptions.parserOpts = options.babelOptions.parserOpts || {};

		let babelPlugins = options.babelOptions.parserOpts.plugins || [];
		babelPlugins = [
			['estree', {classFeatures: true}],
			'jsx',
			'exportDefaultFrom',
			...babelPlugins,
		];

		return {
			...defaultOptions.parserOptions,
			requireConfigFile: false,
			sourceType: 'module',
			allowImportExportEverywhere: true,
			...options,
			babelOptions: {
				babelrc: false,
				configFile: false,
				...options.babelOptions,
				parserOpts: {
					...options.babelOptions.parserOpts,
					plugins: babelPlugins,
				},
			},
		};
	},
};

const typescriptParser = {
	name: 'typescript',
	implementation: typescriptEslintParser,
	mergeParserOptions(options) {
		return {
			...defaultOptions.parserOptions,
			project: [],
			...options,
		};
	},
};

const vueParser = {
	name: 'vue',
	implementation: vueEslintParser,
	mergeParserOptions(options) {
		return {
			...defaultOptions.parserOptions,
			...options,
		};
	},
};

const parsers = Object.fromEntries(
	[
		babelParser,
		typescriptParser,
		vueParser,
	].map(parser => [parser.name, parser]),
);

export default parsers;
