# Prefer readable boolean variable names

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Boolean variable names should start with `is`/`was`/`has`/`can`/`should` for clarity and readability.

## Examples

```js
const completed = true; // ❌
const isCompleted = true; // ✅
```

```js
const completed = progress === 100; // ❌
const isCompleted = progress === 100; // ✅
```

```js
const completed = Boolean('true'); // ❌
const isCompleted = Boolean('true'); // ✅
```

```js
const completed = new Boolean('true'); // ❌
const isCompleted = new Boolean('true'); // ✅
```

```js
const adult = age >= 18; // ❌
const isAdult = age >= 18; // ✅
```

```js
const adult = age >= 18 ? true : false; // ❌
const isAdult = age >= 18 ? true : false; // ✅
```

```js
const gotModifyRights = isGotPreviewRights() && isGotDownloadRights(); // ❌
const isGotModifyRights = isGotPreviewRights() && isGotDownloadRights(); // ✅
```

```js
const showingModal = !!modalElement; // ❌
const isShowingModal = !!modalElement; // ✅
```

```js
const showingModal = (this.showingModal = true); // ❌
const isShowingModal = (this.showingModal = true); // ✅
```

```js
const showingModal = (doSomething(), !!modalElement); // ❌
const isShowingModal = (doSomething(), !!modalElement); // ✅
```

```js
// ❌
async function foo() {
  const completed = await progress === 100;
}

// ✅
async function foo() {
  const isCompleted = await progress === 100;
}
```

```js
// ❌
function* foo() {
  const completed = yield progress === 100;
}

// ✅
function* foo() {
  const isCompleted = yield progress === 100;
}
```

```js
// ❌
const isCompleted = true
const downloaded = isCompleted

// ✅
const isCompleted = true
const isDownloaded = isCompleted
```

<!-- Type Annotation -->
## Type Annotation

```js
const completed = isCompleted as  boolean; // ❌
const isCompleted = isCompleted as  boolean; // ✅
```

```js
const completed = isCompleted() as  boolean; // ❌
const isCompleted = isCompleted() as  boolean; // ✅
```

```js
// ❌
var isCompleted: boolean
const downloaded = isCompleted

// ✅
var isCompleted: boolean
const isDownloaded = isCompleted
```

```js
// ❌
function isCompleted(): boolean {}
const downloaded = isCompleted()

// ✅
function isCompleted(): boolean {}
const isDownloaded = isCompleted()
```

```js
function completed(): boolean {} // ❌
function isCompleted(): boolean {} // ✅
```

```js
const completed = (): boolean => {} // ❌
const isCompleted = (): boolean => {} // ✅
```

```js
function download(url: string, showProgress: boolean) {} // ❌

function download(url: string, shouldShowProgress: boolean) {} // ✅
```

## Options

You can specify which words can start with the string. The default is `['is', 'was', 'has', 'can', 'should']`.

If specified, it will be merged with the default value.

```js
{
  'unicorn/prefer-readable-boolean-variable-names': [
    'error',
    {
      prefixes: ['will', 'allows']
    }
  ]
}
```
