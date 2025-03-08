# Enforce the style of numeric separators by correctly grouping digits

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces a convention of grouping digits using [numeric separators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Numeric_separators).
Long numbers can become really hard to read, so cutting it into groups of digits, separated with a `_`, is important to keep your code clear. This rule also enforces a proper usage of the numeric separator, by checking if the groups of digits are of the correct size.

By default, this doesn't apply to numbers below `10_000`, but that can be customized.

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

There are four number types; [`hexadecimal`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Hexadecimal), [`binary`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Binary), [`octal`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Octal) and [`number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type). Each of them can be associated with an object containing the following options:

**`onlyIfContainsSeparator`**

Type: `boolean`\
Default: `false`

Check if the group sizes are valid **only** if there are groups separated with an `_`.
You can set it at top-level, or override for each specific number type.

Example:

```js
// eslint unicorn/numeric-separators-style: ["error", {"onlyIfContainsSeparator": true, "binary": {"onlyIfContainsSeparator": false}]
const number = 100000; // Pass, this number does not contain separators
const binary = 0b101010001; // Fail, `binary` type don't require separators
const hexadecimal = 0xD_EED_BEE_F; // Fail, it contain separators and it's incorrectly grouped
```

**`minimumDigits`**

Type: `number`

The minimum amount of digits in a number where you shouldn't use a numeric separator.

Example: With `5` as the minimum digits, `1024` will pass because it has 4 digits, and `1_024` will fail.

**`groupLength`**

Type: `number`

The size a group of digits between two numeric separators should be.

The size of the first group can be of any length as long as it is equal to or less than the number specified here. Prefixes and suffixes, such as `+`, `-`, `0x`, `n`, etc, don't count in the group length. Notations like `e` and `.` don't count either.

### Details

Numbers are split into 3 distinct parts:

- The integer part (**123**.456). The remaining digits (that do not fit in a group) have to be placed at the beginning: `12_345`.
- The fractional part (123.**456**). The remaining digits have to be placed at the end of the number: `1.234_56`.
- The exponential part (123.456e**789**). It acts exactly as the integer part: groups have to be at the beginning.

### Examples

#### Fail

```js
// eslint unicorn/numeric-separators-style: ["error", {"number": {"minimumDigits": 0, "groupLength": 3}}]
const foo = 12345;
const foo = 0.000_0001;
const foo = 123.1_000_001;

// eslint unicorn/numeric-separators-style: ["error", {"binary": {"minimumDigits": 0, "groupLength": 4}}]
const foo = 0b101010;
const foo = 0b1010_10001;

// eslint unicorn/numeric-separators-style: ["error", {"hexadecimal": {"minimumDigits": 0, "groupLength": 2}}]
const foo = 0xA_B_CD_EF;
```

#### Pass

```js
// eslint unicorn/numeric-separators-style: ["error", {"number": {"minimumDigits": 0, "groupLength": 3}}]
const foo = 100;
const foo = 1_000;
const foo = 1_000_000;

// eslint unicorn/numeric-separators-style: ["error", {"number": {"minimumDigits": 5, "groupLength": 3}}]
const foo = 1000;

// eslint unicorn/numeric-separators-style: ["error", {"octal": {"minimumDigits": 0, "groupLength": 4}}]
const foo = 0o7777;
const foo = 0o7777;
const foo = 0o12_7777;
```

### Default

```js
{
	onlyIfContainsSeparator: false,
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
