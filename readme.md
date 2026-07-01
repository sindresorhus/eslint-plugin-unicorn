# eslint-plugin-unicorn [![Coverage Status](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main/graph/badge.svg)](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main) [![npm version](https://img.shields.io/npm/v/eslint-plugin-unicorn.svg?style=flat)](https://npmjs.com/package/eslint-plugin-unicorn)

<!-- markdownlint-disable-next-line no-inline-html -->
<img src="https://cloud.githubusercontent.com/assets/170270/18659176/1cc373d0-7f33-11e6-890f-0ba35362ee7e.jpg" width="180" align="right" alt="Unicorn">

> More than 300 powerful ESLint rules

Most rules target JavaScript and TypeScript, but [some also lint CSS, HTML, JSON, and Markdown](#non-javascript-files) when used with the matching ESLint language plugin.

[**Propose a new rule ➡**](.github/contributing.md)

*We do not accept pull requests because of too much AI slop.*

## Install

```sh
npm install --save-dev eslint eslint-plugin-unicorn
```

**Requires ESLint `>=10.4`, [flat config](https://eslint.org/docs/latest/use/configure/configuration-files), and [ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#how-can-i-make-my-typescript-project-output-esm).**

*You might want to check out [XO](https://github.com/xojs/xo), which includes this plugin.*

## Usage

Use a [preset config](#preset-configs) or configure each rule in `eslint.config.js`.

If you don't use a preset, set the same `languageOptions` as shown below.

```js
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
	{
		files: ['**/*.js'],
		languageOptions: {
			globals: globals.builtin,
		},
		plugins: {
			unicorn,
		},
		rules: {
			'unicorn/prefer-module': 'error',
			'unicorn/…': 'error',
		},
	},
	// …
]);
```

For TypeScript, scope Unicorn to TypeScript files and configure a TypeScript parser for the same config object:

```js
import typescriptEslintParser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: globals.builtin,
			parser: typescriptEslintParser,
		},
		plugins: {
			unicorn,
		},
		rules: {
			'unicorn/prefer-module': 'error',
			'unicorn/…': 'error',
		},
	},
	// …
]);
```

## Rules

<!-- Do not manually modify this list. Run: `npm run fix:eslint-docs` -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) enabled in.\
✅ Set in the `recommended` [configuration](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).\
☑️ Set in the `unopinionated` [configuration](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).\
💭 Requires [type information](https://typescript-eslint.io/linting/typed-linting).

| Name                                                                                                       | Description                                                                                                                    | 💼   | 🔧 | 💡 | 💭 |
| :--------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--- | :- | :- | :- |
| [better-dom-traversing](docs/rules/better-dom-traversing.md)                                               | Prefer better DOM traversal APIs.                                                                                              | ✅ ☑️ |    | 💡 |    |
| [catch-error-name](docs/rules/catch-error-name.md)                                                         | Enforce a specific parameter name in catch clauses.                                                                            | ✅    | 🔧 |    |    |
| [class-reference-in-static-methods](docs/rules/class-reference-in-static-methods.md)                       | Enforce consistent class references in static methods.                                                                         | ✅    |    | 💡 |    |
| [comment-content](docs/rules/comment-content.md)                                                           | Enforce better comment content.                                                                                                |      | 🔧 |    |    |
| [consistent-assert](docs/rules/consistent-assert.md)                                                       | Enforce consistent assertion style with `node:assert`.                                                                         | ✅    | 🔧 |    |    |
| [consistent-boolean-name](docs/rules/consistent-boolean-name.md)                                           | Enforce consistent naming for boolean names.                                                                                   | ✅    | 🔧 | 💡 |    |
| [consistent-class-member-order](docs/rules/consistent-class-member-order.md)                               | Enforce consistent class member order.                                                                                         | ✅    |    | 💡 |    |
| [consistent-compound-words](docs/rules/consistent-compound-words.md)                                       | Enforce consistent spelling of compound words in identifiers.                                                                  | ✅ ☑️ |    | 💡 |    |
| [consistent-conditional-object-spread](docs/rules/consistent-conditional-object-spread.md)                 | Enforce consistent conditional object spread style.                                                                            | ✅    | 🔧 |    |    |
| [consistent-date-clone](docs/rules/consistent-date-clone.md)                                               | Prefer passing `Date` directly to the constructor when cloning.                                                                | ✅ ☑️ | 🔧 |    |    |
| [consistent-destructuring](docs/rules/consistent-destructuring.md)                                         | Use destructured variables over properties.                                                                                    |      |    | 💡 |    |
| [consistent-empty-array-spread](docs/rules/consistent-empty-array-spread.md)                               | Prefer consistent types when spreading a ternary in an array literal.                                                          | ✅    | 🔧 |    |    |
| [consistent-existence-index-check](docs/rules/consistent-existence-index-check.md)                         | Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`. | ✅ ☑️ | 🔧 |    |    |
| [consistent-export-decorator-position](docs/rules/consistent-export-decorator-position.md)                 | Enforce consistent decorator position on exported classes.                                                                     | ✅ ☑️ | 🔧 |    |    |
| [consistent-function-scoping](docs/rules/consistent-function-scoping.md)                                   | Move function definitions to the highest possible scope.                                                                       | ✅    |    |    |    |
| [consistent-function-style](docs/rules/consistent-function-style.md)                                       | Enforce function syntax by role.                                                                                               |      |    | 💡 |    |
| [consistent-json-file-read](docs/rules/consistent-json-file-read.md)                                       | Enforce consistent JSON file reads before `JSON.parse()`.                                                                      | ✅    | 🔧 |    |    |
| [consistent-optional-chaining](docs/rules/consistent-optional-chaining.md)                                 | Enforce consistent optional chaining for same-base member access.                                                              | ✅ ☑️ |    | 💡 |    |
| [consistent-template-literal-escape](docs/rules/consistent-template-literal-escape.md)                     | Enforce consistent style for escaping `${` in template literals.                                                               | ✅    | 🔧 |    |    |
| [consistent-tuple-labels](docs/rules/consistent-tuple-labels.md)                                           | Enforce consistent labels on tuple type elements.                                                                              | ✅    |    |    |    |
| [custom-error-definition](docs/rules/custom-error-definition.md)                                           | Enforce correct `Error` subclassing.                                                                                           |      | 🔧 |    |    |
| [default-export-style](docs/rules/default-export-style.md)                                                 | Enforce consistent default export declarations.                                                                                | ✅    | 🔧 | 💡 |    |
| [dom-node-dataset](docs/rules/dom-node-dataset.md)                                                         | Enforce consistent style for DOM element dataset access.                                                                       | ✅ ☑️ | 🔧 |    |    |
| [empty-brace-spaces](docs/rules/empty-brace-spaces.md)                                                     | Enforce no spaces between braces.                                                                                              | ✅    | 🔧 |    |    |
| [error-message](docs/rules/error-message.md)                                                               | Enforce passing a `message` value when creating a built-in error.                                                              | ✅ ☑️ |    |    |    |
| [escape-case](docs/rules/escape-case.md)                                                                   | Require escape sequences to use uppercase or lowercase values.                                                                 | ✅ ☑️ | 🔧 |    |    |
| [expiring-todo-comments](docs/rules/expiring-todo-comments.md)                                             | Add expiration conditions to TODO comments.                                                                                    | ✅ ☑️ |    |    |    |
| [explicit-length-check](docs/rules/explicit-length-check.md)                                               | Enforce explicitly comparing the `length` or `size` property of a value.                                                       | ✅    | 🔧 | 💡 |    |
| [explicit-timer-delay](docs/rules/explicit-timer-delay.md)                                                 | Enforce or disallow explicit `delay` argument for `setTimeout()` and `setInterval()`.                                          | ✅ ☑️ | 🔧 |    |    |
| [filename-case](docs/rules/filename-case.md)                                                               | Enforce a case style for filenames and directory names.                                                                        | ✅    |    |    |    |
| [id-match](docs/rules/id-match.md)                                                                         | Require identifiers to match a specified regular expression.                                                                   |      |    |    |    |
| [import-style](docs/rules/import-style.md)                                                                 | Enforce specific import styles per module.                                                                                     | ✅ ☑️ |    |    |    |
| [isolated-functions](docs/rules/isolated-functions.md)                                                     | Prevent usage of variables from outside the scope of isolated functions.                                                       | ✅    |    |    |    |
| [logical-assignment-operators](docs/rules/logical-assignment-operators.md)                                 | Require or disallow logical assignment operator shorthand                                                                      | ✅    | 🔧 | 💡 |    |
| [max-nested-calls](docs/rules/max-nested-calls.md)                                                         | Limit the depth of nested calls.                                                                                               | ✅    |    |    |    |
| [name-replacements](docs/rules/name-replacements.md)                                                       | Enforce replacements for variable, property, and filenames.                                                                    | ✅    | 🔧 | 💡 |    |
| [new-for-builtins](docs/rules/new-for-builtins.md)                                                         | Enforce correct use of `new` for builtin constructors.                                                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md)                                       | Enforce specifying rules to disable in `eslint-disable` comments.                                                              | ✅ ☑️ |    |    |    |
| [no-accessor-recursion](docs/rules/no-accessor-recursion.md)                                               | Disallow recursive access to `this` within getters and setters.                                                                | ✅ ☑️ |    |    |    |
| [no-accidental-bitwise-operator](docs/rules/no-accidental-bitwise-operator.md)                             | Disallow bitwise operators where a logical operator was likely intended.                                                       | ✅ ☑️ |    | 💡 |    |
| [no-anonymous-default-export](docs/rules/no-anonymous-default-export.md)                                   | Disallow anonymous functions and classes as the default export.                                                                | ✅ ☑️ |    | 💡 |    |
| [no-array-callback-reference](docs/rules/no-array-callback-reference.md)                                   | Prevent passing a function reference directly to iterator methods.                                                             | ✅    |    | 💡 |    |
| [no-array-concat-in-loop](docs/rules/no-array-concat-in-loop.md)                                           | Disallow array accumulation with `Array#concat()` in loops.                                                                    | ✅    |    |    |    |
| [no-array-fill-with-reference-type](docs/rules/no-array-fill-with-reference-type.md)                       | Disallow using reference values as `Array#fill()` values.                                                                      | ✅ ☑️ |    |    |    |
| [no-array-from-fill](docs/rules/no-array-from-fill.md)                                                     | Disallow `.fill()` after `Array.from({length: …})`.                                                                            | ✅ ☑️ |    |    |    |
| [no-array-front-mutation](docs/rules/no-array-front-mutation.md)                                           | Disallow front-of-array mutation.                                                                                              |      |    |    |    |
| [no-array-method-this-argument](docs/rules/no-array-method-this-argument.md)                               | Disallow using the `this` argument in array methods.                                                                           | ✅ ☑️ | 🔧 | 💡 |    |
| [no-array-reduce](docs/rules/no-array-reduce.md)                                                           | Disallow `Array#reduce()` and `Array#reduceRight()`.                                                                           | ✅    | 🔧 | 💡 |    |
| [no-array-reverse](docs/rules/no-array-reverse.md)                                                         | Prefer `Array#toReversed()` over `Array#reverse()`.                                                                            | ✅ ☑️ |    | 💡 |    |
| [no-array-sort](docs/rules/no-array-sort.md)                                                               | Prefer `Array#toSorted()` over `Array#sort()`.                                                                                 | ✅ ☑️ |    | 💡 |    |
| [no-array-sort-for-min-max](docs/rules/no-array-sort-for-min-max.md)                                       | Disallow sorting arrays to get the minimum or maximum value.                                                                   | ✅ ☑️ |    | 💡 |    |
| [no-array-splice](docs/rules/no-array-splice.md)                                                           | Prefer `Array#toSpliced()` over `Array#splice()`.                                                                              | ✅    |    | 💡 |    |
| [no-asterisk-prefix-in-documentation-comments](docs/rules/no-asterisk-prefix-in-documentation-comments.md) | Disallow asterisk prefixes in documentation comments.                                                                          |      | 🔧 |    |    |
| [no-async-promise-finally](docs/rules/no-async-promise-finally.md)                                         | Disallow async functions as `Promise#finally()` callbacks.                                                                     | ✅ ☑️ |    |    |    |
| [no-await-expression-member](docs/rules/no-await-expression-member.md)                                     | Disallow member access from await expression.                                                                                  | ✅    | 🔧 |    |    |
| [no-await-in-promise-methods](docs/rules/no-await-in-promise-methods.md)                                   | Disallow using `await` in `Promise` method parameters.                                                                         | ✅ ☑️ |    | 💡 |    |
| [no-blob-to-file](docs/rules/no-blob-to-file.md)                                                           | Disallow unnecessary `Blob` to `File` conversion.                                                                              | ✅ ☑️ |    | 💡 |    |
| [no-boolean-sort-comparator](docs/rules/no-boolean-sort-comparator.md)                                     | Disallow boolean-returning sort comparators.                                                                                   | ✅ ☑️ |    | 💡 |    |
| [no-break-in-nested-loop](docs/rules/no-break-in-nested-loop.md)                                           | Disallow `break` and `continue` in nested loops and switches inside loops.                                                     | ✅    |    |    |    |
| [no-canvas-to-image](docs/rules/no-canvas-to-image.md)                                                     | Prefer drawing canvases directly instead of converting them to images.                                                         | ✅ ☑️ |    |    |    |
| [no-chained-comparison](docs/rules/no-chained-comparison.md)                                               | Disallow chained comparisons such as `a < b < c`.                                                                              | ✅ ☑️ |    | 💡 |    |
| [no-collection-bracket-access](docs/rules/no-collection-bracket-access.md)                                 | Disallow accessing `Map`, `Set`, `WeakMap`, and `WeakSet` entries with bracket notation.                                       | ✅ ☑️ |    | 💡 |    |
| [no-computed-property-existence-check](docs/rules/no-computed-property-existence-check.md)                 | Disallow dynamic object property existence checks.                                                                             | ✅    |    | 💡 |    |
| [no-confusing-array-splice](docs/rules/no-confusing-array-splice.md)                                       | Disallow confusing uses of `Array#{splice,toSpliced}()`.                                                                       | ✅    |    | 💡 |    |
| [no-confusing-array-with](docs/rules/no-confusing-array-with.md)                                           | Disallow confusing uses of `Array#with()`.                                                                                     | ✅    |    |    |    |
| [no-console-spaces](docs/rules/no-console-spaces.md)                                                       | Do not use leading/trailing space between `console.log` parameters.                                                            | ✅ ☑️ | 🔧 |    |    |
| [no-constant-zero-expression](docs/rules/no-constant-zero-expression.md)                                   | Disallow arithmetic and bitwise operations that always evaluate to `0`.                                                        | ✅ ☑️ |    | 💡 |    |
| [no-declarations-before-early-exit](docs/rules/no-declarations-before-early-exit.md)                       | Disallow declarations before conditional early exits when they are only used after the exit.                                   | ✅ ☑️ | 🔧 |    |    |
| [no-document-cookie](docs/rules/no-document-cookie.md)                                                     | Do not use `document.cookie` directly.                                                                                         | ✅ ☑️ |    |    |    |
| [no-double-comparison](docs/rules/no-double-comparison.md)                                                 | Disallow two comparisons of the same operands that can be combined into one.                                                   | ✅ ☑️ |    | 💡 |    |
| [no-duplicate-if-branches](docs/rules/no-duplicate-if-branches.md)                                         | Disallow duplicate adjacent branches in if chains.                                                                             | ✅    |    |    |    |
| [no-duplicate-logical-operands](docs/rules/no-duplicate-logical-operands.md)                               | Disallow adjacent duplicate operands in logical expressions.                                                                   | ✅ ☑️ | 🔧 | 💡 |    |
| [no-duplicate-loops](docs/rules/no-duplicate-loops.md)                                                     | Disallow `.map()` and `.filter()` in `for…of` and `for await…of` loop headers.                                                 | ✅    |    |    |    |
| [no-duplicate-set-values](docs/rules/no-duplicate-set-values.md)                                           | Disallow duplicate values in `Set` constructor array literals.                                                                 | ✅    |    |    |    |
| [no-empty-file](docs/rules/no-empty-file.md)                                                               | Disallow empty files.                                                                                                          | ✅ ☑️ |    |    |    |
| [no-error-property-assignment](docs/rules/no-error-property-assignment.md)                                 | Disallow assigning to built-in error properties.                                                                               | ✅ ☑️ |    |    |    |
| [no-exports-in-scripts](docs/rules/no-exports-in-scripts.md)                                               | Disallow exports in scripts.                                                                                                   | ✅ ☑️ |    |    |    |
| [no-for-each](docs/rules/no-for-each.md)                                                                   | Prefer `for…of` over the `forEach` method.                                                                                     | ✅ ☑️ | 🔧 | 💡 |    |
| [no-for-loop](docs/rules/no-for-loop.md)                                                                   | Do not use a `for` loop that can be replaced with a `for-of` loop.                                                             | ✅    | 🔧 |    |    |
| [no-global-object-property-assignment](docs/rules/no-global-object-property-assignment.md)                 | Disallow assigning properties on the global object.                                                                            | ✅ ☑️ |    |    |    |
| [no-immediate-mutation](docs/rules/no-immediate-mutation.md)                                               | Disallow immediate mutation after variable assignment.                                                                         | ✅    | 🔧 | 💡 |    |
| [no-impossible-length-comparison](docs/rules/no-impossible-length-comparison.md)                           | Disallow impossible comparisons against `.length` or `.size`.                                                                  | ✅ ☑️ |    |    |    |
| [no-incorrect-query-selector](docs/rules/no-incorrect-query-selector.md)                                   | Disallow incorrect `querySelector()` and `querySelectorAll()` usage.                                                           | ✅    | 🔧 |    |    |
| [no-incorrect-template-string-interpolation](docs/rules/no-incorrect-template-string-interpolation.md)     | Disallow incorrect template literal interpolation syntax.                                                                      | ✅    |    | 💡 |    |
| [no-instanceof-builtins](docs/rules/no-instanceof-builtins.md)                                             | Disallow `instanceof` with built-in objects                                                                                    | ✅ ☑️ | 🔧 | 💡 |    |
| [no-invalid-argument-count](docs/rules/no-invalid-argument-count.md)                                       | Disallow calling functions and constructors with an invalid number of arguments.                                               | ✅ ☑️ |    |    |    |
| [no-invalid-character-comparison](docs/rules/no-invalid-character-comparison.md)                           | Disallow comparing a single character from a string to a multi-character string.                                               | ✅ ☑️ |    |    |    |
| [no-invalid-fetch-options](docs/rules/no-invalid-fetch-options.md)                                         | Disallow invalid options in `fetch()` and `new Request()`.                                                                     | ✅ ☑️ |    |    |    |
| [no-invalid-file-input-accept](docs/rules/no-invalid-file-input-accept.md)                                 | Disallow invalid `accept` values on file inputs.                                                                               |      | 🔧 |    |    |
| [no-invalid-remove-event-listener](docs/rules/no-invalid-remove-event-listener.md)                         | Prevent calling `EventTarget#removeEventListener()` with the result of an expression.                                          | ✅ ☑️ |    |    |    |
| [no-invalid-well-known-symbol-methods](docs/rules/no-invalid-well-known-symbol-methods.md)                 | Disallow invalid implementations of well-known symbol methods.                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [no-keyword-prefix](docs/rules/no-keyword-prefix.md)                                                       | Disallow identifiers starting with `new` or `class`.                                                                           |      |    |    |    |
| [no-late-current-target-access](docs/rules/no-late-current-target-access.md)                               | Disallow accessing `event.currentTarget` after the synchronous event dispatch has finished.                                    | ✅    |    |    |    |
| [no-late-event-control](docs/rules/no-late-event-control.md)                                               | Disallow event-control method calls after the synchronous event dispatch has finished.                                         | ✅    |    |    |    |
| [no-lonely-if](docs/rules/no-lonely-if.md)                                                                 | Disallow `if` statements as the only statement in `if` blocks without `else`.                                                  | ✅ ☑️ | 🔧 |    |    |
| [no-loop-iterable-mutation](docs/rules/no-loop-iterable-mutation.md)                                       | Disallow mutating a loop iterable during iteration.                                                                            | ✅    |    |    |    |
| [no-magic-array-flat-depth](docs/rules/no-magic-array-flat-depth.md)                                       | Disallow a magic number as the `depth` argument in `Array#flat(…).`                                                            | ✅ ☑️ |    |    |    |
| [no-manually-wrapped-comments](docs/rules/no-manually-wrapped-comments.md)                                 | Disallow manually wrapped comments.                                                                                            |      | 🔧 |    |    |
| [no-mismatched-map-key](docs/rules/no-mismatched-map-key.md)                                               | Disallow checking a Map key before accessing a different key.                                                                  | ✅    |    |    |    |
| [no-misrefactored-assignment](docs/rules/no-misrefactored-assignment.md)                                   | Disallow misrefactored compound assignments where the target is duplicated in the right-hand side.                             | ✅ ☑️ |    | 💡 |    |
| [no-named-default](docs/rules/no-named-default.md)                                                         | Disallow named usage of default import and export.                                                                             | ✅ ☑️ | 🔧 |    |    |
| [no-negated-array-predicate](docs/rules/no-negated-array-predicate.md)                                     | Disallow negated array predicate calls.                                                                                        | ✅ ☑️ | 🔧 |    |    |
| [no-negated-comparison](docs/rules/no-negated-comparison.md)                                               | Disallow negated comparisons.                                                                                                  | ✅ ☑️ | 🔧 | 💡 |    |
| [no-negated-condition](docs/rules/no-negated-condition.md)                                                 | Disallow negated conditions.                                                                                                   | ✅ ☑️ | 🔧 |    |    |
| [no-negation-in-equality-check](docs/rules/no-negation-in-equality-check.md)                               | Disallow negated expression in equality check.                                                                                 | ✅ ☑️ |    | 💡 |    |
| [no-nested-ternary](docs/rules/no-nested-ternary.md)                                                       | Disallow nested ternary expressions.                                                                                           | ✅    | 🔧 |    |    |
| [no-new-array](docs/rules/no-new-array.md)                                                                 | Disallow `new Array()`.                                                                                                        | ✅ ☑️ | 🔧 | 💡 |    |
| [no-new-buffer](docs/rules/no-new-buffer.md)                                                               | Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.                              | ✅ ☑️ | 🔧 | 💡 |    |
| [no-non-function-verb-prefix](docs/rules/no-non-function-verb-prefix.md)                                   | Disallow non-function values with function-style verb prefixes.                                                                | ✅    |    |    | 💭 |
| [no-nonstandard-builtin-properties](docs/rules/no-nonstandard-builtin-properties.md)                       | Disallow non-standard properties on built-in objects.                                                                          | ✅ ☑️ |    |    |    |
| [no-null](docs/rules/no-null.md)                                                                           | Disallow the use of the `null` literal.                                                                                        | ✅    | 🔧 | 💡 |    |
| [no-object-as-default-parameter](docs/rules/no-object-as-default-parameter.md)                             | Disallow the use of objects as default parameters.                                                                             | ✅ ☑️ |    |    |    |
| [no-object-methods-with-collections](docs/rules/no-object-methods-with-collections.md)                     | Disallow `Object` methods with `Map` or `Set`.                                                                                 | ✅    |    | 💡 |    |
| [no-optional-chaining-on-undeclared-variable](docs/rules/no-optional-chaining-on-undeclared-variable.md)   | Disallow optional chaining on undeclared variables.                                                                            | ✅    |    |    |    |
| [no-process-exit](docs/rules/no-process-exit.md)                                                           | Disallow `process.exit()`.                                                                                                     | ✅ ☑️ |    |    |    |
| [no-redundant-comparison](docs/rules/no-redundant-comparison.md)                                           | Disallow comparisons made redundant by an equality check in the same logical AND.                                              | ✅ ☑️ | 🔧 | 💡 |    |
| [no-return-array-push](docs/rules/no-return-array-push.md)                                                 | Disallow using the return value of `Array#push()` and `Array#unshift()`.                                                       | ✅    |    | 💡 |    |
| [no-selector-as-dom-name](docs/rules/no-selector-as-dom-name.md)                                           | Disallow selector syntax in DOM names.                                                                                         | ✅    | 🔧 |    |    |
| [no-single-promise-in-promise-methods](docs/rules/no-single-promise-in-promise-methods.md)                 | Disallow passing single-element arrays to `Promise` methods.                                                                   | ✅ ☑️ | 🔧 | 💡 |    |
| [no-static-only-class](docs/rules/no-static-only-class.md)                                                 | Disallow classes that only have static members.                                                                                | ✅ ☑️ | 🔧 |    |    |
| [no-subtraction-comparison](docs/rules/no-subtraction-comparison.md)                                       | Prefer comparing values directly over subtracting and comparing to `0`.                                                        | ✅ ☑️ | 🔧 | 💡 |    |
| [no-thenable](docs/rules/no-thenable.md)                                                                   | Disallow `then` property.                                                                                                      | ✅ ☑️ |    |    |    |
| [no-this-assignment](docs/rules/no-this-assignment.md)                                                     | Disallow assigning `this` to a variable.                                                                                       | ✅ ☑️ |    |    |    |
| [no-this-outside-of-class](docs/rules/no-this-outside-of-class.md)                                         | Disallow `this` outside of classes.                                                                                            | ✅    |    |    |    |
| [no-top-level-assignment-in-function](docs/rules/no-top-level-assignment-in-function.md)                   | Disallow assigning to top-level variables from inside functions.                                                               | ✅    |    |    |    |
| [no-top-level-side-effects](docs/rules/no-top-level-side-effects.md)                                       | Disallow top-level side effects in exported modules.                                                                           | ✅ ☑️ |    |    |    |
| [no-typeof-undefined](docs/rules/no-typeof-undefined.md)                                                   | Disallow comparing `undefined` using `typeof`.                                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [no-uncalled-method](docs/rules/no-uncalled-method.md)                                                     | Disallow referencing methods without calling them.                                                                             | ✅    |    |    |    |
| [no-undeclared-class-members](docs/rules/no-undeclared-class-members.md)                                   | Require class members to be declared.                                                                                          | ✅    |    | 💡 |    |
| [no-unnecessary-array-flat-depth](docs/rules/no-unnecessary-array-flat-depth.md)                           | Disallow using `1` as the `depth` argument of `Array#flat()`.                                                                  | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-array-flat-map](docs/rules/no-unnecessary-array-flat-map.md)                               | Disallow `Array#flatMap()` callbacks that only wrap a single item.                                                             | ✅    | 🔧 | 💡 |    |
| [no-unnecessary-array-splice-count](docs/rules/no-unnecessary-array-splice-count.md)                       | Disallow using `.length` or `Infinity` as the `deleteCount` or `skipCount` argument of `Array#{splice,toSpliced}()`.           | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-await](docs/rules/no-unnecessary-await.md)                                                 | Disallow awaiting non-promise values.                                                                                          | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-boolean-comparison](docs/rules/no-unnecessary-boolean-comparison.md)                       | Disallow unnecessary comparisons against boolean literals.                                                                     | ✅    | 🔧 |    |    |
| [no-unnecessary-fetch-options](docs/rules/no-unnecessary-fetch-options.md)                                 | Disallow unnecessary options in `fetch()` and `new Request()`.                                                                 | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-global-this](docs/rules/no-unnecessary-global-this.md)                                     | Disallow unnecessary `globalThis` references.                                                                                  | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-nested-ternary](docs/rules/no-unnecessary-nested-ternary.md)                               | Disallow unnecessary nested ternary expressions.                                                                               | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-polyfills](docs/rules/no-unnecessary-polyfills.md)                                         | Enforce the use of built-in methods instead of unnecessary polyfills.                                                          | ✅ ☑️ |    |    |    |
| [no-unnecessary-slice-end](docs/rules/no-unnecessary-slice-end.md)                                         | Disallow using `.length` or `Infinity` as the `end` argument of `{Array,String,TypedArray}#slice()`.                           | ✅ ☑️ | 🔧 |    |    |
| [no-unnecessary-splice](docs/rules/no-unnecessary-splice.md)                                               | Disallow `Array#splice()` when simpler alternatives exist.                                                                     | ✅    | 🔧 |    |    |
| [no-unreadable-array-destructuring](docs/rules/no-unreadable-array-destructuring.md)                       | Disallow unreadable array destructuring.                                                                                       | ✅ ☑️ | 🔧 |    |    |
| [no-unreadable-for-of-expression](docs/rules/no-unreadable-for-of-expression.md)                           | Disallow unreadable iterable expressions in `for…of` and `for await…of` loop headers.                                          | ✅    |    |    |    |
| [no-unreadable-iife](docs/rules/no-unreadable-iife.md)                                                     | Disallow unreadable IIFEs.                                                                                                     | ✅ ☑️ |    | 💡 |    |
| [no-unreadable-new-expression](docs/rules/no-unreadable-new-expression.md)                                 | Disallow unreadable `new` expressions.                                                                                         |      |    |    |    |
| [no-unreadable-object-destructuring](docs/rules/no-unreadable-object-destructuring.md)                     | Disallow unreadable object destructuring.                                                                                      | ✅ ☑️ |    |    |    |
| [no-unsafe-buffer-conversion](docs/rules/no-unsafe-buffer-conversion.md)                                   | Prevent unsafe use of ArrayBuffer view `.buffer`.                                                                              | ✅ ☑️ |    | 💡 |    |
| [no-unsafe-dom-html](docs/rules/no-unsafe-dom-html.md)                                                     | Disallow unsafe DOM HTML APIs.                                                                                                 |      |    |    |    |
| [no-unsafe-promise-all-settled-values](docs/rules/no-unsafe-promise-all-settled-values.md)                 | Disallow reading `.value` from `Promise.allSettled()` results without a fulfilled status guard.                                | ✅ ☑️ |    |    |    |
| [no-unsafe-property-key](docs/rules/no-unsafe-property-key.md)                                             | Disallow unsafe values as property keys.                                                                                       | ✅    |    |    |    |
| [no-unsafe-string-replacement](docs/rules/no-unsafe-string-replacement.md)                                 | Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.                                       | ✅    |    |    |    |
| [no-unused-array-method-return](docs/rules/no-unused-array-method-return.md)                               | Disallow ignoring the return value of selected array methods.                                                                  | ✅ ☑️ |    |    |    |
| [no-unused-properties](docs/rules/no-unused-properties.md)                                                 | Disallow unused object properties.                                                                                             |      |    |    |    |
| [no-useless-boolean-cast](docs/rules/no-useless-boolean-cast.md)                                           | Disallow unnecessary `Boolean()` casts in array predicate callbacks.                                                           | ✅ ☑️ | 🔧 |    |    |
| [no-useless-coercion](docs/rules/no-useless-coercion.md)                                                   | Disallow useless type coercions of values that are already of the target type.                                                 | ✅ ☑️ | 🔧 |    |    |
| [no-useless-collection-argument](docs/rules/no-useless-collection-argument.md)                             | Disallow useless values or fallbacks in `Set`, `Map`, `WeakSet`, or `WeakMap`.                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [no-useless-compound-assignment](docs/rules/no-useless-compound-assignment.md)                             | Disallow useless compound assignments such as `x += 0`.                                                                        | ✅ ☑️ |    | 💡 |    |
| [no-useless-concat](docs/rules/no-useless-concat.md)                                                       | Disallow useless concatenation of literals.                                                                                    | ✅ ☑️ | 🔧 |    |    |
| [no-useless-continue](docs/rules/no-useless-continue.md)                                                   | Disallow useless `continue` statements.                                                                                        | ✅ ☑️ | 🔧 |    |    |
| [no-useless-delete-check](docs/rules/no-useless-delete-check.md)                                           | Disallow unnecessary existence checks before deletion.                                                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [no-useless-else](docs/rules/no-useless-else.md)                                                           | Disallow `else` after a statement that exits.                                                                                  | ✅    | 🔧 |    |    |
| [no-useless-error-capture-stack-trace](docs/rules/no-useless-error-capture-stack-trace.md)                 | Disallow unnecessary `Error.captureStackTrace(…)`.                                                                             | ✅ ☑️ | 🔧 |    |    |
| [no-useless-fallback-in-spread](docs/rules/no-useless-fallback-in-spread.md)                               | Disallow useless fallback when spreading in object literals.                                                                   | ✅ ☑️ | 🔧 |    |    |
| [no-useless-iterator-to-array](docs/rules/no-useless-iterator-to-array.md)                                 | Disallow unnecessary `.toArray()` on iterators.                                                                                | ✅ ☑️ | 🔧 | 💡 |    |
| [no-useless-length-check](docs/rules/no-useless-length-check.md)                                           | Disallow useless array length check.                                                                                           | ✅ ☑️ | 🔧 |    |    |
| [no-useless-logical-operand](docs/rules/no-useless-logical-operand.md)                                     | Disallow unnecessary operands in logical expressions involving boolean literals.                                               | ✅ ☑️ | 🔧 |    |    |
| [no-useless-override](docs/rules/no-useless-override.md)                                                   | Disallow useless overrides of class methods.                                                                                   | ✅ ☑️ | 🔧 |    |    |
| [no-useless-promise-resolve-reject](docs/rules/no-useless-promise-resolve-reject.md)                       | Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks                                 | ✅ ☑️ | 🔧 |    |    |
| [no-useless-recursion](docs/rules/no-useless-recursion.md)                                                 | Disallow simple recursive function calls that can be replaced with a loop.                                                     | ✅    |    |    |    |
| [no-useless-spread](docs/rules/no-useless-spread.md)                                                       | Disallow unnecessary spread.                                                                                                   | ✅ ☑️ | 🔧 | 💡 |    |
| [no-useless-switch-case](docs/rules/no-useless-switch-case.md)                                             | Disallow useless case in switch statements.                                                                                    | ✅ ☑️ |    | 💡 |    |
| [no-useless-template-literals](docs/rules/no-useless-template-literals.md)                                 | Disallow useless template literal expressions.                                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [no-useless-undefined](docs/rules/no-useless-undefined.md)                                                 | Disallow useless `undefined`.                                                                                                  | ✅ ☑️ | 🔧 | 💡 |    |
| [no-xor-as-exponentiation](docs/rules/no-xor-as-exponentiation.md)                                         | Disallow the bitwise XOR operator where exponentiation was likely intended.                                                    | ✅ ☑️ |    | 💡 |    |
| [no-zero-fractions](docs/rules/no-zero-fractions.md)                                                       | Disallow number literals with zero fractions or dangling dots.                                                                 | ✅ ☑️ | 🔧 |    |    |
| [number-literal-case](docs/rules/number-literal-case.md)                                                   | Enforce proper case for numeric literals.                                                                                      | ✅ ☑️ | 🔧 |    |    |
| [numeric-separators-style](docs/rules/numeric-separators-style.md)                                         | Enforce the style of numeric separators by correctly grouping digits.                                                          | ✅ ☑️ | 🔧 |    |    |
| [operator-assignment](docs/rules/operator-assignment.md)                                                   | Require assignment operator shorthand where possible.                                                                          | ✅    | 🔧 | 💡 |    |
| [prefer-abort-signal-any](docs/rules/prefer-abort-signal-any.md)                                           | Prefer `AbortSignal.any()` over manually forwarding abort events between signals.                                              | ✅    |    | 💡 |    |
| [prefer-abort-signal-timeout](docs/rules/prefer-abort-signal-timeout.md)                                   | Prefer `AbortSignal.timeout()` over manually aborting an `AbortController` with `setTimeout()`.                                | ✅    |    | 💡 |    |
| [prefer-add-event-listener](docs/rules/prefer-add-event-listener.md)                                       | Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.                                                 | ✅ ☑️ | 🔧 |    |    |
| [prefer-add-event-listener-options](docs/rules/prefer-add-event-listener-options.md)                       | Prefer an options object over a boolean in `.addEventListener()`.                                                              | ✅ ☑️ | 🔧 |    |    |
| [prefer-aggregate-error](docs/rules/prefer-aggregate-error.md)                                             | Prefer `AggregateError` when throwing collected errors.                                                                        | ✅ ☑️ | 🔧 |    |    |
| [prefer-array-find](docs/rules/prefer-array-find.md)                                                       | Prefer `.find(…)` and `.findLast(…)` over the first or last element from `.filter(…)`.                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-array-flat](docs/rules/prefer-array-flat.md)                                                       | Prefer `Array#flat()` over legacy techniques to flatten arrays.                                                                | ✅ ☑️ | 🔧 |    |    |
| [prefer-array-flat-map](docs/rules/prefer-array-flat-map.md)                                               | Prefer `.flatMap(…)` over `.map(…).flat()` and `.filter(…).flatMap(…)`.                                                        | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-array-from-async](docs/rules/prefer-array-from-async.md)                                           | Prefer `Array.fromAsync()` over `for await…of` array accumulation.                                                             | ✅    | 🔧 |    |    |
| [prefer-array-from-map](docs/rules/prefer-array-from-map.md)                                               | Prefer using the `Array.from()` mapping function argument.                                                                     | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-array-from-range](docs/rules/prefer-array-from-range.md)                                           | Prefer `Array.from({length}, …)` when creating range arrays.                                                                   | ✅ ☑️ | 🔧 |    |    |
| [prefer-array-index-of](docs/rules/prefer-array-index-of.md)                                               | Prefer `Array#{indexOf,lastIndexOf}()` over `Array#{findIndex,findLastIndex}()` when looking for the index of an item.         | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-array-iterable-methods](docs/rules/prefer-array-iterable-methods.md)                               | Prefer iterating an array directly or with `Array#keys()` over `Array#entries()` when the index or value is unused.            | ✅    | 🔧 |    |    |
| [prefer-array-last-methods](docs/rules/prefer-array-last-methods.md)                                       | Prefer last-oriented array methods over `Array#reverse()` or `Array#toReversed()` followed by a method.                        | ✅ ☑️ |    | 💡 |    |
| [prefer-array-slice](docs/rules/prefer-array-slice.md)                                                     | Prefer `Array#slice()` over `Array#splice()` when reading from the returned array.                                             | ✅    |    | 💡 |    |
| [prefer-array-some](docs/rules/prefer-array-some.md)                                                       | Prefer `.some(…)` over `.filter(…).length` check and `.{find,findLast,findIndex,findLastIndex}(…)`.                            | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-at](docs/rules/prefer-at.md)                                                                       | Prefer `.at()` method for index access and `String#charAt()`.                                                                  | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-await](docs/rules/prefer-await.md)                                                                 | Prefer `await` over promise chaining.                                                                                          | ✅ ☑️ |    |    |    |
| [prefer-bigint-literals](docs/rules/prefer-bigint-literals.md)                                             | Prefer `BigInt` literals over the constructor.                                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-blob-reading-methods](docs/rules/prefer-blob-reading-methods.md)                                   | Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(…)` and `Blob#text()` over `FileReader#readAsText(…)`.          | ✅ ☑️ |    |    |    |
| [prefer-block-statement-over-iife](docs/rules/prefer-block-statement-over-iife.md)                         | Prefer block statements over IIFEs used only for scoping.                                                                      | ✅ ☑️ | 🔧 |    |    |
| [prefer-boolean-return](docs/rules/prefer-boolean-return.md)                                               | Prefer directly returning boolean expressions over `if` statements.                                                            | ✅ ☑️ | 🔧 |    |    |
| [prefer-class-fields](docs/rules/prefer-class-fields.md)                                                   | Prefer class field declarations over `this` assignments in constructors.                                                       | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-classlist-toggle](docs/rules/prefer-classlist-toggle.md)                                           | Prefer using `Element#classList.toggle()` to toggle class names.                                                               | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-code-point](docs/rules/prefer-code-point.md)                                                       | Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.        | ✅ ☑️ |    | 💡 |    |
| [prefer-continue](docs/rules/prefer-continue.md)                                                           | Prefer early continues over whole-loop conditional wrapping.                                                                   | ✅    | 🔧 |    |    |
| [prefer-date-now](docs/rules/prefer-date-now.md)                                                           | Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.                                                    | ✅ ☑️ | 🔧 |    |    |
| [prefer-default-parameters](docs/rules/prefer-default-parameters.md)                                       | Prefer default parameters over reassignment.                                                                                   | ✅ ☑️ |    | 💡 |    |
| [prefer-direct-iteration](docs/rules/prefer-direct-iteration.md)                                           | Prefer direct iteration over default iterator method calls.                                                                    | ✅ ☑️ | 🔧 |    |    |
| [prefer-dispose](docs/rules/prefer-dispose.md)                                                             | Prefer using `using`/`await using` over manual `try`/`finally` resource disposal.                                              |      |    | 💡 |    |
| [prefer-dom-node-append](docs/rules/prefer-dom-node-append.md)                                             | Prefer `Element#append()` over `Node#appendChild()`.                                                                           | ✅ ☑️ | 🔧 |    |    |
| [prefer-dom-node-html-methods](docs/rules/prefer-dom-node-html-methods.md)                                 | Prefer `.getHTML()` and `.setHTML()` over `.innerHTML`.                                                                        |      | 🔧 | 💡 |    |
| [prefer-dom-node-remove](docs/rules/prefer-dom-node-remove.md)                                             | Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.                                                          | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-dom-node-replace-children](docs/rules/prefer-dom-node-replace-children.md)                         | Prefer `.replaceChildren()` when emptying DOM children.                                                                        | ✅ ☑️ | 🔧 |    |    |
| [prefer-dom-node-text-content](docs/rules/prefer-dom-node-text-content.md)                                 | Prefer `.textContent` over `.innerText`.                                                                                       | ✅ ☑️ |    | 💡 |    |
| [prefer-early-return](docs/rules/prefer-early-return.md)                                                   | Prefer early returns over full-function conditional wrapping.                                                                  | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-else-if](docs/rules/prefer-else-if.md)                                                             | Prefer `else if` over adjacent `if` statements with related conditions.                                                        | ✅    | 🔧 | 💡 |    |
| [prefer-error-is-error](docs/rules/prefer-error-is-error.md)                                               | Prefer `Error.isError()` when checking for errors.                                                                             |      | 🔧 |    |    |
| [prefer-event-target](docs/rules/prefer-event-target.md)                                                   | Prefer `EventTarget` over `EventEmitter`.                                                                                      | ✅ ☑️ |    |    |    |
| [prefer-export-from](docs/rules/prefer-export-from.md)                                                     | Prefer `export…from` when re-exporting.                                                                                        | ✅    | 🔧 | 💡 |    |
| [prefer-flat-math-min-max](docs/rules/prefer-flat-math-min-max.md)                                         | Prefer flat `Math.min()` and `Math.max()` calls over nested calls.                                                             | ✅ ☑️ | 🔧 |    |    |
| [prefer-get-or-insert-computed](docs/rules/prefer-get-or-insert-computed.md)                               | Prefer `.getOrInsertComputed()` when the default value has side effects.                                                       | ✅    | 🔧 |    |    |
| [prefer-global-number-constants](docs/rules/prefer-global-number-constants.md)                             | Prefer global numeric constants over `Number` static properties.                                                               | ✅ ☑️ | 🔧 |    |    |
| [prefer-global-this](docs/rules/prefer-global-this.md)                                                     | Prefer `globalThis` over `window`, `self`, and `global`.                                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-group-by](docs/rules/prefer-group-by.md)                                                           | Prefer `Object.groupBy()` or `Map.groupBy()` over reduce-based grouping.                                                       | ✅    | 🔧 |    |    |
| [prefer-has-check](docs/rules/prefer-has-check.md)                                                         | Prefer `.has()` when checking existence.                                                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-hoisting-branch-code](docs/rules/prefer-hoisting-branch-code.md)                                   | Prefer moving code shared by all branches of an `if` statement out of the branches.                                            | ✅    | 🔧 | 💡 |    |
| [prefer-https](docs/rules/prefer-https.md)                                                                 | Prefer HTTPS over HTTP.                                                                                                        | ✅    | 🔧 |    |    |
| [prefer-identifier-import-export-specifiers](docs/rules/prefer-identifier-import-export-specifiers.md)     | Prefer identifiers over string literals in import and export specifiers.                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-import-meta-properties](docs/rules/prefer-import-meta-properties.md)                               | Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths.                                         |      | 🔧 |    |    |
| [prefer-includes](docs/rules/prefer-includes.md)                                                           | Prefer `.includes()` over `.indexOf()`, `.lastIndexOf()`, and `Array#some()` when checking for existence or non-existence.     | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-includes-over-repeated-comparisons](docs/rules/prefer-includes-over-repeated-comparisons.md)       | Prefer `.includes()` over repeated equality comparisons.                                                                       | ✅    |    |    |    |
| [prefer-iterable-in-constructor](docs/rules/prefer-iterable-in-constructor.md)                             | Prefer passing iterables directly to constructors instead of filling empty collections.                                        | ✅ ☑️ | 🔧 |    |    |
| [prefer-iterator-concat](docs/rules/prefer-iterator-concat.md)                                             | Prefer `Iterator.concat(…)` over temporary spread arrays.                                                                      |      | 🔧 | 💡 |    |
| [prefer-iterator-helpers](docs/rules/prefer-iterator-helpers.md)                                           | Prefer iterator helpers over temporary arrays from iterators.                                                                  | ✅ ☑️ |    | 💡 |    |
| [prefer-iterator-to-array](docs/rules/prefer-iterator-to-array.md)                                         | Prefer `Iterator#toArray()` over temporary arrays from iterator spreads.                                                       | ✅    | 🔧 | 💡 |    |
| [prefer-iterator-to-array-at-end](docs/rules/prefer-iterator-to-array-at-end.md)                           | Prefer moving `.toArray()` to the end of iterator helper chains.                                                               | ✅ ☑️ |    | 💡 |    |
| [prefer-keyboard-event-key](docs/rules/prefer-keyboard-event-key.md)                                       | Prefer `KeyboardEvent#key` over deprecated keyboard event properties.                                                          | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-location-assign](docs/rules/prefer-location-assign.md)                                             | Prefer `location.assign()` over assigning to `location.href`.                                                                  | ✅    | 🔧 |    |    |
| [prefer-logical-operator-over-ternary](docs/rules/prefer-logical-operator-over-ternary.md)                 | Prefer using a logical operator over a ternary.                                                                                | ✅ ☑️ |    | 💡 |    |
| [prefer-map-from-entries](docs/rules/prefer-map-from-entries.md)                                           | Prefer `new Map()` over `Object.fromEntries()` when using the result as a map.                                                 | ✅ ☑️ | 🔧 |    |    |
| [prefer-math-abs](docs/rules/prefer-math-abs.md)                                                           | Prefer `Math.abs()` over manual absolute value expressions and symmetric range checks.                                         | ✅ ☑️ | 🔧 |    |    |
| [prefer-math-constants](docs/rules/prefer-math-constants.md)                                               | Prefer `Math` constants over their approximate numeric values.                                                                 | ✅ ☑️ |    | 💡 |    |
| [prefer-math-min-max](docs/rules/prefer-math-min-max.md)                                                   | Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.                                                    | ✅ ☑️ | 🔧 |    |    |
| [prefer-math-trunc](docs/rules/prefer-math-trunc.md)                                                       | Prefer `Math.trunc()` for truncating numbers.                                                                                  | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-minimal-ternary](docs/rules/prefer-minimal-ternary.md)                                             | Prefer moving ternaries into the minimal varying part of an expression.                                                        | ✅ ☑️ |    |    |    |
| [prefer-modern-dom-apis](docs/rules/prefer-modern-dom-apis.md)                                             | Prefer modern DOM APIs.                                                                                                        | ✅ ☑️ | 🔧 |    |    |
| [prefer-modern-math-apis](docs/rules/prefer-modern-math-apis.md)                                           | Prefer modern `Math` APIs over legacy patterns.                                                                                | ✅ ☑️ | 🔧 |    |    |
| [prefer-module](docs/rules/prefer-module.md)                                                               | Prefer JavaScript modules (ESM) over CommonJS.                                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-native-coercion-functions](docs/rules/prefer-native-coercion-functions.md)                         | Prefer using `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly.                                                   | ✅ ☑️ | 🔧 |    |    |
| [prefer-negative-index](docs/rules/prefer-negative-index.md)                                               | Prefer negative index over `.length - index` when possible.                                                                    | ✅ ☑️ | 🔧 |    |    |
| [prefer-node-protocol](docs/rules/prefer-node-protocol.md)                                                 | Prefer using the `node:` protocol when importing Node.js builtin modules.                                                      | ✅ ☑️ | 🔧 |    |    |
| [prefer-number-coercion](docs/rules/prefer-number-coercion.md)                                             | Prefer `Number()` over `parseFloat()` and base-10 `parseInt()`.                                                                | ✅ ☑️ |    | 💡 |    |
| [prefer-number-is-safe-integer](docs/rules/prefer-number-is-safe-integer.md)                               | Prefer `Number.isSafeInteger()` over integer checks.                                                                           | ✅    |    | 💡 |    |
| [prefer-number-properties](docs/rules/prefer-number-properties.md)                                         | Prefer `Number` static methods over global functions and optionally static properties over global constants.                   | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-object-define-properties](docs/rules/prefer-object-define-properties.md)                           | Prefer `Object.defineProperties()` over multiple `Object.defineProperty()` calls.                                              | ✅ ☑️ | 🔧 |    |    |
| [prefer-object-destructuring-defaults](docs/rules/prefer-object-destructuring-defaults.md)                 | Prefer object destructuring defaults over default object literals with spread.                                                 | ✅    |    | 💡 |    |
| [prefer-object-from-entries](docs/rules/prefer-object-from-entries.md)                                     | Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object.                                    | ✅ ☑️ | 🔧 |    |    |
| [prefer-object-iterable-methods](docs/rules/prefer-object-iterable-methods.md)                             | Prefer the most specific `Object` iterable method.                                                                             | ✅ ☑️ | 🔧 |    |    |
| [prefer-observer-apis](docs/rules/prefer-observer-apis.md)                                                 | Prefer observer APIs over resize and scroll listeners with layout reads.                                                       | ✅    |    |    |    |
| [prefer-optional-catch-binding](docs/rules/prefer-optional-catch-binding.md)                               | Prefer omitting the `catch` binding parameter.                                                                                 | ✅ ☑️ | 🔧 |    |    |
| [prefer-path2d](docs/rules/prefer-path2d.md)                                                               | Prefer `Path2D` for repeatedly drawn canvas paths.                                                                             | ✅ ☑️ |    |    |    |
| [prefer-private-class-fields](docs/rules/prefer-private-class-fields.md)                                   | Prefer private class fields over the underscore-prefix convention.                                                             | ✅    | 🔧 |    |    |
| [prefer-promise-try](docs/rules/prefer-promise-try.md)                                                     | Prefer `Promise.try()` over promise-wrapping boilerplate.                                                                      | ✅    | 🔧 |    |    |
| [prefer-promise-with-resolvers](docs/rules/prefer-promise-with-resolvers.md)                               | Prefer `Promise.withResolvers()` when extracting resolver functions from `new Promise()`.                                      | ✅ ☑️ | 🔧 |    |    |
| [prefer-prototype-methods](docs/rules/prefer-prototype-methods.md)                                         | Prefer borrowing methods from the prototype instead of the instance.                                                           | ✅ ☑️ | 🔧 |    |    |
| [prefer-query-selector](docs/rules/prefer-query-selector.md)                                               | Prefer `.querySelector()` and `.querySelectorAll()` over older DOM query methods.                                              | ✅    | 🔧 |    |    |
| [prefer-queue-microtask](docs/rules/prefer-queue-microtask.md)                                             | Prefer `queueMicrotask()` over `process.nextTick()`, `setImmediate()`, and `setTimeout(…, 0)`.                                 | ✅ ☑️ | 🔧 |    |    |
| [prefer-reflect-apply](docs/rules/prefer-reflect-apply.md)                                                 | Prefer `Reflect.apply()` over `Function#apply()`.                                                                              | ✅ ☑️ | 🔧 |    |    |
| [prefer-regexp-escape](docs/rules/prefer-regexp-escape.md)                                                 | Prefer `RegExp.escape()` for escaping strings to use in regular expressions.                                                   |      | 🔧 | 💡 |    |
| [prefer-regexp-test](docs/rules/prefer-regexp-test.md)                                                     | Prefer `RegExp#test()` over `String#match()`, `String#search()`, and `RegExp#exec()`.                                          | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-response-static-json](docs/rules/prefer-response-static-json.md)                                   | Prefer `Response.json()` over `new Response(JSON.stringify())`.                                                                | ✅ ☑️ | 🔧 |    |    |
| [prefer-scoped-selector](docs/rules/prefer-scoped-selector.md)                                             | Prefer `:scope` when using element query selector methods.                                                                     | ✅    |    | 💡 |    |
| [prefer-set-has](docs/rules/prefer-set-has.md)                                                             | Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.                                       | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-set-methods](docs/rules/prefer-set-methods.md)                                                     | Prefer `Set` methods for Set operations.                                                                                       | ✅    | 🔧 | 💡 |    |
| [prefer-set-size](docs/rules/prefer-set-size.md)                                                           | Prefer using `Set#size` instead of `Array#length`.                                                                             | ✅ ☑️ | 🔧 |    |    |
| [prefer-short-arrow-method](docs/rules/prefer-short-arrow-method.md)                                       | Prefer arrow function properties over methods with a single return.                                                            |      | 🔧 |    |    |
| [prefer-simple-condition-first](docs/rules/prefer-simple-condition-first.md)                               | Prefer simple conditions first in logical expressions.                                                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-simple-sort-comparator](docs/rules/prefer-simple-sort-comparator.md)                               | Prefer a simple comparison function for `Array#sort()`.                                                                        | ✅ ☑️ |    | 💡 |    |
| [prefer-simplified-conditions](docs/rules/prefer-simplified-conditions.md)                                 | Prefer simplified conditions.                                                                                                  | ✅ ☑️ | 🔧 |    |    |
| [prefer-single-array-predicate](docs/rules/prefer-single-array-predicate.md)                               | Prefer a single `Array#some()` or `Array#every()` with a combined predicate.                                                   | ✅ ☑️ |    | 💡 |    |
| [prefer-single-call](docs/rules/prefer-single-call.md)                                                     | Enforce combining multiple `Array#{push,unshift}()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.  | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-single-object-destructuring](docs/rules/prefer-single-object-destructuring.md)                     | Prefer a single object destructuring declaration per local const source.                                                       | ✅    | 🔧 |    |    |
| [prefer-single-replace](docs/rules/prefer-single-replace.md)                                               | Enforce combining multiple single-character replacements into a single `String#replaceAll()` with a regular expression.        | ✅ ☑️ | 🔧 |    |    |
| [prefer-smaller-scope](docs/rules/prefer-smaller-scope.md)                                                 | Prefer declaring variables in the smallest possible scope.                                                                     | ✅    | 🔧 |    |    |
| [prefer-split-limit](docs/rules/prefer-split-limit.md)                                                     | Prefer `String#split()` with a limit.                                                                                          | ✅ ☑️ | 🔧 |    |    |
| [prefer-spread](docs/rules/prefer-spread.md)                                                               | Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#{slice,toSpliced}()`, and trivial `for…of` copies.  | ✅    | 🔧 | 💡 |    |
| [prefer-string-match-all](docs/rules/prefer-string-match-all.md)                                           | Prefer `String#matchAll()` over `RegExp#exec()` loops.                                                                         | ✅ ☑️ | 🔧 |    |    |
| [prefer-string-pad-start-end](docs/rules/prefer-string-pad-start-end.md)                                   | Prefer `String#padStart()` and `String#padEnd()` over manual string padding.                                                   | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-string-raw](docs/rules/prefer-string-raw.md)                                                       | Prefer using the `String.raw` tag to avoid escaping `\`.                                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-string-repeat](docs/rules/prefer-string-repeat.md)                                                 | Prefer `String#repeat()` for repeated whitespace.                                                                              | ✅ ☑️ | 🔧 |    |    |
| [prefer-string-replace-all](docs/rules/prefer-string-replace-all.md)                                       | Prefer `String#replaceAll()` over regex searches with the global flag and `String#split().join()`.                             | ✅ ☑️ | 🔧 |    |    |
| [prefer-string-slice](docs/rules/prefer-string-slice.md)                                                   | Prefer `String#slice()` over `String#substr()` and `String#substring()`.                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-string-starts-ends-with](docs/rules/prefer-string-starts-ends-with.md)                             | Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()` and `String#indexOf() === 0`.                          | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-string-trim-start-end](docs/rules/prefer-string-trim-start-end.md)                                 | Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.                              | ✅ ☑️ | 🔧 |    |    |
| [prefer-structured-clone](docs/rules/prefer-structured-clone.md)                                           | Prefer using `structuredClone` to create a deep clone.                                                                         | ✅ ☑️ |    | 💡 |    |
| [prefer-switch](docs/rules/prefer-switch.md)                                                               | Prefer `switch` over multiple `else-if`.                                                                                       | ✅ ☑️ | 🔧 |    |    |
| [prefer-temporal](docs/rules/prefer-temporal.md)                                                           | Prefer `Temporal` over `Date`.                                                                                                 |      | 🔧 | 💡 |    |
| [prefer-ternary](docs/rules/prefer-ternary.md)                                                             | Prefer ternary expressions over simple `if` statements that return or assign values.                                           | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-toggle-attribute](docs/rules/prefer-toggle-attribute.md)                                           | Prefer using `Element#toggleAttribute()` to toggle attributes.                                                                 | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-top-level-await](docs/rules/prefer-top-level-await.md)                                             | Prefer top-level await over top-level promises and async function calls.                                                       | ✅ ☑️ |    | 💡 |    |
| [prefer-type-error](docs/rules/prefer-type-error.md)                                                       | Enforce throwing `TypeError` in type checking conditions.                                                                      | ✅ ☑️ | 🔧 |    |    |
| [prefer-type-literal-last](docs/rules/prefer-type-literal-last.md)                                         | Require type literals to be last in union types.                                                                               | ✅    | 🔧 |    |    |
| [prefer-uint8array-base64](docs/rules/prefer-uint8array-base64.md)                                         | Prefer `Uint8Array#toBase64()` and `Uint8Array.fromBase64()` over `atob()`, `btoa()`, and `Buffer` base64 conversions.         | ✅ ☑️ |    | 💡 |    |
| [prefer-unary-minus](docs/rules/prefer-unary-minus.md)                                                     | Prefer the unary minus operator over multiplying or dividing by `-1`.                                                          | ✅ ☑️ | 🔧 |    |    |
| [prefer-unicode-code-point-escapes](docs/rules/prefer-unicode-code-point-escapes.md)                       | Prefer Unicode code point escapes over legacy escape sequences.                                                                | ✅ ☑️ | 🔧 | 💡 |    |
| [prefer-url-can-parse](docs/rules/prefer-url-can-parse.md)                                                 | Prefer `URL.canParse()` over constructing a `URL` in a try/catch for validation.                                               | ✅ ☑️ | 🔧 |    |    |
| [prefer-url-href](docs/rules/prefer-url-href.md)                                                           | Prefer `URL#href` over stringifying a `URL`.                                                                                   | ✅ ☑️ | 🔧 |    |    |
| [prefer-url-search-parameters](docs/rules/prefer-url-search-parameters.md)                                 | Prefer `URLSearchParams` over manually splitting query strings.                                                                | ✅ ☑️ |    | 💡 |    |
| [prefer-while-loop-condition](docs/rules/prefer-while-loop-condition.md)                                   | Prefer putting the condition in the while statement.                                                                           | ✅ ☑️ | 🔧 |    |    |
| [relative-url-style](docs/rules/relative-url-style.md)                                                     | Enforce consistent relative URL style.                                                                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [require-array-join-separator](docs/rules/require-array-join-separator.md)                                 | Enforce using the separator argument with `Array#join()`.                                                                      | ✅ ☑️ | 🔧 |    |    |
| [require-array-sort-compare](docs/rules/require-array-sort-compare.md)                                     | Require a compare function when calling `Array#sort()` or `Array#toSorted()`.                                                  | ✅ ☑️ |    | 💡 |    |
| [require-css-escape](docs/rules/require-css-escape.md)                                                     | Require `CSS.escape()` for interpolated values in CSS selectors.                                                               | ✅ ☑️ | 🔧 |    |    |
| [require-module-attributes](docs/rules/require-module-attributes.md)                                       | Require non-empty module attributes for imports and exports                                                                    | ✅ ☑️ | 🔧 |    |    |
| [require-module-specifiers](docs/rules/require-module-specifiers.md)                                       | Require non-empty specifier list in import and export statements.                                                              | ✅ ☑️ | 🔧 | 💡 |    |
| [require-number-to-fixed-digits-argument](docs/rules/require-number-to-fixed-digits-argument.md)           | Enforce using the digits argument with `Number#toFixed()`.                                                                     | ✅ ☑️ | 🔧 |    |    |
| [require-passive-events](docs/rules/require-passive-events.md)                                             | Require passive event listeners for high-frequency events.                                                                     | ✅ ☑️ | 🔧 |    |    |
| [require-post-message-target-origin](docs/rules/require-post-message-target-origin.md)                     | Enforce using the `targetOrigin` argument with `window.postMessage()`.                                                         |      |    | 💡 |    |
| [require-proxy-trap-boolean-return](docs/rules/require-proxy-trap-boolean-return.md)                       | Require boolean-returning Proxy traps to return booleans.                                                                      | ✅ ☑️ | 🔧 |    |    |
| [string-content](docs/rules/string-content.md)                                                             | Enforce better string content.                                                                                                 |      | 🔧 | 💡 |    |
| [switch-case-braces](docs/rules/switch-case-braces.md)                                                     | Enforce consistent brace style for `case` clauses.                                                                             | ✅    | 🔧 |    |    |
| [switch-case-break-position](docs/rules/switch-case-break-position.md)                                     | Enforce consistent `break`/`return`/`continue`/`throw` position in `case` clauses.                                             | ✅    | 🔧 |    |    |
| [template-indent](docs/rules/template-indent.md)                                                           | Fix whitespace-insensitive template indentation.                                                                               | ✅    | 🔧 |    |    |
| [text-encoding-identifier-case](docs/rules/text-encoding-identifier-case.md)                               | Enforce consistent case for text encoding identifiers.                                                                         | ✅ ☑️ | 🔧 | 💡 |    |
| [throw-new-error](docs/rules/throw-new-error.md)                                                           | Require `new` when creating an error.                                                                                          | ✅ ☑️ | 🔧 |    |    |
| [try-complexity](docs/rules/try-complexity.md)                                                             | Limit the complexity of `try` blocks.                                                                                          |      |    |    |    |

