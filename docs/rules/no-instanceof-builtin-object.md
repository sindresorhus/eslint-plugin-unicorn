# Disallow `instanceof` on built-in objects

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `instanceof` to determine the type of an object has [limitations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_multiple_realms).

Therefore, it is recommended to use a safer method, like `Object.prototype.toString.call(foo)` or the npm package [@sindresorhus/is](https://www.npmjs.com/package/@sindresorhus/is) to determine the type of an object.

## Examples

```js
foo instanceof String; // ❌
typeof foo === 'string'; // ✅
```

```js
foo instanceof Number; // ❌
typeof foo === 'number'; // ✅
```

```js
foo instanceof Boolean; // ❌
typeof foo === 'boolean'; // ✅
```

```js
foo instanceof BigInt; // ❌
typeof foo === 'bigint'; // ✅
```

```js
foo instanceof Symbol; // ❌
typeof foo === 'symbol'; // ✅
```

```js
foo instanceof Array; // ❌
Array.isArray(foo); // ✅
```

```js
foo instanceof Function; // ❌
typeof foo === 'function'; // ✅
```

```js
foo instanceof Object; // ❌
Object.prototype.toString.call(foo) === '[object Object]'; // ✅
```

```js
import is from '@sindresorhus/is';

foo instanceof Map; // ❌
is(foo) === 'Map'; // ✅
```

## Options

### strategy

Type: `'loose' | 'strict'`\
Default: `'loose'`

The matching strategy:

- `'loose'` - Matches the primitive type (`string`, `number`, `boolean`, `bigint`, `symbol`) constructors, `Function`, and `Array`.
- `'strict'` - Matches all built-in constructors.

```js
"unicorn/no-instanceof-builtin-object": [
	"error",
	{
		"strategy": "strict"
	}
]
```

### include

Type: `string[]`\
Default: `[]`

Specify the constructors that should be validated.

```js
"unicorn/no-instanceof-builtin-object": [
	"error",
	{
		"include": [
			"WebWorker",
			"HTMLElement"
		]
	}
]
```

### exclude

type: `string[]`\
Default: `[]`

Specifies the constructors that should be excluded, with this rule taking precedence over others.

```js
"unicorn/no-instanceof-builtin-object": [
	"error",
	{
		"exclude": [
			"String",
			"Number"
		]
	}
]
```

### useErrorIsError

Type: `boolean`\
Default: `false`

You can specify to use [`Error.isError()`](https://github.com/tc39/proposal-is-error) to determine whether it is an error object.

This option requires `strategy: 'strict'`.

```js
"unicorn/no-instanceof-builtin-object": [
	"error",
	{
		"strategy": "strict",
		"useErrorIsError": true
	}
]
```

This option will be removed at some point in the future.
