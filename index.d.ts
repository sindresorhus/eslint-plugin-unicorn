import type {ESLint, Linter} from 'eslint';

declare const eslintPluginUnicorn: ESLint.Plugin & {
	configs: {
		recommended: Linter.Config;
		unopinionated: Linter.Config;
		all: Linter.Config;

		/**
		Recommended rules for CSS. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-css']],
		}
		```
		*/
		'recommended-css': Linter.Config;

		/**
		Recommended rules for HTML. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-html']],
		}
		```
		*/
		'recommended-html': Linter.Config;

		/**
		Recommended rules for JSON, JSONC, and JSON5. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-json']],
		}
		```
		*/
		'recommended-json': Linter.Config;

		/**
		Recommended rules for CommonMark and GFM Markdown. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-markdown']],
		}
		```
		*/
		'recommended-markdown': Linter.Config;

		/**
		Recommended rules for TOML. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-toml']],
		}
		```
		*/
		'recommended-toml': Linter.Config;

		/**
		Recommended rules for YAML. Compatible opt-in rules are disabled, and deprecated rules are excluded. Configure file matching, the language plugin, and `language` separately. This preset does not configure JavaScript globals or core-rule overrides.

		@example
		```js
		{
			extends: [unicorn.configs['recommended-yaml']],
		}
		```
		*/
		'recommended-yaml': Linter.Config;
	};
};

export default eslintPluginUnicorn;
