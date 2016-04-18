# eslint-plugin-xo [![Build Status](https://travis-ci.org/sindresorhus/eslint-plugin-xo.svg?branch=master)](https://travis-ci.org/sindresorhus/eslint-plugin-xo)

> ESLint rules for [XO](https://github.com/sindresorhus/xo)

This plugin is bundled with XO, but can still be useful if you don't use XO.


## Install

```
$ npm install --save-dev eslint eslint-plugin-xo
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
			"ecmaVersion": 7,
			"sourceType": "module"
		},
		"plugins": [
			"xo"
		],
		"rules": {
			"xo/catch-error-name": ["error", {"name": "err"}],
			"xo/filename-case": ["error", {"case": "kebabCase"}],
			"xo/no-process-exit": "error",
			"xo/throw-new-error": "error"
		}
	}
}
```


## Rules

- [catch-error-name](docs/rules/catch-error-name.md) - Require a specific parameter name in catch clauses.
- [filename-case](docs/rules/filename-case.md) - Enforce a case style for filenames.
- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*


## Recommended config

This plugin exports a [`recommended` config](index.js) that enforces good practices.

Enable it in your `package.json` with the `extends` option:

```json
{
	"name": "my-awesome-project",
	"eslintConfig": {
		"plugins": [
			"xo"
		],
		"extends": "plugin:xo/recommended"
	}
}
```

See the [ESLint docs](http://eslint.org/docs/user-guide/configuring#extending-configuration-files) for more information about extending config files.

**Note**: This config will also enable the correct [parser options](http://eslint.org/docs/user-guide/configuring#specifying-parser-options) and [environment](http://eslint.org/docs/user-guide/configuring#specifying-environments).


## Created by

- [Sindre Sorhus](https://sindresorhus.com)
- [James Talmage](https://github.com/jamestalmage)
- [Jeroen Engels](https://github.com/jfmengels)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
