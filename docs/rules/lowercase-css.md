# lowercase-css

📝 Enforce lowercase CSS syntax.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS treats property names, at-rule names, units, standard function names, pseudo-class and pseudo-element names, media feature names, known value keywords, and hexadecimal color digits as ASCII case-insensitive. This rule enforces lowercase for all of them with a single convention.

The rule uses the CSS grammar to distinguish value keywords from case-sensitive custom identifiers such as animation names, font families, grid names, and counters.

## Examples

```css
/* ❌ */
@MEDIA (MIN-WIDTH: 40REM) {
	button:HOVER::BEFORE {
		COLOR: RGB(0 0 0 / 50%);
		border: 1PX SOLID #ABCDEF;
	}
}
```

```css
/* ✅ */
@media (min-width: 40rem) {
	button:hover::before {
		color: rgb(0 0 0 / 50%);
		border: 1px solid #abcdef;
	}
}
```

## Ignored syntax

The rule does not change custom property names or values, author-defined names beginning with `--`, font feature value names, type selectors, classes, IDs, attribute data, strings, URL payloads, or user data in selector arguments. It also leaves `!important` and encoding strings to their dedicated rules.

```css
/* ✅ */
linearGradient.Theme#Main[data-mode="DARK"] {
	--ThemeColor: CALC(1PX) #ABCDEF;
	animation-name: FadeIn;
	font-family: Times New Roman;
	background-image: url("IMAGE.PNG#ABC");
}
```
