import type {ESLint, Linter} from 'eslint';

declare const eslintPluginUnicorn: ESLint.Plugin & {
	configs: {
		recommended: Linter.Config;
		unopinionated: Linter.Config;
		all: Linter.Config;

		/** @deprecated Use `all` instead. The `flat/` prefix is no longer needed. */
		'flat/all': Linter.Config;

		/** @deprecated Use `recommended` instead. The `flat/` prefix is no longer needed. */
		'flat/recommended': Linter.Config;
	};
};

export default eslintPluginUnicorn;
