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
			<th width="250">Name</th>
			<th>Description</th>
			<th>✅</th>
			<th>🔧</th>
		</tr>
	</thead>
	<tbody>
		<tr><td><a href="docs/rules/better-regex.md">better-regex</a></td><td><span markdown=1>Improve regexes by making them shorter, consistent, and safer.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/catch-error-name.md">catch-error-name</a></td><td><span markdown=1>Enforce a specific parameter name in catch clauses.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/consistent-destructuring.md">consistent-destructuring</a></td><td><span markdown=1>Use destructured variables over properties.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/consistent-function-scoping.md">consistent-function-scoping</a></td><td><span markdown=1>Move function definitions to the highest possible scope.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/custom-error-definition.md">custom-error-definition</a></td><td><span markdown=1>Enforce correct `Error` subclassing.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/empty-brace-spaces.md">empty-brace-spaces</a></td><td><span markdown=1>Enforce no spaces between braces.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/error-message.md">error-message</a></td><td><span markdown=1>Enforce passing a `message` value when creating a built-in error.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/escape-case.md">escape-case</a></td><td><span markdown=1>Require escape sequences to use uppercase values.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/expiring-todo-comments.md">expiring-todo-comments</a></td><td><span markdown=1>Add expiration conditions to TODO comments.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/explicit-length-check.md">explicit-length-check</a></td><td><span markdown=1>Enforce explicitly comparing the `length` property of a value.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/filename-case.md">filename-case</a></td><td><span markdown=1>Enforce a case style for filenames.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/import-index.md">import-index</a></td><td><span markdown=1>Enforce importing index files with `.`.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/import-style.md">import-style</a></td><td><span markdown=1>Enforce specific import styles per module.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/new-for-builtins.md">new-for-builtins</a></td><td><span markdown=1>Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-abusive-eslint-disable.md">no-abusive-eslint-disable</a></td><td><span markdown=1>Enforce specifying rules to disable in `eslint-disable` comments.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-array-callback-reference.md">no-array-callback-reference</a></td><td><span markdown=1>Prevent passing a function reference directly to iterator methods.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-array-for-each.md">no-array-for-each</a></td><td><span markdown=1>Prefer `for…of` over `Array#forEach(…)`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-array-push-push.md">no-array-push-push</a></td><td><span markdown=1>Enforce combining multiple `Array#push()` into one call.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-array-reduce.md">no-array-reduce</a></td><td><span markdown=1>Disallow `Array#reduce()` and `Array#reduceRight()`.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-console-spaces.md">no-console-spaces</a></td><td><span markdown=1>Do not use leading/trailing space between `console.log` parameters.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-for-loop.md">no-for-loop</a></td><td><span markdown=1>Do not use a `for` loop that can be replaced with a `for-of` loop.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-hex-escape.md">no-hex-escape</a></td><td><span markdown=1>Enforce the use of Unicode escapes instead of hexadecimal escapes.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-instanceof-array.md">no-instanceof-array</a></td><td><span markdown=1>Require `Array.isArray()` instead of `instanceof Array`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-keyword-prefix.md">no-keyword-prefix</a></td><td><span markdown=1>Disallow identifiers starting with `new` or `class`.</span></td><td></td><td></td></tr>
