# eslint-plugin-unicorn [![Build Status](https://travis-ci.org/sindresorhus/eslint-plugin-unicorn.svg?branch=master)](https://travis-ci.org/sindresorhus/eslint-plugin-unicorn) [![Coverage Status](https://coveralls.io/repos/github/sindresorhus/eslint-plugin-unicorn/badge.svg?branch=master)](https://coveralls.io/github/sindresorhus/eslint-plugin-unicorn?branch=master)

<img src="https://cloud.githubusercontent.com/assets/170270/18659176/1cc373d0-7f33-11e6-890f-0ba35362ee7e.jpg" width="180" align="right">

> Various awesome ESLint rules

You might want to check out [XO](https://github.com/sindresorhus/xo), which includes this plugin.


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
			"ecmaVersion": 2016,
			"sourceType": "module"
		},
		"plugins": [
			"unicorn"
		],
		"rules": {
			"unicorn/catch-error-name": ["error", {"name": "err"}],
			"unicorn/explicit-length-check": "error",
			"unicorn/filename-case": ["error", {"case": "kebabCase"}],
			"unicorn/no-abusive-eslint-disable": "error",
			"unicorn/no-process-exit": "error",
			"unicorn/throw-new-error": "error",
			"unicorn/number-literal-case": "error",
			"unicorn/no-array-instanceof": "error"
		}
	}
}
```


## Rules

- [catch-error-name](docs/rules/catch-error-name.md) - Enforce a specific parameter name in catch clauses.
- [explicit-length-check](docs/rules/explicit-length-check.md) - Enforce explicitly comparing the `length` property of a value.
- [filename-case](docs/rules/filename-case.md) - Enforce a case style for filenames.
- [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md) - Enforce specifying rules to disable in `eslint-disable` comments.
- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*
- [number-literal-case](docs/rules/number-literal-case.md) - Enforce lowercase identifier and uppercase value for number literals. *(fixable)*
- [no-array-instanceof](docs/rules/no-array-instanceof.md) - Disallow `instanceof Array`, instead use `Array.isArray()`. *(fixable)*


## Recommended config

This plugin exports a [`recommended` config](index.js) that enforces good practices.

Enable it in your `package.json` with the `extends` option:

```json
{
	"name": "my-awesome-project",
	"eslintConfig": {
		"plugins": [
			"unicorn"
		],
		"extends": "plugin:unicorn/recommended"
	}
}
```

See the [ESLint docs](http://eslint.org/docs/user-guide/configuring#extending-configuration-files) for more information about extending config files.

**Note**: This config will also enable the correct [parser options](http://eslint.org/docs/user-guide/configuring#specifying-parser-options) and [environment](http://eslint.org/docs/user-guide/configuring#specifying-environments).


## Created by

- [Sindre Sorhus](https://github.com/sindresorhus)
- [James Talmage](https://github.com/jamestalmage)
- [Jeroen Engels](https://github.com/jfmengels)
- [Sam Verschueren](https://github.com/SamVerschueren)
- [Contributors…](../../graphs/contributors)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
