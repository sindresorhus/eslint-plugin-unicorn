# Enforce combining multiple `Array#push()` into one call

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

[`Array#push()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push) accepts multiple arguments. Multiple calls should be combined into one.

This rule is partly fixable.

## Fail

```js
foo.push(1);
foo.push(2, 3);
```

## Pass

```js
foo.push(1, 2, 3);
```

```js
const length = foo.push(1);
foo.push(2);
```

```js
foo.push(1);
bar();
foo.push(2);
```

## Options

Type: `object`

### ignore

Type: `string[]`

Ignore objects, `stream`, `this`, `this.stream` are ignored by default.

Example:

```js
{
	'unicorn/no-array-push-push': [
		'error',
		{
			ignore: [
				'readable',
				'foo.stream'
			]
		}
	]
}
```

```js
// eslint unicorn/no-array-push-push: ["error", {"ignore": ["readable"]}]
const {Readable} = require('stream');

const readable = new Readable();
readable.push('one');
readable.push('another');
readable.push(null);
```
