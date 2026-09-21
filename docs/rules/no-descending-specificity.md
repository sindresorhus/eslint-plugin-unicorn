# no-descending-specificity

📝 Disallow lower-specificity selectors from following higher-specificity selectors that set the same property.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Selectors with higher specificity should come after lower-specificity selectors they override. Keeping source order and specificity order aligned makes the cascade easier to understand.

This rule compares selectors only when their terminal compounds match after ignoring pseudo-classes and both rules set the same property. For example, `a:hover` is compared with `a`, while `a.foo` and `a::before` are each kept separate from `a`. This is intentionally narrower than Stylelint's [`no-descending-specificity`](https://stylelint.io/user-guide/rules/no-descending-specificity/) rule.

## Examples

```css
/* ❌ */
#navigation a {
	color: red;
}

a {
	color: blue;
}
```

```css
/* ✅ */
a {
	color: blue;
}

#navigation a {
	color: red;
}
```

Rules that set different properties are not compared:

```css
/* ✅ */
#navigation a {
	color: red;
}

a {
	text-decoration: none;
}
```

A later `!important` declaration is a legitimate override of an earlier normal declaration:

```css
/* ✅ */
#navigation a {
	color: red;
}

a {
	color: blue !important;
}
```

A later normal declaration cannot override an earlier important declaration, so descending specificity is still reported. When both declarations are important, specificity still determines their order.

The rule compares exact property names after decoding CSS escapes and normalizing ASCII case in standard property names. It intentionally does not expand shorthands, longhands, aliases, or `all`. Custom property names remain case-sensitive.

Selectors are compared only within the same enclosing at-rule context. Equivalent formatting of media queries and other at-rule preludes is normalized, named layers are compared across matching blocks, and anonymous layers remain separate. The rule follows standard CSS nesting specificity, including the highest parent-list specificity used by `&`. A selector list is ignored if any member uses a construct the rule does not support or has ambiguous syntax. This includes selectors with `&` inside a pseudo-class or pseudo-element, selectors using `:scope`, `:root`, `:host`, or `:host-context`, and namespace-qualified selectors.

The rule supports standard CSS represented as selector AST nodes by `@eslint/css`, not SCSS or Less. Parser output left as raw or otherwise ambiguous syntax is ignored, but not every malformed functional pseudo-class argument is validated. Direct declarations inside `@scope` are also ignored because they match the scoping root with zero specificity rather than inheriting an enclosing selector.

This rule complements [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md), which checks specificity differences within nesting parent lists, and [`no-duplicate-css-selectors`](./no-duplicate-css-selectors.md), which checks identical selectors.

The rule has no fixer because safely reordering style rules requires knowledge of the intended cascade.

## CSS files

Enable it for CSS files with [`@eslint/css`](https://github.com/eslint/css):

```js
import css from '@eslint/css';
import {defineConfig} from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {
			css,
			unicorn,
		},
		language: 'css/css',
		rules: {
			'unicorn/no-descending-specificity': 'error',
		},
	},
]);
```