<!-- end auto-generated rules list -->

### Non-JavaScript files

While most rules target JavaScript and TypeScript, some also lint other file types when used with the corresponding [ESLint language plugin](https://eslint.org/docs/latest/use/configure/plugins#specifying-a-language) such as [`@eslint/css`](https://github.com/eslint/css), [`@eslint/json`](https://github.com/eslint/json), [`@eslint/markdown`](https://github.com/eslint/markdown), or [`@html-eslint/eslint-plugin`](https://github.com/yeonjuan/html-eslint). Each such rule declares this with the `meta.languages` field.

When linting JSON, CSS, Markdown, HTML, or other non-JavaScript languages in the same ESLint config, scope Unicorn's JavaScript rule config objects with `files`. Include TypeScript/JSX extensions there only if your config already provides the matching parser/language setup for those files.

For example, keep Unicorn's JavaScript rules scoped separately, and enable only compatible Unicorn rules in each non-JavaScript language config:

```js
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	{
		files: ['**/*.js'],
		extends: [unicorn.configs.recommended],
	},
	{
		files: ['**/*.json'],
		plugins: {
			json,
			unicorn,
		},
		language: 'json/json',
		rules: {
			'unicorn/no-empty-file': 'error',
			'unicorn/prefer-https': 'error',
		},
	},
	{
		files: ['**/*.css'],
		plugins: {
			css,
			unicorn,
		},
		language: 'css/css',
		rules: {
			'unicorn/prefer-https': 'error',
			'unicorn/text-encoding-identifier-case': 'error',
		},
	},
	{
		files: ['**/*.html'],
		plugins: {
			html,
			unicorn,
		},
		language: 'html/html',
		rules: {
			'unicorn/no-invalid-file-input-accept': 'error',
			'unicorn/prefer-https': 'error',
		},
	},
	{
		files: ['**/*.md'],
		plugins: {
			markdown,
			unicorn,
		},
		language: 'markdown/commonmark',
		rules: {
			'unicorn/expiring-todo-comments': 'error',
			'unicorn/prefer-https': 'error',
		},
	},
]);
```

<!-- Do not manually modify this list. Run: `npm run fix:non-js-languages` -->
<!-- begin auto-generated non-js languages list -->

These rules work on **any** file type:

- [`comment-content`](docs/rules/comment-content.md)
- [`filename-case`](docs/rules/filename-case.md)
- [`no-abusive-eslint-disable`](docs/rules/no-abusive-eslint-disable.md)
- [`prefer-https`](docs/rules/prefer-https.md)

These rules also work on specific non-JavaScript languages:

| Name | CSS | HTML | JSON | Markdown |
| :-- | :-: | :-: | :-: | :-: |
| [`expiring-todo-comments`](docs/rules/expiring-todo-comments.md) | ✅ | ✅ | ✅ | ✅ |
| [`no-empty-file`](docs/rules/no-empty-file.md) | ✅ | ✅ | ✅ | ✅ |
| [`no-invalid-file-input-accept`](docs/rules/no-invalid-file-input-accept.md) |  | ✅ |  |  |
| [`no-manually-wrapped-comments`](docs/rules/no-manually-wrapped-comments.md) |  |  | ✅ |  |
| [`text-encoding-identifier-case`](docs/rules/text-encoding-identifier-case.md) | ✅ | ✅ |  |  |

<!-- end auto-generated non-js languages list -->

### Deleted and deprecated rules

See [the list](docs/deleted-and-deprecated-rules.md).

## Preset configs

See the [ESLint docs](https://eslint.org/docs/latest/use/configure/configuration-files) for more information about extending config files.

**Note**: Preset configs will also enable the correct [language options](https://eslint.org/docs/latest/use/configure/language-options).

### Recommended config

This plugin exports a `recommended` config that enforces good practices.

```js
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	// …
	{
		files: ['**/*.js'],
		extends: [unicorn.configs.recommended],
		rules: {
			'unicorn/prefer-module': 'warn',
		},
	},
]);
```

### All config

This plugin exports an `all` config that enables every rule, except deprecated ones.

```js
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	// …
	{
		files: ['**/*.js'],
		extends: [unicorn.configs.all],
		rules: {
			'unicorn/prefer-module': 'warn',
		},
	},
]);
```

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Fisker Cheung](https://github.com/fisker)
