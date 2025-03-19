# Enforce consistent case for text encoding identifiers

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

- Enforce `'utf-8'` for [UTF-8](https://en.wikipedia.org/wiki/UTF-8) encoding.
- Enforce `'ascii'` for [ASCII](https://en.wikipedia.org/wiki/ASCII) encoding.

This rule only auto-fix encoding in `fs.readFile()` and `fs.readFileSync()`.

## Fail

```js
await fs.readFile(file, 'UTF-8');
```

```js
await fs.readFile(file, 'ASCII');
```

```js
const string = buffer.toString('utf8');
```

```js
const string = buffer.toString('UTF8');
```

## Pass

```js
await fs.readFile(file, 'utf-8');
```

```js
await fs.readFile(file, 'ascii');
```

```js
const string = buffer.toString('utf-8');
```
