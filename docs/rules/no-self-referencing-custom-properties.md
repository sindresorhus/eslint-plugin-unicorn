# no-self-referencing-custom-properties

📝 Disallow self-references in CSS custom properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A custom-property declaration such as `--spacing: calc(var(--spacing) + 1px)` creates a cyclic dependency. It does not increment an inherited value, and adding a fallback to `var(--spacing, 1px)` does not repair the cycle. See the [CSS specification](https://www.w3.org/TR/css-variables-1/#cycles).

This rule disallows syntactic self-references, including references inside fallbacks and conditional functions. It reports once per declaration and does not provide an autofix or suggestion because the intended value or variable is unknown.

## Examples

```css
/* ❌ */
.component {
	--spacing: calc(var(--spacing) + 1px);
}

/* ✅ */
.component {
	--spacing: calc(var(--base-spacing) + 1px);
}
```

```css
/* ❌ */
.component {
	--spacing: var(--spacing, 1px);
	--color: var(--theme-color, var(--color));
}

/* ✅ */
.component {
	--spacing: var(--base-spacing, 1px);
	--color: var(--theme-color, black);
}
```

Custom-property names are case-sensitive, so `--spacing: var(--SPACING)` is allowed. The rule ignores strings, comments, URL text, support tests, and container-query conditions. It does not detect indirect cycles such as `--one: var(--two); --two: var(--one)` or extract CSS from JavaScript.

## Usage

This rule is opt-in and requires the [`@eslint/css`](https://github.com/eslint/css) language plugin.

```js
import {defineConfig} from 'eslint/config';
import css from '@eslint/css';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {css, unicorn},
		language: 'css/css',
		rules: {
			'unicorn/no-self-referencing-custom-properties': 'error',
		},
	},
]);
```

## Limitations

The rule does not resolve dynamically produced property names such as `var(var(--alias))`, but it still checks literal self-references inside nested functions.

The rule does not evaluate whether a fallback or conditional branch is used. The [current CSS draft](https://drafts.csswg.org/css-variables-2/#using-variables) and [web-platform tests](https://github.com/web-platform-tests/wpt/blob/master/css/css-variables/variable-cycles.html) allow cycles in unused fallbacks. For example, the following can compute successfully when `--theme-spacing` has a valid value, but this rule still reports the self-reference:

```css
.component {
	--theme-spacing: 1px;
	--spacing: var(--theme-spacing, var(--spacing));
}
```

Use this rule when you want to prohibit self-references regardless of whether they create a runtime cycle.
