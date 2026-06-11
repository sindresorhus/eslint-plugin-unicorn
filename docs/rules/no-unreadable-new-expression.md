# no-unreadable-new-expression

📝 Disallow unreadable `new` expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow member access directly from `new` expressions and disallow complex constructor expressions.

This rule allows identifier constructors and static member constructors. Split the constructor call and member access into separate statements, or assign a complex constructor expression to a clear name before using `new`.

## Examples

```js
// ❌
const bar = new Foo().getBar();

// ✅
const foo = new Foo();
const bar = foo.getBar();
```

```js
// ❌
const Bar = new Foo().Bar;

// ✅
const foo = new Foo();
const Bar = foo.Bar;
```

```js
// ❌
const bar = new (foo().Bar)();

// ✅
const {Bar} = foo();
const bar = new Bar();
```

```js
// ❌
const bar = new foo[Bar]();

// ✅
const Bar = foo[Bar];
const bar = new Bar();
```
