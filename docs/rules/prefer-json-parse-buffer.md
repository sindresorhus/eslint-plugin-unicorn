# Prefer reading a JSON file as a buffer

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When reading and parsing a JSON file, it's unnecessary to read it as a string, because [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) can also parse [`Buffer`](https://nodejs.org/api/buffer.html#buffer).

Passing in a buffer may not be performant and is not compatible with TypeScript.

## Fail

```js
const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
```

```js
const promise = fs.readFile('./package.json', {encoding: 'utf8'});
const packageJson = JSON.parse(await promise);
```

## Pass

```js
const packageJson = JSON.parse(await fs.readFile('./package.json'));
```

```js
const promise = fs.readFile('./package.json', {encoding: 'utf8', signal});
const packageJson = JSON.parse(await promise);
```

```js
const data = JSON.parse(await fs.readFile('./file.json', 'buffer'));
```

```js
const data = JSON.parse(await fs.readFile('./file.json', 'gbk'));
```
