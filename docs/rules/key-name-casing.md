# key-name-casing

📝 Enforce a case style for data keys.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Enforce a consistent case style for decoded keys in JSON, JSONC, JSON5, YAML, and TOML. This includes unquoted JSON5 keys, YAML string keys (except plain `<<` merge keys), and TOML key segments, including table names. Non-string YAML keys and string values are skipped.

Renaming keys can break consumers in other files, so the rule has no fixes or suggestions.

## Examples

```jsonc
// ❌
{"user_name": 1, "nested": {"OtherKey": 2}}

// ✅
{"userName": 1, "nested": {"otherKey": 2}}
```

The rule also reports YAML `user-name: 1` and TOML `[user_settings]` with the default `camelCase` style.

## Options

Type: `object`

Each enabled case is accepted. `camelCase` is enabled by default; set it to `false` when choosing another case exclusively. If all cases are disabled, no keys are checked.

| Option | Default | Example |
| --- | --- | --- |
| `camelCase` | `true` | `userName` |
| `PascalCase` | `false` | `UserName` |
| `SCREAMING_SNAKE_CASE` | `false` | `USER_NAME` |
| `'kebab-case'` | `false` | `user-name` |
| `snake_case` | `false` | `user_name` |

Case styles use canonical conversions from `change-case`. Acronyms are normalized, so `userId` is camelCase while `userID` is not. Empty keys and keys containing whitespace or punctuation fail unless explicitly ignored.

```js
'unicorn/key-name-casing': ['error', {
	camelCase: false,
	snake_case: true,
	SCREAMING_SNAKE_CASE: true,
}]
```

### ignore

Type: `string[]`\
Default: `[]`

Regular expression patterns matching decoded key names to ignore. Patterns are not automatically anchored. Use `^` and `$` to match a complete name.

```js
'unicorn/key-name-casing': ['error', {
	ignore: ['^\\$schema$', '^x-'],
}]
```
