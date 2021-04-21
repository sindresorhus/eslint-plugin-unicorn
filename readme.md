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
			"unicorn/no-static-only-class": "error",
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
			"unicorn/prefer-array-flat": "error",
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
			"unicorn/prefer-switch": "error",
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

Each rule has emojis denoting:

* ✅ if it belongs to the `recommended` configuration
* 🔧 if some problems reported by the rule are automatically fixable by the `--fix` [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) option

<!-- Do not manually modify this table. Run: `npm run generate-rules-table` -->
<!-- RULES_TABLE_START -->

<table>
	<thead>
		<tr>
			<th>Name</th>
			<th>Description</th>
			<th>✅</th>
			<th>🔧</th>
		</tr>
	</thead>
	<tbody>
		<tr><td width="250"><a href="docs/rules/better-regex.md">better-regex</a></td><td>Improve regexes by making them shorter, consistent, and safer.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/catch-error-name.md">catch-error-name</a></td><td>Enforce a specific parameter name in catch clauses.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/consistent-destructuring.md">consistent-destructuring</a></td><td>Use destructured variables over properties.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/consistent-function-scoping.md">consistent-function-scoping</a></td><td>Move function definitions to the highest possible scope.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/custom-error-definition.md">custom-error-definition</a></td><td>Enforce correct `Error` subclassing.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/empty-brace-spaces.md">empty-brace-spaces</a></td><td>Enforce no spaces between braces.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/error-message.md">error-message</a></td><td>Enforce passing a `message` value when creating a built-in error.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/escape-case.md">escape-case</a></td><td>Require escape sequences to use uppercase values.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/expiring-todo-comments.md">expiring-todo-comments</a></td><td>Add expiration conditions to TODO comments.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/explicit-length-check.md">explicit-length-check</a></td><td>Enforce explicitly comparing the `length` property of a value.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/filename-case.md">filename-case</a></td><td>Enforce a case style for filenames.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/import-index.md">import-index</a></td><td>Enforce importing index files with `.`.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/import-style.md">import-style</a></td><td>Enforce specific import styles per module.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/new-for-builtins.md">new-for-builtins</a></td><td>Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-abusive-eslint-disable.md">no-abusive-eslint-disable</a></td><td>Enforce specifying rules to disable in `eslint-disable` comments.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-array-callback-reference.md">no-array-callback-reference</a></td><td>Prevent passing a function reference directly to iterator methods.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-array-for-each.md">no-array-for-each</a></td><td>Prefer `for…of` over `Array#forEach(…)`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-array-push-push.md">no-array-push-push</a></td><td>Enforce combining multiple `Array#push()` into one call.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-array-reduce.md">no-array-reduce</a></td><td>Disallow `Array#reduce()` and `Array#reduceRight()`.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-console-spaces.md">no-console-spaces</a></td><td>Do not use leading/trailing space between `console.log` parameters.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-for-loop.md">no-for-loop</a></td><td>Do not use a `for` loop that can be replaced with a `for-of` loop.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-hex-escape.md">no-hex-escape</a></td><td>Enforce the use of Unicode escapes instead of hexadecimal escapes.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-instanceof-array.md">no-instanceof-array</a></td><td>Require `Array.isArray()` instead of `instanceof Array`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-keyword-prefix.md">no-keyword-prefix</a></td><td>Disallow identifiers starting with `new` or `class`.</td><td></td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-lonely-if.md">no-lonely-if</a></td><td>Disallow `if` statements as the only statement in `if` blocks without `else`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-nested-ternary.md">no-nested-ternary</a></td><td>Disallow nested ternary expressions.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-new-array.md">no-new-array</a></td><td>Disallow `new Array()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-new-buffer.md">no-new-buffer</a></td><td>Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-null.md">no-null</a></td><td>Disallow the use of the `null` literal.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-object-as-default-parameter.md">no-object-as-default-parameter</a></td><td>Disallow the use of objects as default parameters.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-process-exit.md">no-process-exit</a></td><td>Disallow `process.exit()`.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-static-only-class.md">no-static-only-class</a></td><td>Forbid classes that only have static members.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-this-assignment.md">no-this-assignment</a></td><td>Disallow assigning `this` to a variable.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-unreadable-array-destructuring.md">no-unreadable-array-destructuring</a></td><td>Disallow unreadable array destructuring.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-unsafe-regex.md">no-unsafe-regex</a></td><td>Disallow unsafe regular expressions.</td><td></td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-unused-properties.md">no-unused-properties</a></td><td>Disallow unused object properties.</td><td></td><td></td></tr>
<tr><td width="250"><a href="docs/rules/no-useless-undefined.md">no-useless-undefined</a></td><td>Disallow useless `undefined`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/no-zero-fractions.md">no-zero-fractions</a></td><td>Disallow number literals with zero fractions or dangling dots.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/number-literal-case.md">number-literal-case</a></td><td>Enforce proper case for numeric literals.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/numeric-separators-style.md">numeric-separators-style</a></td><td>Enforce the style of numeric separators by correctly grouping digits.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-add-event-listener.md">prefer-add-event-listener</a></td><td>Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-array-find.md">prefer-array-find</a></td><td>Prefer `.find(…)` over the first element from `.filter(…)`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-array-flat.md">prefer-array-flat</a></td><td>Prefer `.flatMap(…)` over `.map(…).flat()`.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-array-flat-map.md">prefer-array-flat-map</a></td><td>Prefer `Array#flat()` over legacy techniques to flatten arrays.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-array-index-of.md">prefer-array-index-of</a></td><td>Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-array-some.md">prefer-array-some</a></td><td>Prefer `.some(…)` over `.find(…)`.</td><td>✅</td><td></td></tr>
<tr><td width="250"><a href="docs/rules/prefer-date-now.md">prefer-date-now</a></td><td>Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-default-parameters.md">prefer-default-parameters</a></td><td>Prefer default parameters over reassignment.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-dom-node-append.md">prefer-dom-node-append</a></td><td>Prefer `Node#append()` over `Node#appendChild()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-dom-node-dataset.md">prefer-dom-node-dataset</a></td><td>Prefer using `.dataset` on DOM elements over `.setAttribute(…)`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-dom-node-remove.md">prefer-dom-node-remove</a></td><td>Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-dom-node-text-content.md">prefer-dom-node-text-content</a></td><td>Prefer `.textContent` over `.innerText`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-includes.md">prefer-includes</a></td><td>Prefer `.includes()` over `.indexOf()` and `Array#some()` when checking for existence or non-existence.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-keyboard-event-key.md">prefer-keyboard-event-key</a></td><td>Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-math-trunc.md">prefer-math-trunc</a></td><td>Enforce the use of `Math.trunc` instead of bitwise operators.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-modern-dom-apis.md">prefer-modern-dom-apis</a></td><td>Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-negative-index.md">prefer-negative-index</a></td><td>Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()` and `Array#splice()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-number-properties.md">prefer-number-properties</a></td><td>Prefer `Number` static properties over global ones.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-optional-catch-binding.md">prefer-optional-catch-binding</a></td><td>Prefer omitting the `catch` binding parameter.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-query-selector.md">prefer-query-selector</a></td><td>Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-reflect-apply.md">prefer-reflect-apply</a></td><td>Prefer `Reflect.apply()` over `Function#apply()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-regexp-test.md">prefer-regexp-test</a></td><td>Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-set-has.md">prefer-set-has</a></td><td>Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-spread.md">prefer-spread</a></td><td>Prefer the spread operator over `Array.from(…)`, `Array#concat(…)` and `Array#slice()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-string-replace-all.md">prefer-string-replace-all</a></td><td>Prefer `String#replaceAll()` over regex searches with the global flag.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-string-slice.md">prefer-string-slice</a></td><td>Prefer `String#slice()` over `String#substr()` and `String#substring()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-string-starts-ends-with.md">prefer-string-starts-ends-with</a></td><td>Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-string-trim-start-end.md">prefer-string-trim-start-end</a></td><td>Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-switch.md">prefer-switch</a></td><td>Prefer `switch` over multiple `else-if`.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-ternary.md">prefer-ternary</a></td><td>Prefer ternary expressions over simple `if-else` statements.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prefer-type-error.md">prefer-type-error</a></td><td>Enforce throwing `TypeError` in type checking conditions.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/prevent-abbreviations.md">prevent-abbreviations</a></td><td>Prevent abbreviations.</td><td>✅</td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/string-content.md">string-content</a></td><td>Enforce better string content.</td><td></td><td>🔧</td></tr>
<tr><td width="250"><a href="docs/rules/throw-new-error.md">throw-new-error</a></td><td>Require `new` when throwing an error.</td><td>✅</td><td>🔧</td></tr>
	</tbody>
</table>

<!-- RULES_TABLE_END -->

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
