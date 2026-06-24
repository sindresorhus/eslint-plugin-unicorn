# no-return-array-push

📝 Disallow using the return value of `Array#push()` and `Array#unshift()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#push()` and `Array#unshift()` return the new length of the array, not the added value or the array. Returning or assigning that length is almost always a mistake. It reads as if the value were meaningful when it tells you nothing about what you added.

If you want to add an item and exit, call `.push()` or `.unshift()` before `return`. If you intentionally want to use the length, use an explicit `.length` expression after the mutation.

Calls to `.push(...)` and `.unshift(...)` with at least one argument must be standalone expression statements. It also skips common stream-style `.push()` calls.

The rule treats member access on the call result as a signal for custom APIs, for example `router.push(to).catch(…)`, where `push` returns a `Promise`. It also uses type information when available to skip receivers known not to be arrays.

## Examples

```js
// ❌
function add(item) {
	return items.push(item);
}

// ✅
function add(item) {
	items.push(item);
	return;
}
```

```js
// ❌
const add = item => items.push(item);

// ✅
const add = item => {
	items.push(item);
};
```

```js
// ❌
const length = items.unshift(item);

// ✅
items.unshift(item);
const length = items.length;
```

```js
// ✅
function getNextLength(item) {
	items.push(item);
	return items.length;
}
```

Prefixing the call with the `void` operator is an explicit opt-out, since it discards the return value. This is useful when the call returns a `Promise` you intentionally don't await:

```js
// ✅
void items.push(item);
```

## Concise-body arrows in callbacks

A concise-body arrow returns its expression even when the callback ignores the return value, like `Array#forEach`. The rule still flags this, since it reads as if the length mattered and usually means the loop can be written more directly.

```js
// ❌
source.forEach(item => target.push(item));

// ✅
target.push(...source);
```
