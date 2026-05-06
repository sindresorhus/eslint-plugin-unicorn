# prefer-query-selector

📝 Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()` and `.getElementsByName()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's better to use the same method to query DOM elements. This helps keep consistency and it lends itself to future improvements (e.g. more specific selectors).

## Examples

```js
// ❌
document.getElementById('foo');

// ✅
document.querySelector('#foo');
```

```js
// ❌
document.getElementsByClassName('foo');

// ✅
document.querySelectorAll('.foo');
```

```js
// ❌
document.getElementsByClassName('foo bar');

// ✅
document.querySelectorAll('.foo.bar');
```

```js
// ❌
document.getElementsByTagName('main');

// ✅
document.querySelectorAll('main');
```

```js
// ❌
document.getElementsByClassName(fn());
```

## Options

### `allowWithVariables`

Type: `boolean`\
Default: `false`

When set to `true`, allows using `.getElementById()` and `.getElementsByClassName()` when called with a non-literal argument (a variable, expression, or template literal with interpolation). This avoids the need to manually compose a CSS selector string, which can be less readable. `.getElementsByTagName()` and `.getElementsByName()` are always reported regardless.

```js
// eslint unicorn/prefer-query-selector: ["error", {"allowWithVariables": true}]

// ✅ Allowed - variable argument
document.getElementById(someId);
document.getElementsByClassName(someClass);

// ❌ Still reported - literal argument
document.getElementById('foo');
document.getElementsByClassName('foo');

// ❌ Still reported - getElementsByTagName and getElementsByName are never allowed
document.getElementsByTagName(someTag);
document.getElementsByName(someName);
```
