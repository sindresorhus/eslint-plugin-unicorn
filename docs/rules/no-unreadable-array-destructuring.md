# Disallow unreadable array destructuring

Destructuring is very useful, but it can also make some code harder to read. This rule prevents ignoring consecutive values when destructuring from an array.


## Fail

```js
const [,, foo] = parts;
const [,,, foo] = parts;
const [,,,, foo] = parts;
const [,,...rest] = parts;
```


## Pass

```js
const [, foo] = parts;
const [foo] = parts;
const foo = parts[3];
const [,...rest] = parts;
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