<tr><td><a href="docs/rules/no-lonely-if.md">no-lonely-if</a></td><td><span markdown=1>Disallow `if` statements as the only statement in `if` blocks without `else`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-nested-ternary.md">no-nested-ternary</a></td><td><span markdown=1>Disallow nested ternary expressions.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-new-array.md">no-new-array</a></td><td><span markdown=1>Disallow `new Array()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-new-buffer.md">no-new-buffer</a></td><td><span markdown=1>Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-null.md">no-null</a></td><td><span markdown=1>Disallow the use of the `null` literal.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-object-as-default-parameter.md">no-object-as-default-parameter</a></td><td><span markdown=1>Disallow the use of objects as default parameters.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-process-exit.md">no-process-exit</a></td><td><span markdown=1>Disallow `process.exit()`.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-static-only-class.md">no-static-only-class</a></td><td><span markdown=1>Forbid classes that only have static members.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-this-assignment.md">no-this-assignment</a></td><td><span markdown=1>Disallow assigning `this` to a variable.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/no-unreadable-array-destructuring.md">no-unreadable-array-destructuring</a></td><td><span markdown=1>Disallow unreadable array destructuring.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-unsafe-regex.md">no-unsafe-regex</a></td><td><span markdown=1>Disallow unsafe regular expressions.</span></td><td></td><td></td></tr>
<tr><td><a href="docs/rules/no-unused-properties.md">no-unused-properties</a></td><td><span markdown=1>Disallow unused object properties.</span></td><td></td><td></td></tr>
<tr><td><a href="docs/rules/no-useless-undefined.md">no-useless-undefined</a></td><td><span markdown=1>Disallow useless `undefined`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/no-zero-fractions.md">no-zero-fractions</a></td><td><span markdown=1>Disallow number literals with zero fractions or dangling dots.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/number-literal-case.md">number-literal-case</a></td><td><span markdown=1>Enforce proper case for numeric literals.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/numeric-separators-style.md">numeric-separators-style</a></td><td><span markdown=1>Enforce the style of numeric separators by correctly grouping digits.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-add-event-listener.md">prefer-add-event-listener</a></td><td><span markdown=1>Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-array-find.md">prefer-array-find</a></td><td><span markdown=1>Prefer `.find(…)` over the first element from `.filter(…)`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-array-flat.md">prefer-array-flat</a></td><td><span markdown=1>Prefer `Array#flat()` over legacy techniques to flatten arrays.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-array-flat-map.md">prefer-array-flat-map</a></td><td><span markdown=1>Prefer `.flatMap(…)` over `.map(…).flat()`.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-array-index-of.md">prefer-array-index-of</a></td><td><span markdown=1>Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-array-some.md">prefer-array-some</a></td><td><span markdown=1>Prefer `.some(…)` over `.find(…)`.</span></td><td>✅</td><td></td></tr>
<tr><td><a href="docs/rules/prefer-date-now.md">prefer-date-now</a></td><td><span markdown=1>Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-default-parameters.md">prefer-default-parameters</a></td><td><span markdown=1>Prefer default parameters over reassignment.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-dom-node-append.md">prefer-dom-node-append</a></td><td><span markdown=1>Prefer `Node#append()` over `Node#appendChild()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-dom-node-dataset.md">prefer-dom-node-dataset</a></td><td><span markdown=1>Prefer using `.dataset` on DOM elements over `.setAttribute(…)`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-dom-node-remove.md">prefer-dom-node-remove</a></td><td><span markdown=1>Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-dom-node-text-content.md">prefer-dom-node-text-content</a></td><td><span markdown=1>Prefer `.textContent` over `.innerText`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-includes.md">prefer-includes</a></td><td><span markdown=1>Prefer `.includes()` over `.indexOf()` and `Array#some()` when checking for existence or non-existence.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-keyboard-event-key.md">prefer-keyboard-event-key</a></td><td><span markdown=1>Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-math-trunc.md">prefer-math-trunc</a></td><td><span markdown=1>Enforce the use of `Math.trunc` instead of bitwise operators.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-modern-dom-apis.md">prefer-modern-dom-apis</a></td><td><span markdown=1>Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-negative-index.md">prefer-negative-index</a></td><td><span markdown=1>Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()` and `Array#splice()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-number-properties.md">prefer-number-properties</a></td><td><span markdown=1>Prefer `Number` static properties over global ones.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-optional-catch-binding.md">prefer-optional-catch-binding</a></td><td><span markdown=1>Prefer omitting the `catch` binding parameter.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-query-selector.md">prefer-query-selector</a></td><td><span markdown=1>Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-reflect-apply.md">prefer-reflect-apply</a></td><td><span markdown=1>Prefer `Reflect.apply()` over `Function#apply()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-regexp-test.md">prefer-regexp-test</a></td><td><span markdown=1>Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-set-has.md">prefer-set-has</a></td><td><span markdown=1>Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-spread.md">prefer-spread</a></td><td><span markdown=1>Prefer the spread operator over `Array.from(…)`, `Array#concat(…)` and `Array#slice()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-string-replace-all.md">prefer-string-replace-all</a></td><td><span markdown=1>Prefer `String#replaceAll()` over regex searches with the global flag.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-string-slice.md">prefer-string-slice</a></td><td><span markdown=1>Prefer `String#slice()` over `String#substr()` and `String#substring()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-string-starts-ends-with.md">prefer-string-starts-ends-with</a></td><td><span markdown=1>Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-string-trim-start-end.md">prefer-string-trim-start-end</a></td><td><span markdown=1>Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-switch.md">prefer-switch</a></td><td><span markdown=1>Prefer `switch` over multiple `else-if`.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-ternary.md">prefer-ternary</a></td><td><span markdown=1>Prefer ternary expressions over simple `if-else` statements.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prefer-type-error.md">prefer-type-error</a></td><td><span markdown=1>Enforce throwing `TypeError` in type checking conditions.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/prevent-abbreviations.md">prevent-abbreviations</a></td><td><span markdown=1>Prevent abbreviations.</span></td><td>✅</td><td>🔧</td></tr>
<tr><td><a href="docs/rules/string-content.md">string-content</a></td><td><span markdown=1>Enforce better string content.</span></td><td></td><td>🔧</td></tr>
<tr><td><a href="docs/rules/throw-new-error.md">throw-new-error</a></td><td><span markdown=1>Require `new` when throwing an error.</span></td><td>✅</td><td>🔧</td></tr>
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
