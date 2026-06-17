# no-selector-as-dom-name

📝 Disallow selector syntax in DOM names.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow selector syntax in DOM APIs that expect raw names.

Some DOM APIs accept raw class names or IDs rather than CSS selectors. For example, use `'active'` with `classList.add()` and `getElementsByClassName()`, not `'.active'`. Use `'app'` with `getElementById()`, not `'#app'`.

This also applies when the selector prefix starts a template literal, like `` `.${className}` `` or `` `#${id}` ``.

Only simple selector prefixes that match the API are autofixed, like `'.active'` for class-name APIs, `'#app'` for `getElementById()`, and simple dynamic templates like `` `.${className}` ``. More complex selector-looking values are reported without autofix.

With `prefer-query-selector` enabled, this rule fixes the DOM name first. `prefer-query-selector` may then rewrite the DOM query method.

## Examples

```js
// ❌
element.classList.add('.active');
element.classList.remove('.hidden');
element.classList.contains('.selected');
element.classList.toggle('.expanded');
element.classList.replace('.old', '.new');
document.getElementsByClassName('.item');
document.getElementById('#app');

// ✅
element.classList.add('active');
element.classList.remove('hidden');
element.classList.contains('selected');
element.classList.toggle('expanded');
element.classList.replace('old', 'new');
document.getElementsByClassName('item');
document.getElementById('app');
```
