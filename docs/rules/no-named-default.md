# no-named-default

📝 Disallow named usage of default import and export.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of the [`default import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) and [`default export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export#using_the_default_export) syntax instead of named syntax.

## Examples

```js
// ❌
import {default as foo} from 'foo';

// ✅
import foo from 'foo';
```

```js
// ❌
import {default as foo, bar} from 'foo';

// ✅
import foo, {bar} from 'foo';
```

```js
// ❌
export {foo as default};

// ✅
export default foo;
```

```js
// ❌
export {foo as default, bar};

// ✅
export default foo;
export {bar};
```

```js
// ❌
import foo, {default as anotherFoo} from 'foo';

function bar(foo) {
	doSomeThing(anotherFoo, foo);
}

// ✅
import foo from 'foo';
import anotherFoo from 'foo';

function bar(foo) {
	doSomeThing(anotherFoo, foo);
}

// ✅
import foo from 'foo';

const anotherFoo = foo;

function bar(foo) {
	doSomeThing(anotherFoo, foo);
}
```
