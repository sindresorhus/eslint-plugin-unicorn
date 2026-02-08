# Disallow top-level side effects in module files

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Importing a module should not produce observable side effects. Side-effectful code at the top level makes modules harder to test, tree-shake, and reason about. Side effects should be wrapped in exported functions that consumers call explicitly.

Files without any exports (entry points) and files with a hashbang (`#!/usr/bin/env node`) are exempt.

## Examples

### Fail

```js
console.log('loaded');
export const foo = 'bar';
```

```js
fetch('/api/init');
export default function app() {}
```

```js
document.title = 'My App';
export const x = 1;
```

### Pass

```js
// Variable declarations with initializers are fine
export const response = fetch('/api');
```

```js
// Side effects wrapped in exported functions
export function init() {
	document.title = 'My App';
	console.log('loaded');
}
```

```js
// Files with no exports are entry points — exempt
console.log('hello');
document.title = 'My App';
```

```js
// Declarations are fine
export function setup() {}
export class App {}
```
