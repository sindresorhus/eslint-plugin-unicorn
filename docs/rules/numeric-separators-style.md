# Enforce the style of numeric separators by correctly grouping digits

Enforces a convention of grouping digits using [numeric separators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Numeric_separators).

This rule is fixable.

## Fail

```js
const foo = 1_23_4444;
const foo = 1_234.56789;
const foo = 0xAB_C_D_EF;
const foo = 0b10_00_1111;
const foo = 0o1_0_44_21;
const foo = 1_294_28771_2n;
```

## Pass

```js
const foo = 1_234_444;
const foo = 1_234.567_89;
const foo = 0xAB_CD_EF;
const foo = 0b1000_1111;
const foo = 0o10_4421;
const foo = 1_294_287_712n;
```

## Options

If you want a custom group size for a specific number type, you can specify it here.

There are 4 options, `hexadecimal`, `binary`, `octal`, `number`, which all refer to their corresponding type. Each of them has to be associated with an object
containing 2 fields:

**`minimumDigits`**

Type: `number`
The minimum of digits in a number, where you shouldn't use numeric separator.

Example: With 5 as the minimum digits, `1024` will pass because it has 4 digits, and `1_024` will fail.

**`groupLength`**

Type: `number`
The size a group should be.
The size of the first group can be of any length as long as it is equal to or less than the number specified here

### Examples

```js
// eslint unicorn/numeric-separators-style: ["error", {number: {minimumDigits: 0, groupLength: 3}}]
const foo = 100; // Pass
const foo = 1_000; // Pass
const foo = 1_000_000; // Pass
const foo = 0.000_0001; // Fail

// eslint unicorn/numeric-separators-style: ["error", {octal: {minimumDigits: 0, groupLength3}}]
const foo = 0o123; // Pass
const foo = 0o1_123; // Pass
const foo = 0o1123; // Fail
const foo = 0o123456; // Fail
```

### Default

```js
{
	hexadecimal: {
		minimumDigits: 0,
		groupLength: 2
	},
	binary: {
		minimumDigits: 0,
		groupLength: 4
	},
	octal: {
		minimumDigits: 0,
		groupLength: 4
	},
	number: {
		minimumDigits: 5,
		groupLength: 3
	}
};
```
