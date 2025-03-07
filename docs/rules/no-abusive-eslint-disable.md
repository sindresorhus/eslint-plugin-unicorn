# Enforce specifying rules to disable in `eslint-disable` comments

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule makes you specify the rules you want to disable when using `eslint-disable`, `eslint-disable-line` or `eslint-disable-next-line` comments.

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

## Fail

```js
/* eslint-disable */
console.log(message);

console.log(message); // eslint-disable-line

// eslint-disable-next-line
console.log(message);
```

## Pass

```js
/* eslint-disable no-console */
console.log(message);

console.log(message); // eslint-disable-line no-console

// eslint-disable-next-line no-console
console.log(message);
```
