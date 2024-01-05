import {createRequire} from 'node:module';
import defaultOptions from './default-options.mjs';
import babelEslintParser from '@babel/eslint-parser';
import typescriptEslintParser from '@typescript-eslint/parser';
import vueEslintParser from 'vue-eslint-parser';

const require = createRequire(import.meta.url);

const babel = {
	name: '@babel/eslint-parser',
	get parser() {
		return require.resolve(this.name);
	},
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
	__todo_fix_this_parser: babelEslintParser,
};

const typescript = {
	name: '@typescript-eslint/parser',
	get parser() {
		return require.resolve(this.name);
	},
	mergeParserOptions(options) {
		return {
			...defaultOptions.parserOptions,
			project: [],
			...options,
		};
	},
	__todo_fix_this_parser: typescriptEslintParser,
};

const vue = {
	name: 'vue-eslint-parser',
	get parser() {
		return require.resolve(this.name);
	},
	mergeParserOptions(options) {
		return {
			...defaultOptions.parserOptions,
			...options,
		};
	},
	__todo_fix_this_parser: vueEslintParser,
};

const parsers = {
	babel,
	typescript,
	vue,
};

export default parsers;
