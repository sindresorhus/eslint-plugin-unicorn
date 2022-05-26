import {createRequire} from 'node:module';
import defaultOptions from './default-options.mjs';

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
};

const typescript = {
	name: '@typescript-eslint/parser',
	get parser() {
		return require.resolve(this.name);
	},
	mergeParserOptions(options) {
		return {
			...defaultOptions.parserOptions,
			...options,
		};
	},
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
};

const parsers = {
	babel,
	typescript,
	vue,
};

export default parsers;
