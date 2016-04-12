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
			"xo/no-process-exit": "error",
			"xo/throw-new-error": "error"
		}
	}
}
```


## Rules

- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*


## Recommended configuration

This plugin exports a [`recommended` configuration](index.js) that enforces good practices.

To enable this configuration, use the `extends` property in your `package.json`.

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

See [ESLint documentation](http://eslint.org/docs/user-guide/configuring#extending-configuration-files) for more information about extending configuration files.

**Note**: This configuration will also enable the correct [parser options](http://eslint.org/docs/user-guide/configuring#specifying-parser-options) and [environment](http://eslint.org/docs/user-guide/configuring#specifying-environments).


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
