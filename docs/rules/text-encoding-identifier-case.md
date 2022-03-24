# Enforce consistent case for text encoding identifiers

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

- Enforce `'utf8'` for [UTF-8](https://en.wikipedia.org/wiki/UTF-8) encoding.
- Enforce `'ascii'` for [ASCII](https://en.wikipedia.org/wiki/ASCII) encoding.

## Fail

```js
await fs.readFile(file, 'UTF-8');
```

```js
await fs.readFile(file, 'ASCII');
```

```js
const string = buffer.toString('utf-8');
```

## Pass

```js
await fs.readFile(file, 'utf8');
```

```js
await fs.readFile(file, 'ascii');
```

```js
const string = buffer.toString('utf8');
```
