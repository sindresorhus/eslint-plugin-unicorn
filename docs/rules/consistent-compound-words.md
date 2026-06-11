# consistent-compound-words

📝 Enforce consistent spelling of compound words in identifiers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Compound words should be treated as one word when applying identifier casing conventions.

This rule uses a conservative curated list of common compound-word mistakes in code identifiers. It is not a spellchecker or a prose style rule.

## Examples

```js
// ❌
const passWord = 'secret';

// ✅
const password = 'secret';
```

```js
// ❌
const isInViewPort = true;

// ✅
const isInViewport = true;
```

```js
// ❌
function unSubscribe() {}

// ✅
function unsubscribe() {}
```

## Intentionally not checked

This rule does not check string keys, computed properties, property reads, JSX attributes, or export aliases. These are often external API surfaces where preserving the exact spelling is more important than normalizing identifier style.

It also intentionally excludes ambiguous or common API spellings such as `fileName`, `setUp`, `lookUp`, and `newLine`. These can be natural identifiers when the words keep separate meaning, for example a newly created line instead of the newline character.

## Options

Type: `object`

### replacements

Type: `object`

You can extend default replacements by passing the `replacements` option.

```js
'unicorn/consistent-compound-words': [
	'error',
	{
		replacements: {
			fooBar: 'foobar',
			passWord: false,
		},
	},
]
```

### extendDefaultReplacements

Type: `boolean`\
Default: `true`

Pass `extendDefaultReplacements: false` to override the default `replacements` completely.

### allowList

Type: `object`

Use `allowList` to skip full identifier names case-sensitively. Values must be `true`.

```js
'unicorn/consistent-compound-words': [
	'error',
	{
		allowList: {
			legacyUserName: true,
		},
	},
]
```

### checkVariables

Type: `boolean`\
Default: `true`

Pass `checkVariables: false` to disable checking variable names.

### checkProperties

Type: `boolean`\
Default: `false`

Pass `checkProperties: true` to check property definitions and property writes.

### checkDefaultAndNamespaceImports

Type: `'internal' | boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in default or namespace imports, but only for internal modules.
- `true` - Check variables declared in default or namespace imports.
- `false` - Don't check variables declared in default or namespace imports.

### checkShorthandImports

Type: `'internal' | boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in shorthand imports, but only for internal modules.
- `true` - Check variables declared in shorthand imports.
- `false` - Don't check variables declared in shorthand imports.

### checkShorthandProperties

Type: `boolean`\
Default: `false`

Pass `checkShorthandProperties: true` to check variables declared as shorthand properties in object patterns.
