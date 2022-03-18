# Prefer reading a JSON file as a buffer

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

When reading and parsing a JSON file, it's unnecessary to read it as a string, because [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) can also parse [`Buffer`](https://nodejs.org/api/buffer.html#buffer).

## Fail

```js
const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
```

```js
const promise = fs.readFile('./package.json', {encoding: 'utf8'});
const packageJson = JSON.parse(promise);
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
