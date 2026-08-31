# no-abusive-eslint-disable

📝 Enforce specifying rules to disable in `eslint-disable` comments.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule makes you specify the rules you want to disable when using `eslint-disable`, `eslint-disable-line` or `eslint-disable-next-line` comments.

Because it inspects the disable directives themselves, it applies to files of any language that supports them, not just JavaScript, when linted with the matching ESLint language plugin (for example [`@eslint/css`](https://github.com/eslint/css) or [`@eslint/markdown`](https://github.com/eslint/markdown)).

If you want to disable an ESLint rule in a file or on a specific line, you can add a comment.

On a single line:

```js
const message = 'foo';
console.log(message); // eslint-disable-line no-console

// eslint-disable-next-line no-console
console.log(message);
```

On the whole (rest of the) file:

```js
/* eslint-disable no-console */
const message = 'foo';
console.log(message);
```

You don't have to specify any rules (like `no-console` in the examples above), but you should, as you might otherwise hide useful errors.

```js
/* eslint-disable */
console.log(message); // `message` is not defined, but it won't be reported
```

This rule enforces specifying the rules to disable. If you want to disable ESLint on a file altogether, you should ignore it through [`.eslintignore`](https://eslint.org/docs/user-guide/configuring#ignoring-files-and-directories) for ESLint or through the [`ignores` property](https://github.com/xojs/xo#ignores) in `package.json` for `XO`.

## Examples

```js
// ❌
/* eslint-disable */
console.log(message);

// ✅
/* eslint-disable no-console */
console.log(message);
```

```js
// ❌
console.log(message); // eslint-disable-line

// ✅
console.log(message); // eslint-disable-line no-console
```

```js
// ❌
// eslint-disable-next-line
console.log(message);

// ✅
// eslint-disable-next-line no-console
console.log(message);
```
