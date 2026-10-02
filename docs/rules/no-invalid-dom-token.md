# no-invalid-dom-token

📝 Disallow invalid DOM tokens.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

DOM token methods [`add()`, `remove()`, `toggle()`, and `replace()`](https://dom.spec.whatwg.org/#interface-domtokenlist) throw for empty tokens or tokens containing [ASCII whitespace](https://infra.spec.whatwg.org/#ascii-whitespace): space, tab (`\t`), line feed (`\n`), form feed (`\f`), or carriage return (`\r`). Other whitespace, such as `\v` and `\u00A0`, is allowed. Tokens need not be valid CSS identifiers.

The rule checks `classList`, `relList`, `sandbox`, `part`, `sizes`, `blocking`, `htmlFor`, and `controlsList`. With TypeScript type information, it also recognizes token-list parameters and aliases.

It checks all `add()`/`remove()` arguments, the first `toggle()` argument, and the first two `replace()` arguments. Optional chaining, literal computed properties, TypeScript wrappers, statically known strings, and whitespace in fixed template text are supported.

## Examples

```js
// ❌
element.classList.add('primary active');

// ✅
element.classList.add('primary', 'active');
```

```js
// ❌
element.classList.remove('');

// ✅
element.classList.remove('primary');
```

```js
// ❌
element.classList.toggle(' primary', isActive);

// ✅
element.classList.toggle('primary', isActive);
```

```js
// ❌
element.classList.replace('primary', 'active selected');

// ✅
element.classList.replace('primary', 'active');
```

```js
// ❌
element.classList.add(`primary ${suffix}`);

// ✅
element.classList.add('primary', suffix);
```

## Suggestions

For `add()` and `remove()`, suggestions split string literals and templates without interpolation on ASCII whitespace, preserving token order and duplicates. No suggestion is offered if no tokens remain or comments would be removed. There is no autofix because these changes turn throwing calls into successful ones.

## Limitations

Receiver matching by property name is heuristic. Without type information, aliases are ignored. Dynamic method names and spread tokens are ignored, and non-string arguments are not coerced. Static evaluation skips mutable bindings and side effects, but fixed template text is still checked. For `toggle()` and `replace()`, checking stops at the first spread.

`contains()`, `supports()`, attribute assignments, and supported token vocabularies are outside this rule's scope.

Use [`no-selector-as-dom-name`](./no-selector-as-dom-name.md) to catch selector prefixes such as `'.primary'`, which are valid DOM tokens.
