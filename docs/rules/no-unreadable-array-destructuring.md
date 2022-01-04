# Disallow unreadable array destructuring

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Destructuring is very useful, but it can also make some code harder to read. This rule prevents ignoring consecutive values when destructuring from an array.

## Fail

```js
const [,, foo] = parts;
```

```js
const [,,, foo] = parts;
```

```js
const [,,,, foo] = parts;
```

```js
const [,,...rest] = parts;
```

## Pass

```js
const [, foo] = parts;
```

```js
const [foo] = parts;
```

```js
const foo = parts[3];
```

```js
const [,...rest] = parts;
```

```js
const foo = parts.slice(3);
```

## Note

You might have to modify the built-in [`prefer-destructuring`](https://eslint.org/docs/rules/prefer-destructuring) rule to be compatible with this one:

```json
{
	"rules": {
		"prefer-destructuring": [
			"error",
			{
				"object": true,
				"array": false
			}
		]
	}
}
```
