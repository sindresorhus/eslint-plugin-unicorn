# Deprecated Rules

## import-index

This rule is outdated. JavaScript modules (ESM) do not support importing a directory.

## no-array-instanceof

This rule was renamed to [`no-instanceof-array`](rules/no-instanceof-array.md) to be more correct.

## no-fn-reference-in-iterator

This rule was renamed to [`no-array-callback-reference`](rules/no-array-callback-reference.md) to avoid using the abbreviation `fn` in the name.

## no-instanceof-array

Replaced by [`no-instanceof-builtins`](rules/no-instanceof-builtins.md) which covers more cases.

## no-reduce

This rule was renamed to [`no-array-reduce`](rules/no-array-reduce.md) to be more specific.

## no-unsafe-regex

Removed due to bugs.

## prefer-dataset

This rule was renamed to [`prefer-dom-node-dataset`](rules/prefer-dom-node-dataset.md) to be more specific.

## prefer-event-key

This rule was renamed to [`prefer-keyboard-event-key`](rules/prefer-keyboard-event-key.md) to be more specific.

## prefer-exponentiation-operator

This rule was deprecated in favor of the built-in ESLint [`prefer-exponentiation-operator`](https://eslint.org/docs/rules/prefer-exponentiation-operator) rule.

## prefer-flat-map

This rule was renamed to [`prefer-array-flat-map`](rules/prefer-array-flat-map.md) to be more specific.

## prefer-node-append

This rule was renamed to [`prefer-dom-node-append`](rules/prefer-dom-node-append.md) to be less ambiguous.

## prefer-node-remove

This rule was renamed to [`prefer-dom-node-remove`](rules/prefer-dom-node-remove.md) to be less ambiguous.

## prefer-object-has-own

This rule was deprecated in favor of the built-in ESLint [`prefer-object-has-own`](https://eslint.org/docs/rules/prefer-object-has-own) rule.

## prefer-replace-all

This rule was renamed to [`prefer-string-replace-all`](rules/prefer-string-replace-all.md) to be more specific.

## prefer-starts-ends-with

This rule was renamed to [`prefer-string-starts-ends-with`](rules/prefer-string-starts-ends-with.md) to be more specific.

## prefer-text-content

This rule was renamed to [`prefer-dom-node-text-content`](rules/prefer-dom-node-text-content.md) to be more specific.

## prefer-trim-start-end

This rule was renamed to [`prefer-string-trim-start-end`](rules/prefer-string-trim-start-end.md) to be more specific.

## regex-shorthand

This rule was renamed to [`better-regex`](rules/better-regex.md) as it does more than just preferring the shorthand.
