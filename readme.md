# eslint-plugin-unicorn [![Build Status](https://travis-ci.org/sindresorhus/eslint-plugin-unicorn.svg?branch=master)](https://travis-ci.org/sindresorhus/eslint-plugin-unicorn) [![Coverage Status](https://coveralls.io/repos/github/sindresorhus/eslint-plugin-unicorn/badge.svg?branch=master)](https://coveralls.io/github/sindresorhus/eslint-plugin-unicorn?branch=master)

<img src="https://cloud.githubusercontent.com/assets/170270/18659176/1cc373d0-7f33-11e6-890f-0ba35362ee7e.jpg" width="180" align="right">

> Various awesome ESLint rules

You might want to check out [XO](https://github.com/xojs/xo), which includes this plugin.


## Install

```
$ npm install --save-dev eslint eslint-plugin-unicorn
```


## Usage

Configure it in `package.json`.

```json
{
	"name": "my-awesome-project",
	"eslintConfig": {
		"env": {
			"es6": true
		},
		"parserOptions": {
			"ecmaVersion": 2018,
			"sourceType": "module"
		},
		"plugins": [
			"unicorn"
		],
		"rules": {
			"unicorn/catch-error-name": ["error", {"name": "error"}],
			"unicorn/explicit-length-check": "error",
			"unicorn/filename-case": ["error", {"case": "kebabCase"}],
			"unicorn/no-abusive-eslint-disable": "error",
			"unicorn/no-process-exit": "error",
			"unicorn/throw-new-error": "error",
			"unicorn/number-literal-case": "error",
			"unicorn/escape-case": "error",
			"unicorn/no-array-instanceof": "error",
			"unicorn/no-new-buffer": "error",
			"unicorn/no-hex-escape": "error",
			"unicorn/custom-error-definition": "off",
			"unicorn/prefer-starts-ends-with": "error",
			"unicorn/prefer-type-error": "error",
			"unicorn/no-fn-reference-in-iterator": "off",
			"unicorn/import-index": "error",
			"unicorn/new-for-builtins": "error",
			"unicorn/regex-shorthand": "error",
			"unicorn/prefer-spread": "error",
			"unicorn/error-message": "error",
			"unicorn/no-unsafe-regex": "off",
			"unicorn/prefer-add-event-listener": "error"
		}
	}
}
```


## Rules

- [catch-error-name](docs/rules/catch-error-name.md) - Enforce a specific parameter name in catch clauses.
- [explicit-length-check](docs/rules/explicit-length-check.md) - Enforce explicitly comparing the `length` property of a value. *(partly fixable)*
- [filename-case](docs/rules/filename-case.md) - Enforce a case style for filenames.
- [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md) - Enforce specifying rules to disable in `eslint-disable` comments.
- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*
- [number-literal-case](docs/rules/number-literal-case.md) - Enforce lowercase identifier and uppercase value for number literals. *(fixable)*
- [escape-case](docs/rules/escape-case.md) - Require escape sequences to use uppercase values. *(fixable)*
- [no-array-instanceof](docs/rules/no-array-instanceof.md) - Require `Array.isArray()` instead of `instanceof Array`. *(fixable)*
- [no-new-buffer](docs/rules/no-new-buffer.md) - Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`. *(fixable)*
- [no-hex-escape](docs/rules/no-hex-escape.md) - Enforce the use of unicode escapes instead of hexadecimal escapes. *(fixable)*
- [custom-error-definition](docs/rules/custom-error-definition.md) - Enforce correct `Error` subclassing. *(fixable)*
- [prefer-starts-ends-with](docs/rules/prefer-starts-ends-with.md) - Prefer `String#startsWith` & `String#endsWith` over more complex alternatives.
- [prefer-type-error](docs/rules/prefer-type-error.md) - Enforce throwing `TypeError` in type checking conditions. *(fixable)*
- [no-fn-reference-in-iterator](docs/rules/no-fn-reference-in-iterator.md) - Prevents passing a function reference directly to iterator methods. *(fixable)*
- [import-index](docs/rules/import-index.md) - Enforce importing index files with `.`. *(fixable)*
- [new-for-builtins](docs/rules/new-for-builtins.md) - Enforce the use of `new` for all builtins, except `String`, `Number` and `Boolean`. *(fixable)*
- [regex-shorthand](docs/rules/regex-shorthand.md) - Enforce the use of regex shorthands to improve readability. *(fixable)*
- [prefer-spread](docs/rules/prefer-spread.md) - Prefer the spread operator over `Array.from()`. *(fixable)*
- [error-message](docs/rules/error-message.md) - Enforce passing a `message` value when throwing a built-in error.
- [no-unsafe-regex](docs/rules/no-unsafe-regex.md) - Disallow unsafe regular expressions.
- [prefer-add-event-listener](docs/rules/prefer-add-event-listener.md) - Prefer `addEventListener` over `on`-functions. *(fixable)*
 - [prefer-exponentiation-operator](docs/rules/prefer-exponentiation-operator.md) - Prefer the exponentiation operator over `Math.pow()` *(fixable)*


## Recommended config

This plugin exports a [`recommended` config](index.js) that enforces good practices.

Enable it in your `package.json` with the `extends` option:

```json
{
	"name": "my-awesome-project",
	"eslintConfig": {
		"extends": "plugin:unicorn/recommended"
	}
}
```

See the [ESLint docs](http://eslint.org/docs/user-guide/configuring#extending-configuration-files) for more information about extending config files.

**Note**: This config will also enable the correct [parser options](http://eslint.org/docs/user-guide/configuring#specifying-parser-options) and [environment](http://eslint.org/docs/user-guide/configuring#specifying-environments).


## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [James Talmage](https://github.com/jamestalmage)
- [Jeroen Engels](https://github.com/jfmengels)
- [Sam Verschueren](https://github.com/SamVerschueren)
- [John Wu](https://github.com/johnwu93)


## License

MIT
