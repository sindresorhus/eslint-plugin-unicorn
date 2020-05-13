# eslint-plugin-unicorn [![Build Status](https://github.com/sindresorhus/eslint-plugin-unicorn/workflows/CI/badge.svg?branch=master)](https://github.com/sindresorhus/eslint-plugin-unicorn/actions?query=branch%3Amaster+workflow%3ACI) [![Coverage Status](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/master/graph/badge.svg)](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/master)

<img src="https://cloud.githubusercontent.com/assets/170270/18659176/1cc373d0-7f33-11e6-890f-0ba35362ee7e.jpg" width="180" align="right">

> Various awesome ESLint rules

You might want to check out [XO](https://github.com/xojs/xo), which includes this plugin.

[**Propose or contribute a new rule ➡**](.github/contributing.md)

## Install

```console
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
			"ecmaVersion": 2020,
			"sourceType": "module"
		},
		"plugins": [
			"unicorn"
		],
		"rules": {
			"unicorn/better-regex": "error",
			"unicorn/catch-error-name": "error",
			"unicorn/consistent-function-scoping": "error",
			"unicorn/custom-error-definition": "off",
			"unicorn/error-message": "error",
			"unicorn/escape-case": "error",
			"unicorn/expiring-todo-comments": "error",
			"unicorn/explicit-length-check": "error",
			"unicorn/filename-case": "error",
			"unicorn/import-index": "error",
			"unicorn/new-for-builtins": "error",
			"unicorn/no-abusive-eslint-disable": "error",
			"unicorn/no-array-instanceof": "error",
			"unicorn/no-console-spaces": "error",
			"unicorn/no-fn-reference-in-iterator": "error",
			"unicorn/no-for-loop": "error",
			"unicorn/no-hex-escape": "error",
			"unicorn/no-keyword-prefix": "off",
			"no-nested-ternary": "off",
			"unicorn/no-nested-ternary": "error",
			"unicorn/no-new-buffer": "error",
			"unicorn/no-null": "error",
			"unicorn/no-process-exit": "error",
			"unicorn/no-reduce": "error",
			"unicorn/no-unreadable-array-destructuring": "error",
			"unicorn/no-unsafe-regex": "off",
			"unicorn/no-unused-properties": "off",
			"unicorn/no-useless-undefined": "error",
			"unicorn/no-zero-fractions": "error",
			"unicorn/number-literal-case": "error",
			"unicorn/prefer-add-event-listener": "error",
			"unicorn/prefer-dataset": "error",
			"unicorn/prefer-event-key": "error",
			"unicorn/prefer-flat-map": "error",
			"unicorn/prefer-includes": "error",
			"unicorn/prefer-modern-dom-apis": "error",
			"unicorn/prefer-negative-index": "error",
			"unicorn/prefer-node-append": "error",
			"unicorn/prefer-node-remove": "error",
			"unicorn/prefer-number-properties": "error",
			"unicorn/prefer-optional-catch-binding": "error",
			"unicorn/prefer-query-selector": "error",
			"unicorn/prefer-reflect-apply": "error",
			"unicorn/prefer-replace-all": "off",
			"unicorn/prefer-set-has": "error",
			"unicorn/prefer-spread": "error",
			"unicorn/prefer-starts-ends-with": "error",
			"unicorn/prefer-string-slice": "error",
			"unicorn/prefer-text-content": "error",
			"unicorn/prefer-trim-start-end": "error",
			"unicorn/prefer-type-error": "error",
			"unicorn/prevent-abbreviations": "error",
			"unicorn/string-content": "off",
			"unicorn/throw-new-error": "error"
		}
	}
}
```

## Rules

- [better-regex](docs/rules/better-regex.md) - Improve regexes by making them shorter, consistent, and safer. *(fixable)*
- [catch-error-name](docs/rules/catch-error-name.md) - Enforce a specific parameter name in catch clauses. *(fixable)*
- [consistent-function-scoping](docs/rules/consistent-function-scoping.md) - Move function definitions to the highest possible scope.
- [custom-error-definition](docs/rules/custom-error-definition.md) - Enforce correct `Error` subclassing. *(fixable)*
- [error-message](docs/rules/error-message.md) - Enforce passing a `message` value when throwing a built-in error.
- [escape-case](docs/rules/escape-case.md) - Require escape sequences to use uppercase values. *(fixable)*
- [expiring-todo-comments](docs/rules/expiring-todo-comments.md) - Add expiration conditions to TODO comments.
- [explicit-length-check](docs/rules/explicit-length-check.md) - Enforce explicitly comparing the `length` property of a value. *(partly fixable)*
- [filename-case](docs/rules/filename-case.md) - Enforce a case style for filenames.
- [import-index](docs/rules/import-index.md) - Enforce importing index files with `.`. *(fixable)*
- [new-for-builtins](docs/rules/new-for-builtins.md) - Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`. *(fixable)*
- [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md) - Enforce specifying rules to disable in `eslint-disable` comments.
- [no-array-instanceof](docs/rules/no-array-instanceof.md) - Require `Array.isArray()` instead of `instanceof Array`. *(fixable)*
- [no-console-spaces](docs/rules/no-console-spaces.md) - Do not use leading/trailing space between `console.log` parameters. *(fixable)*
- [no-fn-reference-in-iterator](docs/rules/no-fn-reference-in-iterator.md) - Prevent passing a function reference directly to iterator methods.
- [no-for-loop](docs/rules/no-for-loop.md) - Do not use a `for` loop that can be replaced with a `for-of` loop. *(partly fixable)*
- [no-hex-escape](docs/rules/no-hex-escape.md) - Enforce the use of Unicode escapes instead of hexadecimal escapes. *(fixable)*
- [no-keyword-prefix](docs/rules/no-keyword-prefix.md) - Disallow identifiers starting with `new` or `class`.
- [no-nested-ternary](docs/rules/no-nested-ternary.md) - Disallow nested ternary expressions. *(partly fixable)*
- [no-new-buffer](docs/rules/no-new-buffer.md) - Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`. *(fixable)*
- [no-null](docs/rules/no-null.md) - Disallow the use of the `null` literal.
- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [no-reduce](docs/rules/no-reduce.md) - Disallow `Array#reduce()` and `Array#reduceRight()`.
- [no-unreadable-array-destructuring](docs/rules/no-unreadable-array-destructuring.md) - Disallow unreadable array destructuring.
- [no-unsafe-regex](docs/rules/no-unsafe-regex.md) - Disallow unsafe regular expressions.
- [no-unused-properties](docs/rules/no-unused-properties.md) - Disallow unused object properties.
- [no-useless-undefined](docs/rules/no-useless-undefined.md) - Disallow useless `undefined`. *(fixable)*
- [no-zero-fractions](docs/rules/no-zero-fractions.md) - Disallow number literals with zero fractions or dangling dots. *(fixable)*
- [number-literal-case](docs/rules/number-literal-case.md) - Enforce proper case for numeric literals. *(fixable)*
- [prefer-add-event-listener](docs/rules/prefer-add-event-listener.md) - Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions. *(partly fixable)*
- [prefer-dataset](docs/rules/prefer-dataset.md) - Prefer using `.dataset` on DOM elements over `.setAttribute(…)`. *(fixable)*
- [prefer-event-key](docs/rules/prefer-event-key.md) - Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`. *(partly fixable)*
- [prefer-flat-map](docs/rules/prefer-flat-map.md) - Prefer `.flatMap(…)` over `.map(…).flat()`. *(fixable)*
- [prefer-includes](docs/rules/prefer-includes.md) - Prefer `.includes()` over `.indexOf()` when checking for existence or non-existence. *(fixable)*
- [prefer-modern-dom-apis](docs/rules/prefer-modern-dom-apis.md) - Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`. *(fixable)*
- [prefer-negative-index](docs/rules/prefer-negative-index.md) - Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()` and `Array#splice()`. *(fixable)*
- [prefer-node-append](docs/rules/prefer-node-append.md) - Prefer `Node#append()` over `Node#appendChild()`. *(fixable)*
- [prefer-node-remove](docs/rules/prefer-node-remove.md) - Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`. *(fixable)*
- [prefer-number-properties](docs/rules/prefer-number-properties.md) - Prefer `Number` static properties over global ones. *(fixable)*
- [prefer-optional-catch-binding](docs/rules/prefer-optional-catch-binding.md) - Prefer omitting the `catch` binding parameter. *(fixable)*
- [prefer-query-selector](docs/rules/prefer-query-selector.md) - Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`. *(partly fixable)*
- [prefer-reflect-apply](docs/rules/prefer-reflect-apply.md) - Prefer `Reflect.apply()` over `Function#apply()`. *(fixable)*
- [prefer-replace-all](docs/rules/prefer-replace-all.md) - Prefer `String#replaceAll()` over regex searches with the global flag. *(fixable)*
- [prefer-set-has](docs/rules/prefer-set-has.md) - Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence. *(fixable)*
- [prefer-spread](docs/rules/prefer-spread.md) - Prefer the spread operator over `Array.from()`. *(fixable)*
- [prefer-starts-ends-with](docs/rules/prefer-starts-ends-with.md) - Prefer `String#startsWith()` & `String#endsWith()` over more complex alternatives. *(partly fixable)*
- [prefer-string-slice](docs/rules/prefer-string-slice.md) - Prefer `String#slice()` over `String#substr()` and `String#substring()`. *(partly fixable)*
- [prefer-text-content](docs/rules/prefer-text-content.md) - Prefer `.textContent` over `.innerText`. *(fixable)*
- [prefer-trim-start-end](docs/rules/prefer-trim-start-end.md) - Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`. *(fixable)*
- [prefer-type-error](docs/rules/prefer-type-error.md) - Enforce throwing `TypeError` in type checking conditions. *(fixable)*
- [prevent-abbreviations](docs/rules/prevent-abbreviations.md) - Prevent abbreviations. *(partly fixable)*
- [string-content](docs/rules/string-content.md) - Enforce better string content. *(fixable)*
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*

## Deprecated Rules

- [prefer-exponentiation-operator](docs/rules/prefer-exponentiation-operator.md) - Use the built-in ESLint [`prefer-exponentiation-operator`](https://eslint.org/docs/rules/prefer-exponentiation-operator) rule instead.
- [regex-shorthand](docs/rules/regex-shorthand.md) - Renamed to [`better-regex`](docs/rules/better-regex.md).

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

See the [ESLint docs](https://eslint.org/docs/user-guide/configuring#extending-configuration-files) for more information about extending config files.

**Note**: This config will also enable the correct [parser options](https://eslint.org/docs/user-guide/configuring#specifying-parser-options) and [environment](https://eslint.org/docs/user-guide/configuring#specifying-environments).

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Adam Babcock](https://github.com/MrHen)
- [futpib](https://github.com/futpib)
- [Fisker Cheung](https://github.com/fisker)

###### Former

- [Jeroen Engels](https://github.com/jfmengels)
- [Sam Verschueren](https://github.com/SamVerschueren)
