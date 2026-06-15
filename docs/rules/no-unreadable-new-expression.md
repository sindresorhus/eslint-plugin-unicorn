# no-unreadable-new-expression

📝 Disallow unreadable `new` expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow member access directly from `new` expressions and disallow complex constructor expressions.

This rule allows identifier constructors and static member constructors. Split the constructor call and member access into separate statements, or assign a complex constructor expression to a clear name before using `new`.

## Why

`new` is one of the most precedence-sensitive operators in JavaScript. `new` _with_ an argument list and `new` _without_ one sit at [different precedence levels](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence) (17 vs. 16), so tiny differences in parentheses flip the meaning:

```js
new Foo().Bar; // `(new Foo()).Bar`: read `Bar` from the new instance
new Foo.Bar(); // `new (Foo.Bar)()`: construct `Foo.Bar`
new Foo.Bar;   // `new (Foo.Bar)()`: also construct `Foo.Bar`
```

Since `new Foo` equals `new Foo()`, it is not even clear which part `new` applies to. One access is enough to hit this, so the rule makes no exception for short chains. Naming the instance removes the ambiguity and reads better anyway: you name what you built, then use it.

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
