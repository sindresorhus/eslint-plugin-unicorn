import {ESLint} from 'eslint';
import eslintPluginUnicorn from '../../index.js';

function runEslint(project) {
	const eslint = new ESLint({
		cwd: project.location,
		baseConfig: eslintPluginUnicorn.configs.all,
		useEslintrc: false,
		extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx', '.vue'],
		plugins: {
			unicorn: eslintPluginUnicorn,
		},
		fix: true,
		overrideConfig: {
			parser: '@babel/eslint-parser',
			parserOptions: {
				requireConfigFile: false,
				babelOptions: {
					babelrc: false,
					configFile: false,
					parserOpts: {
						plugins: [
							'jsx',
						],
					},
				},
			},
			ignorePatterns: project.ignore,
			rules: {
				// This rule crashing on replace string inside `jsx` or `Unicode escape sequence`
				'unicorn/string-content': 'off',
			},
			overrides: [
				{
					files: ['*.ts', '*.mts', '*.cts', '*.tsx'],
					parser: '@typescript-eslint/parser',
				},
				{
					files: ['*.vue'],
					parser: 'vue-eslint-parser',
				},
			],
		},
	});

	return eslint.lintFiles('.');
}

export default runEslint;
