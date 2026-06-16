# no-unreadable-new-expression

📝 Disallow unreadable `new` expressions.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow member access directly from `new` expressions and disallow complex constructor expressions.

This rule allows identifier constructors and static member constructors. Split the constructor call and member access into separate statements, or assign a complex constructor expression to a clear name before using `new`.

## Why

`new` is unusually precedence-sensitive: `new` _with_ an argument list and `new` _without_ one parse at [different levels](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence), so a pair of parentheses flips the meaning.

```js
new Foo().Bar; // `(new Foo()).Bar`: read `Bar` off the instance
new Foo.Bar(); // `new (Foo.Bar)()`: construct `Foo.Bar`
```

These look almost identical yet do opposite things, and since `new Foo` equals `new Foo()`, the parentheses do not reliably tell you which part `new` applies to. Even in `new Date(string).getTime()` you have to confirm those parens are an argument list and not a precedence group, and `new (foo().Bar)()` is harder still. Class-name casing does not help: the language does not enforce it, so reading the code correctly should not depend on it.

Splitting the expression removes the guesswork: name what you build, then use it. It reads just as well, and the name pays off the moment you reuse, log, or breakpoint the instance.

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
