# Disallow unnecessary interpolations in template strings

Unnecessary interpolations, unnecessary converts to string or string concatenations in template strings provoke hard-to-read code.

## Fail

```js
// Unnecessary interpolations in template string
`${'foo'}`;
`${'foo'}${'bar'}`;
`Hello, ${`Brave ${"New"}`} ${"World"}!`;
`${2021} year!`;
`${true} or ${false} or ${null} or ${undefined}`;

// Unnecessary convert to string in template string
`${foo.toString()}`;
`${String(bar)}`;

// Unexpected string concatenation in template string
`before ${"head" + someVar + "tail"} after`;
```

## Pass

```js
`foo`;
`foobar`;
`Hello, Brave New World!`;
`2021 year!`;
`true or false or null or undefined`;

`${foo}`;
`${bar}`;

`before head${someVar}tail after`
```
