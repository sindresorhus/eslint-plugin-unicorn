# Specify rules to disable when using `eslint-disable` comments

If you want to disable a ESLint rule in a file or on a specific line, you can add a comment like:

On a single line
```js
var message = 'foo';
console.log(message); // eslint-disable-line no-console
```
On the whole (rest of the) file
```js
/* eslint-disable no-console */
var message = 'foo';
console.log(message);
```

You don't have to specify any rules (like `no-console` in the examples above), but you should, as you might otherwise hide useful errors.

```js
/* eslint-disable */
console.log(message); // `message` is not defined, but it won't be reported
```

This rule enforces the specification of rules to disable. If you want to disable ESLint on a file altogether, you should ignore it through [`.eslintignore`](http://eslint.org/docs/user-guide/configuring#ignoring-files-and-directories).

## Fail

```js
/* eslint-disable */
console.log(message);

console.log(message); // eslint-disable-line
```


## Pass

```js
/* eslint-disable no-console */
console.log(message);

console.log(message); // eslint-disable-line no-console
```
