# Prefer read JSON file as buffer

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

When parsing a JSON file, it's unnecessary to read it as string, because [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) can also parse [`Buffer`](https://nodejs.org/api/buffer.html#buffer).

## Fail

```js
const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
```

## Pass

```js
const packageJson = JSON.parse(await fs.readFile('./package.json'));
```

```js
const data = JSON.parse(await fs.readFile('./file.json', 'buffer'));
```

```js
const data = JSON.parse(await fs.readFile('./file.json', 'gbk'));
```
