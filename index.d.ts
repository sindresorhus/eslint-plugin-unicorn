import type {ESLint, Linter} from 'eslint';

declare const eslintPluginUnicorn: ESLint.Plugin & {
	configs: {
		recommended: Linter.Config;
		all: Linter.Config;
		'flat/all': Linter.FlatConfig;
		'flat/recommended': Linter.FlatConfig;
	};
};

export = eslintPluginUnicorn;
