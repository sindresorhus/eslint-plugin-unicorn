# no-invalid-dom-token

📝 Disallow invalid DOM tokens.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The `add()`, `remove()`, `toggle()`, and `replace()` methods of [`DOMTokenList`](https://dom.spec.whatwg.org/#interface-domtokenlist) expect individual tokens. An empty token throws a `SyntaxError` DOMException. A token containing [ASCII whitespace](https://infra.spec.whatwg.org/#ascii-whitespace) throws an `InvalidCharacterError` DOMException. Passing `'primary active'` does not operate on two classes.

ASCII whitespace is exactly tab (`\t`), line feed (`\n`), form feed (`\f`), carriage return (`\r`), and space. Other whitespace, including vertical tab (`\v`) and non-breaking space (`\u00A0`), is allowed in DOM tokens. Tokens do not have to be valid CSS identifiers.

This rule checks direct method calls on the `classList`, `relList`, `sandbox`, `part`, `sizes`, `blocking`, `htmlFor`, and `controlsList` properties. It supports optional chaining, literal computed properties, and TypeScript expression wrappers.

When TypeScript type information is available, the rule also checks receivers identified as `DOMTokenList`, including parameters and aliased token lists. Type information is not required for direct calls on the properties listed above.

All arguments to `add()` and `remove()` are tokens. Only the first argument to `toggle()` and the first two arguments to `replace()` are tokens. The rule checks string literals, statically known string expressions and constants, and interpolated templates whose literal text contains ASCII whitespace.

## Examples

```js
// ❌
element.classList.add('primary active');
element.classList.remove('');
element.classList.toggle(' primary');
element.classList.replace('primary', 'active selected');
link.relList.add('noopener noreferrer');

const token = 'primary active';
element.classList.add(token);

element.classList.add(`primary ${suffix}`);

// ✅
element.classList.add('primary', 'active');
element.classList.remove('primary');
element.classList.toggle('primary', isActive);
element.classList.replace('primary', 'active');
link.relList.add('noopener', 'noreferrer');
element.classList.add('primary\u00A0active');
```

## Suggestions

For `add()` and `remove()`, the rule suggests splitting a literal string or a template without interpolation into separate tokens. Leading and trailing ASCII whitespace is discarded, and token order and duplicates are preserved. Suggestions are withheld for empty or whitespace-only tokens and when replacing the argument would remove comments.

These corrections are suggestions rather than autofixes because they change a throwing call into a successful one. Constant references, compound expressions, interpolated templates, `toggle()`, and `replace()` do not receive suggestions.

## Limitations

Property-name matching does not prove that the receiver is a DOMTokenList. Without type information, aliased token lists are not checked. Dynamic method names, non-string arguments, and token values inside spreads are not checked; the rule does not attempt DOMString coercion. Static evaluation skips mutable bindings and expressions with side effects; templates can still be reported when their literal text contains ASCII whitespace. For `toggle()` and `replace()`, arguments after a spread are not checked because their positions are unknown.

The rule does not check `contains()` or `supports()`, attribute assignments, or whether a token belongs to an attribute's supported vocabulary. For example, assigning `'primary active'` to `classList.value` or `className` is valid.

[`no-selector-as-dom-name`](./no-selector-as-dom-name.md) checks selector prefixes such as `'.primary'`. Those prefixes are valid DOM token characters, so that rule complements this one. A value such as `'.primary active'` can be reported by both rules.
