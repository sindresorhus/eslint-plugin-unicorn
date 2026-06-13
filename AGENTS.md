# Agents

## Philosophy

Keep rules simple. Target common patterns, skip rare edge cases rather than overcomplicating the rule.

## Rule anatomy

Rules export a default config object with `create` and `meta`. The `create` function uses `context.on(NodeType, listener)` to register visitors (this is the Unicorn-specific API, not standard ESLint). See the [ESLint custom rules guide](https://eslint.org/docs/latest/extend/custom-rules) for the underlying API.

Key differences from standard ESLint:

- Use `context.on('NodeType', listener)` and `context.onExit('NodeType', listener)` instead of returning a visitor object.
- Listeners return or yield problem objects (`{node, messageId, fix, suggest, data}`) directly. The adapter calls `context.report()` for you.
- Fix functions receive `(fixer, {abort})`. Call `abort()` to bail out of an unfixable case.

```js
const MESSAGE_ID = 'rule-name';

const messages = {
	[MESSAGE_ID]: 'Error message with {{placeholder}}.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		return {
			node,
			messageId: MESSAGE_ID,
			data: {placeholder: 'value'},
			fix: fixer => fixer.replaceText(node, 'replacement'),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce …',
			recommended: true, // or 'unopinionated'
		},
		fixable: 'code', // or omit; add hasSuggestions: true for suggestions
		schema: [],
		defaultOptions: [{option: 'default'}], // merged automatically
		messages,
	},
};
export default config;
```

Options are accessed via `context.options[0]`. Use `meta.defaultOptions` for defaults (no manual merging).

Name boolean options in the positive `check*` form (for example, `checkProperties`), never the negated `ignore*`/`skip*` form, so option naming stays consistent across rules. This does not apply to array/pattern options like `ignore` (a list of patterns to ignore), which follow ESLint's own conventions.

### Helper naming

Name helpers after what they return or do:

- `is*`/`has*`/`should*`/`can*`/`needs*` must return booleans. Prefer explicit `false` over `undefined` in predicate helpers.
- `get*Problem` returns one problem object or `undefined`; `get*Problems` returns/yields multiple problem objects.
- `report*` should call `context.report()` directly.
- Avoid `check*` for private helpers. Reserve `check*` for public boolean options, like `checkProperties`.
- Do not combine reporting/yielding with a predicate return. Split into a problem builder and a boolean at the call site.

## Rule languages

Every new rule should declare the official [`meta.languages`](https://eslint.org/docs/latest/extend/custom-rules#rule-languages) field, in `"plugin/language"` form, one per line: `['js/js']` for JavaScript/TypeScript-only rules (most), or the languages it supports (for example `['js/js', 'css/css']`, or `['*']` for any file type).

Available identifiers:

- `js/js` — JavaScript and TypeScript
- `css/css` — [`@eslint/css`](https://github.com/eslint/css)
- `json/json`, `json/jsonc`, `json/json5` — [`@eslint/json`](https://github.com/eslint/json)
- `markdown/commonmark`, `markdown/gfm` — [`@eslint/markdown`](https://github.com/eslint/markdown)
- `html/html` — [`@html-eslint/eslint-plugin`](https://github.com/yeonjuan/html-eslint)

Most rules visit JavaScript AST nodes, so `js/js` is all they can support. But when a rule's logic is language-agnostic (filename, raw text, comments, or disable directives), support as many languages as is feasible. Root node types differ per language (`Program` for JS/TS and HTML, `StyleSheet` for CSS, `Document` for JSON, `root` for Markdown), so use `onRoot(context, listener)` to run on every root and `getComments(context)` for cross-language comments (both from `rules/utils/`). For reference, see `prefer-https` (`['*']`, raw-text scan) and `no-empty-file` (per-language root handlers).

## Reusable utilities

Before writing helpers, check these directories:

- **`rules/ast/`** - AST node type checks: `isMethodCall`, `isCallExpression`, `isMemberExpression`, `isFunction`, `isStringLiteral`, etc.
- **`rules/utils/`** - General utilities: `needsSemicolon`, parenthesis helpers (`shouldAddParenthesesToMemberExpressionObject`, etc.), `isNodeMatches`, `getCallExpressionTokens`, `isSameReference`, `getReferences`, etc.
- **`rules/fix/`** - Fixer helpers: `removeArgument`, `removeMethodCall`, `replaceArgument`, `replaceReferenceIdentifier`, `removeParentheses`, `replaceTemplateElement`, `switchCallExpressionToNewExpression`, etc.
- **`rules/shared/`** - Shared rule logic for rules that share patterns (e.g., `simple-array-search-rule.js`).

Import from the barrel `index.js` in each directory (e.g., `import {isMethodCall} from './ast/index.js'`).

If a helper becomes complicated and clearly general across rules, consider moving it to a shared utility. Keep simple or rule-specific helpers local.

Also use `@eslint-community/eslint-utils` for helpers like `findVariable`, `getStaticValue`, `hasSideEffect`, `getPropertyName`, and token predicates (`isCommaToken`, `isSemicolonToken`, etc.).

Most commonly used utilities:

- **`isMethodCall`** - The most used helper. Check if a node is a method call matching specific criteria.
- **`isParenthesized`**, **`getParenthesizedRange`** (from `rules/utils/`) - Handle extra parentheses around nodes.
- **`needsSemicolon`** - Check if a semicolon is needed before a replacement.
- **`isValueNotUsable`** - Check if a call expression's return value is unused (safe to change behavior).
- **`hasSideEffect`** (from `@eslint-community/eslint-utils`) - Check if a node has side effects, important for safe autofixes.
- **`findVariable`** (from `@eslint-community/eslint-utils`) - Resolve a variable's scope binding.
- **`getStaticValue`** (from `@eslint-community/eslint-utils`) - Get a node's static value at lint time.
- **`fixSpaceAroundKeyword`**, **`removeMethodCall`**, **`removeArgument`** - Common fix helpers.

## Auto-generated files

- **`rules/index.js`** is auto-generated. Never edit it by hand. Run `npm run create-rules-index-file` to regenerate after adding or removing rules.
- **Doc headers** in `docs/rules/<rule>.md` (everything above `<!-- end auto-generated rule header -->`) are auto-generated by `eslint-doc-generator`. Do not edit them. Run `npm run fix:eslint-docs` to update.

## Documentation

Use JavaScript syntax for configuration examples, not JSON-style quoted keys and strings, unless the example is specifically JSON.

## Testing

Tests should be comprehensive with many edge cases, but no duplicate coverage. Add lots of focused edge-case tests for matching and fixes/suggestions. Add tests for edge cases the rule intentionally ignores to document the behavior.

Tests use AVA. Prefer `test.snapshot()` which auto-generates snapshots for errors, fixes, and suggestions:

```js
import {getTester} from './utils/test.js';
const {test} = getTester(import.meta);

test.snapshot({
	valid: ['validCode'],
	invalid: ['invalidCode'],
});
```

Other test modes: `test.typescript()` and `test.vue()` set the parser for all cases in the block. For individual TypeScript cases within a normal `test.snapshot()`, use `{code, parser: parsers.typescript}` instead. Import `parsers` from `./utils/test.js`.

- **Never run integration tests** (`test/integration/test.js`). They are too slow for development.
- **While developing, only run targeted tests**: `npx ava test/rule-name.js`. Do not run `npm test` or the full suite until all changes are complete.
- **Only run the full test suite (`npm test`) once at the very end** to confirm everything passes.
- **For new rules, run dogfooding before pushing**: `npm run run-rules-on-codebase`.
- Update snapshots: `npx ava test/rule-name.js -u`
- Focus a single case: wrap with `test.only('code')` or `test.only({code, options})` (remove before committing)
- For non-snapshot tests, use `test()` with explicit `errors` and `output`

### Edge cases to test

Include test cases for these when relevant to the rule:

- **TypeScript** - Type assertions (`foo as Bar`, `<Bar>foo`), non-null assertions (`foo!`), `satisfies`, generics. Verify both matching and fixer/suggestion output, including optional chaining behavior and ASI protection when the output can start with `(` or `[`. Use `{code, parser: parsers.typescript}`.
- **JSX** - JSX expressions and fragments, if the rule targets patterns that can appear in JSX.
- **Comments** - Inline and block comments inside the targeted node, to verify fixes don't drop them.
- **Parenthesized expressions** - Extra parentheses around the target: `(foo).bar()`.
- **Nested/chained** - The pattern appearing inside other expressions or chained calls.
- **Computed properties** - `obj[method]()` vs `obj.method()`.
- **Tagged templates** - `` tag`string` ``.
- **Optional chaining** - `foo?.bar()`, `foo?.bar?.baz`.
- **Spread** - `[...foo]`, `{...foo}`, `fn(...args)`.
- **Destructuring** - The pattern inside destructuring assignments or parameters.
- **Return value used vs unused** - `const x = foo.bar()` vs `foo.bar()` as a statement. Some fixes are only safe when the return value is unused (see `isValueNotUsable`).

## Autofix

Always try to provide an autofix if it cannot change runtime behavior. If an autofix could change runtime behavior, try to provide a suggestion instead.

Do not complicate autofixes to handle shadowed built-in globals like `Number`, `Math`, `parseInt`, or `parseFloat`. Treat that as unsupported unless the rule already has a simple, local scope-safety check for another reason.

When writing fix functions:

1. **Comments** - Fixes must not remove or relocate comments. If the node being replaced/removed contains comments, either skip the fix (use `abort()`) or use range-aware replacements that preserve them. Check with `sourceCode.getCommentsInside(node)`.
2. **Parentheses** - Replacing `foo` in `foo.bar()` with a complex expression may need wrapping: `(a + b).bar()`. Use helpers from `rules/utils/` like `shouldAddParenthesesToMemberExpressionObject`.
3. **Semicolons** - If a fix makes a statement start with `[` or `(`, check `needsSemicolon()` and prepend `;` if needed.
4. **Spacing** - Replacing `{foo}` with an identifier may merge tokens: `const{foo}` becomes `constfoo`. Add spaces when a symbol-boundary becomes a letter-boundary.
5. **Generator fixes** - Use `* fix(fixer) { yield ... }` for multi-step fixes.
6. **Suggestions** - Use `suggest` array with `messageId` and `fix` when autofix could change runtime behavior. Set `hasSuggestions: true` in meta.

## Rule naming

Use a clear prefix that signals intent (see [ESLint built-in rules](https://eslint.org/docs/latest/rules/) for inspiration):

- **`no-`** - Disallow something: `no-array-reduce`, `no-await-in-promise-methods`
- **`prefer-`** - Suggest a better alternative: `prefer-array-flat-map`, `prefer-set-has`
- **`require-`** - Mandate something is present: `require-array-join-separator`
- **`consistent-`** - Enforce a single consistent style: `consistent-destructuring`
- **No prefix** - Enforce a specific pattern: `error-message`, `filename-case`, `throw-new-error`

Name after the target construct, not the fix. Be specific: `no-array-for-each` not `no-foreach`.

## Creating a new rule

1. Run `npm run create-rule` to scaffold the rule file, test file, and doc file. This also regenerates `rules/index.js` and updates doc headers.
2. Write tests in `test/<rule>.js` before implementing the rule.
3. Implement the rule in `rules/<rule>.js`.
4. Write documentation in `docs/rules/<rule>.md` (below the auto-generated header).
5. Run `npx ava test/<rule>.js` to verify tests pass.
6. Before pushing, run lint, dogfooding, and then `npm test`. If dogfooding finds intentional internal patterns, disable the rule in `eslint.dogfooding.config.js` instead of adding repo-specific heuristics.

## Commit message format

Follow these conventions:

- **New rule**: `` Add `rule-name` rule ``
- **Fix/improve existing rule**: `` `rule-name`: Short description ``
- **General fix**: `Fix short description`
- **Add option to rule**: `` `rule-name`: Add `optionName` option ``
- **Drop a rule**: `` Drop `rule-name` rule ``

Always use backticks around rule names and option names in commit messages.
