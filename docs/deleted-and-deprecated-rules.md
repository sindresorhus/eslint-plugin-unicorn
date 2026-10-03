# Deprecated/Removed Rules

## Deprecated rules

### no-deprecated-css-features

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-deprecated-features`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-deprecated-features.md).

### no-duplicate-css-selectors

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-duplicate-selectors`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-duplicate-selectors.md).

### no-duplicate-font-family-names

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-duplicate-font-family-names`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-duplicate-font-family-names.md).

### no-invalid-media-features

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-invalid-media-features`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-invalid-media-features.md).

### no-nesting-with-mixed-specificity

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-nesting-with-mixed-specificity`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-nesting-with-mixed-specificity.md).

### no-redundant-nested-style-rules

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-redundant-nested-style-rules`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-redundant-nested-style-rules.md).

### no-unknown-css-annotations

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-unknown-annotations`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-unknown-annotations.md).

### no-unknown-pseudo-selectors

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-unknown-pseudo-selectors`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-unknown-pseudo-selectors.md).

### no-unscoped-css-nesting-selector

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/no-unscoped-nesting-selector`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/no-unscoped-nesting-selector.md).

### prefer-explicit-viewport-units

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/prefer-explicit-viewport-units`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/prefer-explicit-viewport-units.md).

### prefer-media-feature-range-syntax

Moved to [`eslint-cssicorn`](https://github.com/sindresorhus/eslint-cssicorn) as [`cssicorn/prefer-media-feature-range-syntax`](https://github.com/sindresorhus/eslint-cssicorn/blob/main/docs/rules/prefer-media-feature-range-syntax.md).

### no-unused-array-method-return

Replaced by [`no-unused-builtin-method-return`](rules/no-unused-builtin-method-return.md) which also covers Set and Temporal methods. Update explicit configurations to use the new name; the old rule is now a no-op.

### no-instanceof-array

Replaced by [`no-instanceof-builtins`](rules/no-instanceof-builtins.md) which covers more cases.

### no-array-push-push

Replaced by [`prefer-single-call`](rules/prefer-single-call.md) which covers more cases.

### no-length-as-slice-end

Replaced by [`no-unnecessary-slice-end`](rules/no-unnecessary-slice-end.md) which covers more cases.

### no-hex-escape

Replaced by [`prefer-literal-ascii`](rules/prefer-literal-ascii.md) for printable ASCII hexadecimal and Unicode escapes in strings and untagged template literals, and [`prefer-unicode-code-point-escapes`](rules/prefer-unicode-code-point-escapes.md) for other legacy escapes, including those in regular expression literals.

### prevent-abbreviations

This rule was renamed to [`name-replacements`](rules/name-replacements.md).

### prefer-dom-node-dataset

This rule was renamed to [`dom-node-dataset`](rules/dom-node-dataset.md).

### prefer-json-parse-buffer

This rule was renamed to [`consistent-json-file-read`](rules/consistent-json-file-read.md).

### better-regex

Removed due to bugs and lack of support of the underlying library.

## Deleted rules

### ~import-index~

This rule is outdated. JavaScript modules (ESM) do not support importing a directory.

### ~no-array-for-each~

This rule was renamed to [`no-for-each`](rules/no-for-each.md).

### ~no-array-instanceof~

Replaced by [`no-instanceof-builtins`](rules/no-instanceof-builtins.md) which covers more cases.

### ~no-fn-reference-in-iterator~

This rule was renamed to [`no-array-callback-reference`](rules/no-array-callback-reference.md) to avoid using the abbreviation `fn` in the name.

### ~no-reduce~

This rule was renamed to [`no-array-reduce`](rules/no-array-reduce.md) to be more specific.

### ~no-unsafe-regex~

Removed due to bugs.

### ~prefer-dataset~

This rule was renamed to [`dom-node-dataset`](rules/dom-node-dataset.md).

### ~prefer-event-key~

This rule was renamed to [`prefer-keyboard-event-key`](rules/prefer-keyboard-event-key.md) to be more specific.

### ~prefer-exponentiation-operator~

This rule was deprecated in favor of the built-in ESLint [`prefer-exponentiation-operator`](https://eslint.org/docs/rules/prefer-exponentiation-operator) rule.

### ~prefer-flat-map~

This rule was renamed to [`prefer-array-flat-map`](rules/prefer-array-flat-map.md) to be more specific.

### ~prefer-node-append~

This rule was renamed to [`prefer-dom-node-append`](rules/prefer-dom-node-append.md) to be less ambiguous.

### ~prefer-node-remove~

This rule was renamed to [`prefer-dom-node-remove`](rules/prefer-dom-node-remove.md) to be less ambiguous.

### ~prefer-object-has-own~

This rule was deprecated in favor of the built-in ESLint [`prefer-object-has-own`](https://eslint.org/docs/rules/prefer-object-has-own) rule.

### ~prefer-replace-all~

This rule was renamed to [`prefer-string-replace-all`](rules/prefer-string-replace-all.md) to be more specific.

### ~prefer-starts-ends-with~

This rule was renamed to [`prefer-string-starts-ends-with`](rules/prefer-string-starts-ends-with.md) to be more specific.

### ~prefer-text-content~

This rule was renamed to [`prefer-dom-node-text-content`](rules/prefer-dom-node-text-content.md) to be more specific.

### ~prefer-trim-start-end~

This rule was renamed to [`prefer-string-trim-start-end`](rules/prefer-string-trim-start-end.md) to be more specific.

### ~regex-shorthand~

This rule was renamed to [`better-regex`](rules/better-regex.md) as it does more than just preferring the shorthand.
