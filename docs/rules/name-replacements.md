# name-replacements

📝 Enforce replacements for variable, property, and filenames.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using clear names results in more readable code. Code is written only once, but read many times.

This rule enforces replacements for names, including variables, properties, imports, and filenames. The default replacements focus on common abbreviations, but the rule can also be used to replace terms, disallow words, etc. See the [`replacements`](#replacements) and [`extendDefaultReplacements`](#extenddefaultreplacements) options.

You can find the default replacements [here](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/rules/shared/name-replacements.js).

This rule is automatically fixable only for variable names with exactly one replacement defined. Ambiguous variable names and checked property names can be manually fixed with editor suggestions when the rename is local to source text. Filename reports and exported-name property reports do not provide editor suggestions.

Parameter names do not provide autofixes or editor suggestions when the function has an attached JSDoc `@param` comment, as those name references are not normal variable references and would otherwise be left stale. TypeScript parameter properties also do not provide autofixes or editor suggestions, as the corresponding class property references are not part of the parameter variable's references. TypeScript type predicate and assertion signature parameter references are updated when the parameter is renamed.

## React

React projects commonly use abbreviation families like `props`, `ref`, `prevState`, and route `params`. The `replacements` option disables matching those words both as complete identifiers and as parts of longer identifiers, for example `someRef`.

Use an ESLint `files` override if you only want to allow those conventions in React files:

```js
{
	files: ['**/*.{jsx,tsx}'],
	rules: {
		'unicorn/name-replacements': [
			'error',
			{
				replacements: {
					param: false,
					params: false,
					prev: false,
					prop: false,
					props: false,
					ref: false,
					refs: false,
				},
			},
		],
	},
}
```

## Examples

```js
// ❌
const e = new Error();

// ✅
const error = new Error();
```

```js
// ❌
const e = document.createEvent('Event');

// ✅
const event = document.createEvent('Event');
```

```js
// ❌
class Btn {}

// ✅
class Button {}
```

```js
// ✅
// Property is not checked by default
const levels = {
	err: 0
};
```

```js
// ✅
// Property is not checked by default
this.evt = 'click';
```

## Options

Type: `object`

### replacements

Type: `object`

You can extend default replacements by passing the `replacements` option.

Use this to configure discouraged terms and their replacements. To allow a specific full identifier, use [`allowList`](#allowlist) instead.

Lowercase replacements will match both camelcase and pascalcase identifiers. For example, `err` will match both `err` and `Err`. `errCb` will match both `errCb` and `ErrCb`.

Lowercase replacements will match both complete identifiers and separate words inside identifiers. For example, `cmd` will match all of `cmd`, `createCmd` and `CmdFactory`.

Camelcase replacements will only match complete identifiers. For example `errCb` will only match `errCb` and `ErrCb`. It will not match `fooErrCb` or `errCbFoo`.

The example below:

- disables the default `e` → `event` replacement (leaving `e` → `error` enabled),
- disables `res` replacement completely (both `res` → `response` and `res` → `result` from defaults are disabled),
- adds a custom `usr` → `user` replacement,
- adds a custom `errCb` → `handleError` replacement.

```js
'unicorn/name-replacements': [
	'error',
	{
		replacements: {
			e: {
				event: false,
			},
			res: false,
			usr: {
				user: true,
			},
			errCb: {
				handleError: true,
			},
		},
	},
]
```

### extendDefaultReplacements

Type: `boolean`\
Default: `true`

Pass `"extendDefaultReplacements": false` to override the default `replacements` completely.

The example below disables all the default replacements and enables a custom `usr` → `user` one.

```js
'unicorn/name-replacements': [
	'error',
	{
		extendDefaultReplacements: false,
		replacements: {
			usr: {
				user: true,
			},
		},
	},
]
```

Defaults can also include terminology preferences that are not abbreviations. Use custom replacements for project-specific preferences:

```js
'unicorn/name-replacements': [
	'error',
	{
		replacements: {
			page: {
				screen: true,
			},
			pages: {
				screens: true,
			},
		},
	},
]
```

### allowList

Type: `object`

You can extend the default allowList by passing the `allowList` option.

Unlike the `replacements` option, `allowList` matches full identifier names case-sensitively.

For example, if you want to report `props` → `properties` (enabled by default), but allow `getInitialProps`, you could use the following configuration.

```js
'unicorn/name-replacements': [
	'error',
	{
		allowList: {
			getInitialProps: true,
		},
	},
]
```

For example, `allowList: {elementRef: true}` allows `elementRef` while still reporting `ref`.

### extendDefaultAllowList

Type: `boolean`\
Default: `true`

Pass `"extendDefaultAllowList": false` to override the default `allowList` completely.

### checkDefaultAndNamespaceImports

Type: `'internal' | boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in default or namespace import, **but only for internal modules**.
- `true` - Check variables declared in default or namespace import.
- `false` - Don't check variables declared in default or namespace import.

By default, the following code will be reported:

```js
import * as err from './err';
```

```js
import err from '/err';
```

With this set to `true`, the following code will be reported:

```js
import tempWrite from 'temp-write';
```

```js
import * as err from 'err';
```

### checkShorthandImports

Type: `'internal'` | `boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in shorthand import, **but only for internal modules**.
- `true` - Check variables declared in shorthand import.
- `false` - Don't check variables declared in default shorthand import.

By default, the following code will be reported:

```js
import {prop} from './foo';
```

With this set to `true`, the following code will be reported:

```js
import {prop} from 'ramda';
```

### checkShorthandProperties

Type: `boolean`\
Default: `false`

Pass `"checkShorthandProperties": true` to check variables declared as shorthand properties in object destructuring.

With this set to `true` the following code will be reported.

```js
const {err} = foo;
```

```js
function f({err}) {}
```

### checkProperties

Type: `boolean`\
Default: `false`

Pass `"checkProperties": true` to enable checking property names.

### checkVariables

Type: `boolean`\
Default: `true`

Pass `"checkVariables": false` to disable checking variable names.

### checkFilenames

Type: `boolean`\
Default: `true`

Pass `"checkFilenames": false` to disable checking filenames.

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

This option lets you specify a regex pattern for matches to ignore.

When a string is given, it's interpreted as a regular expression inside a string.

```js
'unicorn/name-replacements': [
	'error',
	{
		ignore: [
			'\\.fixtures$',
			/^ignore/i,
		],
	},
]
```

When checking filenames, only the basename is tested. For example, with a file named `foo.fixtures.js`, `ignore: [/\.fixtures$/]` would pass and `ignore: [/\.fixtures\.js/]` would fail.
