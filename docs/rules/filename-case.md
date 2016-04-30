# Enforce a case style for filenames

Enforces all linted files to have their names in a certain case style. Default is `kebabCase`.


### `kebabCase`

- `foo-bar.js`
- `foo-bar.test.js`
- `foo-bar.test-utils.js`

### `camelCase`

- `fooBar.js`
- `fooBar.test.js`
- `fooBar.testUtils.js`

### `snakeCase`

- `foo_bar.js`
- `foo_bar.test.js`
- `foo_bar.test_utils.js`

### `pascalCase`

- `FooBar.js`
- `FooBar.Test.js`
- `FooBar.TestUtils.js`


## Options

You can set the `case` option like this:

```js
"xo/filename-case": ["error", {"case": "kebabCase"}]
```
