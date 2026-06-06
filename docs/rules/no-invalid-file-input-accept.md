# no-invalid-file-input-accept

📝 Disallow invalid `accept` values on file inputs.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces static `accept` values made up of comma-separated filename extensions, MIME types, or the wildcard MIME types `audio/*`, `image/*`, and `video/*`. It rejects invalid tokens and empty entries, and normalizes casing, spacing, duplicates, and common MIME type mistakes.

This rule checks JSX file inputs and HTML file inputs parsed by [`@html-eslint/eslint-plugin`](https://www.npmjs.com/package/@html-eslint/eslint-plugin).

## Examples

```jsx
// ❌
<input type="file" accept="image/jpg" />;

// ✅
<input type="file" accept="image/jpeg" />;
```

```html
<!-- ❌ -->
<input type="file" accept="image/jpg">

<!-- ✅ -->
<input type="file" accept="image/jpeg">
```

```jsx
// ❌
<input type="file" accept="png" />;

// ✅
<input type="file" accept=".png" />;
```

```jsx
// ❌
<input type="file" accept="IMAGE/*" />;

// ✅
<input type="file" accept="image/*" />;
```

```jsx
// ❌
<input type="file" accept="IMAGE/PNG,.PNG, image/png" />;

// ✅
<input type="file" accept="image/png, .png" />;
```

```jsx
// ❌
<input type="file" accept={allowedTypes} />;

// ✅
<input type="file" accept="image/png, .png" />;
```
