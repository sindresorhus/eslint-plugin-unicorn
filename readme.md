# eslint-plugin-unicorn [![Coverage Status](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main/graph/badge.svg)](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main)

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
			"ecmaVersion": 2021,
			"sourceType": "module"
		},
		"plugins": [
			"unicorn"
		],
		"rules": {
			"unicorn/better-regex": "error",
			"unicorn/catch-error-name": "error",
			"unicorn/consistent-destructuring": "error",
			"unicorn/consistent-function-scoping": "error",
			"unicorn/custom-error-definition": "off",
			"unicorn/empty-brace-spaces": "error",
			"unicorn/error-message": "error",
			"unicorn/escape-case": "error",
			"unicorn/expiring-todo-comments": "error",
			"unicorn/explicit-length-check": "error",
			"unicorn/filename-case": "error",
			"unicorn/import-index": "off",
			"unicorn/import-style": "error",
			"unicorn/new-for-builtins": "error",
			"unicorn/no-abusive-eslint-disable": "error",
			"unicorn/no-array-callback-reference": "error",
			"unicorn/no-array-for-each": "error",
			"unicorn/no-array-push-push": "error",
			"unicorn/no-array-reduce": "error",
			"unicorn/no-console-spaces": "error",
			"unicorn/no-for-loop": "error",
			"unicorn/no-hex-escape": "error",
			"unicorn/no-instanceof-array": "error",
			"unicorn/no-keyword-prefix": "off",
			"unicorn/no-lonely-if": "error",
			"no-nested-ternary": "off",
			"unicorn/no-nested-ternary": "error",
			"unicorn/no-new-array": "error",
			"unicorn/no-new-buffer": "error",
			"unicorn/no-null": "error",
			"unicorn/no-object-as-default-parameter": "error",
			"unicorn/no-process-exit": "error",
			"unicorn/no-this-assignment": "error",
			"unicorn/no-unreadable-array-destructuring": "error",
			"unicorn/no-unsafe-regex": "off",
			"unicorn/no-unused-properties": "off",
			"unicorn/no-useless-undefined": "error",
			"unicorn/no-zero-fractions": "error",
			"unicorn/number-literal-case": "error",
			"unicorn/numeric-separators-style": "off",
			"unicorn/prefer-add-event-listener": "error",
			"unicorn/prefer-array-find": "error",
			"unicorn/prefer-array-flat-map": "error",
			"unicorn/prefer-array-index-of": "error",
			"unicorn/prefer-array-some": "error",
			"unicorn/prefer-date-now": "error",
			"unicorn/prefer-default-parameters": "error",
			"unicorn/prefer-dom-node-append": "error",
			"unicorn/prefer-dom-node-dataset": "error",
			"unicorn/prefer-dom-node-remove": "error",
			"unicorn/prefer-dom-node-text-content": "error",
			"unicorn/prefer-includes": "error",
			"unicorn/prefer-keyboard-event-key": "error",
			"unicorn/prefer-math-trunc": "error",
			"unicorn/prefer-modern-dom-apis": "error",
			"unicorn/prefer-negative-index": "error",
			"unicorn/prefer-number-properties": "error",
			"unicorn/prefer-optional-catch-binding": "error",
			"unicorn/prefer-query-selector": "error",
			"unicorn/prefer-reflect-apply": "error",
			"unicorn/prefer-regexp-test": "error",
			"unicorn/prefer-set-has": "error",
			"unicorn/prefer-spread": "error",
			"unicorn/prefer-string-replace-all": "off",
			"unicorn/prefer-string-slice": "error",
			"unicorn/prefer-string-starts-ends-with": "error",
			"unicorn/prefer-string-trim-start-end": "error",
			"unicorn/prefer-ternary": "off",
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
- [consistent-destructuring](docs/rules/consistent-destructuring.md) - Use destructured variables over properties. *(partly fixable)*
- [consistent-function-scoping](docs/rules/consistent-function-scoping.md) - Move function definitions to the highest possible scope.
- [custom-error-definition](docs/rules/custom-error-definition.md) - Enforce correct `Error` subclassing. *(fixable)*
- [empty-brace-spaces](docs/rules/empty-brace-spaces.md) - Enforce no spaces between braces. *(fixable)*
- [error-message](docs/rules/error-message.md) - Enforce passing a `message` value when creating a built-in error.
- [escape-case](docs/rules/escape-case.md) - Require escape sequences to use uppercase values. *(fixable)*
- [expiring-todo-comments](docs/rules/expiring-todo-comments.md) - Add expiration conditions to TODO comments.
- [explicit-length-check](docs/rules/explicit-length-check.md) - Enforce explicitly comparing the `length` property of a value. *(partly fixable)*
- [filename-case](docs/rules/filename-case.md) - Enforce a case style for filenames.
- [import-index](docs/rules/import-index.md) - Enforce importing index files with `.`. *(fixable)*
- [import-style](docs/rules/import-style.md) - Enforce specific import styles per module.
- [new-for-builtins](docs/rules/new-for-builtins.md) - Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`. *(partly fixable)*
- [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md) - Enforce specifying rules to disable in `eslint-disable` comments.
- [no-array-callback-reference](docs/rules/no-array-callback-reference.md) - Prevent passing a function reference directly to iterator methods.
- [no-array-for-each](docs/rules/no-array-for-each.md) - Prefer `for…of` over `Array#forEach(…)`. *(partly fixable)*
- [no-array-push-push](docs/rules/no-array-push-push.md) - Enforce combining multiple `Array#push()` into one call. *(partly fixable)*
- [no-array-reduce](docs/rules/no-array-reduce.md) - Disallow `Array#reduce()` and `Array#reduceRight()`.
- [no-console-spaces](docs/rules/no-console-spaces.md) - Do not use leading/trailing space between `console.log` parameters. *(fixable)*
- [no-for-loop](docs/rules/no-for-loop.md) - Do not use a `for` loop that can be replaced with a `for-of` loop. *(partly fixable)*
- [no-hex-escape](docs/rules/no-hex-escape.md) - Enforce the use of Unicode escapes instead of hexadecimal escapes. *(fixable)*
- [no-instanceof-array](docs/rules/no-instanceof-array.md) - Require `Array.isArray()` instead of `instanceof Array`. *(fixable)*
- [no-keyword-prefix](docs/rules/no-keyword-prefix.md) - Disallow identifiers starting with `new` or `class`.
- [no-lonely-if](docs/rules/no-lonely-if.md) - Disallow `if` statements as the only statement in `if` blocks without `else`. *(fixable)*
- [no-nested-ternary](docs/rules/no-nested-ternary.md) - Disallow nested ternary expressions. *(partly fixable)*
- [no-new-array](docs/rules/no-new-array.md) - Disallow `new Array()`. *(partly fixable)*
- [no-new-buffer](docs/rules/no-new-buffer.md) - Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`. *(partly fixable)*
- [no-null](docs/rules/no-null.md) - Disallow the use of the `null` literal.
- [no-object-as-default-parameter](docs/rules/no-object-as-default-parameter.md) - Disallow the use of objects as default parameters.
- [no-process-exit](docs/rules/no-process-exit.md) - Disallow `process.exit()`.
- [no-this-assignment](docs/rules/no-this-assignment.md) - Disallow assigning `this` to a variable.
- [no-unreadable-array-destructuring](docs/rules/no-unreadable-array-destructuring.md) - Disallow unreadable array destructuring. *(partly fixable)*
- [no-unsafe-regex](docs/rules/no-unsafe-regex.md) - Disallow unsafe regular expressions.
- [no-unused-properties](docs/rules/no-unused-properties.md) - Disallow unused object properties.
- [no-useless-undefined](docs/rules/no-useless-undefined.md) - Disallow useless `undefined`. *(fixable)*
- [no-zero-fractions](docs/rules/no-zero-fractions.md) - Disallow number literals with zero fractions or dangling dots. *(fixable)*
- [number-literal-case](docs/rules/number-literal-case.md) - Enforce proper case for numeric literals. *(fixable)*
- [numeric-separators-style](docs/rules/numeric-separators-style.md) - Enforce the style of numeric separators by correctly grouping digits. *(fixable)*
- [prefer-add-event-listener](docs/rules/prefer-add-event-listener.md) - Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions. *(partly fixable)*
- [prefer-array-find](docs/rules/prefer-array-find.md) - Prefer `.find(…)` over the first element from `.filter(…)`. *(partly fixable)*
- [prefer-array-flat-map](docs/rules/prefer-array-flat-map.md) - Prefer `.flatMap(…)` over `.map(…).flat()`. *(fixable)*
- [prefer-array-index-of](docs/rules/prefer-array-index-of.md) - Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item. *(partly fixable)*
- [prefer-array-some](docs/rules/prefer-array-some.md) - Prefer `.some(…)` over `.find(…)`.
- [prefer-date-now](docs/rules/prefer-date-now.md) - Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch. *(fixable)*
- [prefer-default-parameters](docs/rules/prefer-default-parameters.md) - Prefer default parameters over reassignment. *(fixable)*
- [prefer-dom-node-append](docs/rules/prefer-dom-node-append.md) - Prefer `Node#append()` over `Node#appendChild()`. *(fixable)*
- [prefer-dom-node-dataset](docs/rules/prefer-dom-node-dataset.md) - Prefer using `.dataset` on DOM elements over `.setAttribute(…)`. *(fixable)*
- [prefer-dom-node-remove](docs/rules/prefer-dom-node-remove.md) - Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`. *(fixable)*
- [prefer-dom-node-text-content](docs/rules/prefer-dom-node-text-content.md) - Prefer `.textContent` over `.innerText`. *(fixable)*
- [prefer-includes](docs/rules/prefer-includes.md) - Prefer `.includes()` over `.indexOf()` and `Array#some()` when checking for existence or non-existence. *(partly fixable)*
- [prefer-keyboard-event-key](docs/rules/prefer-keyboard-event-key.md) - Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`. *(partly fixable)*
- [prefer-math-trunc](docs/rules/prefer-math-trunc.md) - Enforce the use of `Math.trunc` instead of bitwise operators. *(partly fixable)*
- [prefer-modern-dom-apis](docs/rules/prefer-modern-dom-apis.md) - Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`. *(fixable)*
- [prefer-negative-index](docs/rules/prefer-negative-index.md) - Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()` and `Array#splice()`. *(fixable)*
- [prefer-number-properties](docs/rules/prefer-number-properties.md) - Prefer `Number` static properties over global ones. *(fixable)*
- [prefer-optional-catch-binding](docs/rules/prefer-optional-catch-binding.md) - Prefer omitting the `catch` binding parameter. *(fixable)*
- [prefer-query-selector](docs/rules/prefer-query-selector.md) - Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`. *(partly fixable)*
- [prefer-reflect-apply](docs/rules/prefer-reflect-apply.md) - Prefer `Reflect.apply()` over `Function#apply()`. *(fixable)*
- [prefer-regexp-test](docs/rules/prefer-regexp-test.md) - Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`. *(fixable)*
- [prefer-set-has](docs/rules/prefer-set-has.md) - Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence. *(fixable)*
- [prefer-spread](docs/rules/prefer-spread.md) - Prefer the spread operator over `Array.from()` and `Array#concat()`. *(partly fixable)*
- [prefer-string-replace-all](docs/rules/prefer-string-replace-all.md) - Prefer `String#replaceAll()` over regex searches with the global flag. *(fixable)*
- [prefer-string-slice](docs/rules/prefer-string-slice.md) - Prefer `String#slice()` over `String#substr()` and `String#substring()`. *(partly fixable)*
- [prefer-string-starts-ends-with](docs/rules/prefer-string-starts-ends-with.md) - Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`. *(fixable)*
- [prefer-string-trim-start-end](docs/rules/prefer-string-trim-start-end.md) - Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`. *(fixable)*
- [prefer-ternary](docs/rules/prefer-ternary.md) - Prefer ternary expressions over simple `if-else` statements. *(fixable)*
- [prefer-type-error](docs/rules/prefer-type-error.md) - Enforce throwing `TypeError` in type checking conditions. *(fixable)*
- [prevent-abbreviations](docs/rules/prevent-abbreviations.md) - Prevent abbreviations. *(partly fixable)*
- [string-content](docs/rules/string-content.md) - Enforce better string content. *(fixable)*
- [throw-new-error](docs/rules/throw-new-error.md) - Require `new` when throwing an error. *(fixable)*

## Deprecated Rules

See [docs/deprecated-rules.md](docs/deprecated-rules.md)

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
