import type {ESLint, Linter} from 'eslint';

declare const eslintPluginUnicorn: ESLint.Plugin & {
	configs: {
		recommended: Linter.Config;
		unopinionated: Linter.Config;
		all: Linter.Config;

		/**
Recommended rules for CSS. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-css']],
}
```
*/
		'recommended-css': Linter.Config;

		/**
Recommended rules for HTML. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-html']],
}
```
*/
		'recommended-html': Linter.Config;

		/**
Recommended rules for JSON, JSONC, and JSON5. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-json']],
}
```
*/
		'recommended-json': Linter.Config;

		/**
Recommended rules for CommonMark and GFM Markdown. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-markdown']],
}
```
*/
		'recommended-markdown': Linter.Config;

		/**
Recommended rules for TOML. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-toml']],
}
```
*/
		'recommended-toml': Linter.Config;

		/**
Recommended rules for YAML. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

@example
```js
{
	extends: [unicorn.configs['recommended-yaml']],
}
```
*/
		'recommended-yaml': Linter.Config;

		/** @deprecated Use `all` instead. The `flat/` prefix is no longer needed. */
		'flat/all': Linter.Config;

		/** @deprecated Use `recommended` instead. The `flat/` prefix is no longer needed. */
		'flat/recommended': Linter.Config;
	};
};

export default eslintPluginUnicorn;
