# Enforce the style of numeric separators by correctly grouping digits

Enforces a convention of grouping digits thanks to the [numeric separator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Numeric_separators).

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

There are 5 options, `hexadecimal`, `binary`, `octals`, `bigint`, `number`, which all
refer to their corresponging type. Each of them has to be associated with an array
containing 2 values:
- The first one is the minimum threshold. You can't use numeric separators if the number has
less digits than specified here. For example, if you put 5 as the minimum threshold,
then `1024` will pass because it has 4 digits, and `1_024` will fail. However `1_000_000`
will still pass and `1000000` will still fail.
- The second one is the preferedGroupLength. It is the size of a group, if we don't count
the size of the first one (which can be of any size as long as it is equal to or less than
the number specified here).

```js
// eslint unicorn/numeric-separators-style: ["error", { number: [0, 3] }]
const foo = 100; // pass
const foo = 1_000; // pass
const foo = 1_000_000; // pass
const foo = 0.000_0001; // fail

// eslint unicorn/numeric-separators-style: ["error", { octal: [0, 3] }]
const foo = 0o123; // pass
const foo = 0o1_123; // pass
const foo = 0o1123; // fail
const foo = 0o123456; // fail
```

The default is
```js
{
	hexadecimal: [0, 2],
	binary: [0, 4],
	octal: [0, 4],
	bigint: [5, 3],
	number: [5, 3]
}
```
