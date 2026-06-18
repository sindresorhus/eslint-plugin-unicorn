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
			recommended: true, // 'unopinionated' (safest, in both presets), true (in recommended only), or false (opt-in)
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

### `recommended` config level

`meta.docs.recommended` picks the preset that enables the rule. `'unopinionated'` does NOT mean "too opinionated" — it means the opposite:

- **`'unopinionated'`** — Uncontroversial; in both `unopinionated` and `recommended` (the former is a subset). Safest bucket and the default for new rules.
- **`true`** — A more opinionated call, still on by default. In `recommended` only.
- **`false`** — Off by default, only in `all`. For niche or opt-in rules.

| `recommended` | `unopinionated` | `recommended` config | `all` |
|---|---|---|---|
| `'unopinionated'` | on | on | on |
| `true` | off | on | on |
| `false` (or omitted) | off | off | on |

So a rule too opinionated or niche for broad use is `false`, never `'unopinionated'`. If unsure which level fits, share your recommendation and ask.

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

## Code path analysis

Use [ESLint's code path analysis API](https://eslint.org/docs/latest/extend/code-path-analysis) when a rule needs to know whether control flow always exits a branch or function body (e.g., via `return`, `throw`, `break`, `continue`, exhaustive `switch`, infinite loop). CPA is more accurate than manual AST walking because it handles complex constructs like `try`/`catch`/`finally`, labeled breaks, and unreachable code after infinite loops.

When to use CPA instead of manual AST walking:

- **Checking if an `if` branch always exits** — Use `trackBranchExits` from `rules/utils/`. It registers CPA event listeners and returns a predicate `(branch) => boolean`. Query it after the `IfStatement` has exited (use `context.onExit`). Used by `no-useless-else`, `no-declarations-before-early-exit`, `prefer-else-if`.
- **Checking if a function body always exits** — Track segments per code path using `onCodePathStart`/`onCodePathEnd`/`onCodePathSegmentStart`/`onCodePathSegmentEnd`/`onUnreachableCodePathSegmentStart`/`onUnreachableCodePathSegmentEnd`. Snapshot segment reachability at `BlockStatement:exit` for function bodies (before code path segments end). See `require-proxy-trap-boolean-return` for the pattern.

Key implementation notes:

- Use a **per-code-path segment stack** (`segmentSetStack`) so nested functions don't pollute the enclosing path's state.
- When checking CPA data from a parent node, use `context.onExit` (not `context.on`) so inner code paths have been fully analyzed.
- At `onCodePathEnd`, all segments have already ended, so `currentSegments()` is empty. Snapshot reachability at the AST node exit (e.g., `BlockStatement:exit`) instead.
- `trackBranchExits` uses a `prevSegments`-based check: a branch "falls through" if any post-if merge segment has a `prevSegment` in the branch's terminal segment set.

When NOT to use CPA:

- Simple last-statement checks (e.g., "does the last statement return?") — just check `node.type`.
- Collecting return statements or associating them with functions — a simple function stack or AST walk is fine.
- Fixer logic that only needs to know "return or throw" in the last position — no CPA needed.

## Auto-generated files

- **`rules/index.js`** is auto-generated. Never edit it by hand. Run `npm run create-rules-index-file` to regenerate after adding or removing rules.
- **Doc headers** in `docs/rules/<rule>.md` (everything above `<!-- end auto-generated rule header -->`) are auto-generated by `eslint-doc-generator`. Do not edit them. Run `npm run fix:eslint-docs` to update.

On rebase, `rules/index.js` and the `readme.md` rules table almost always conflict because other rules were added meanwhile. Don't hand-resolve `rules/index.js` — take either side, then run `npm run create-rules-index-file`. For `readme.md`, keep both rows and re-sort the table alphabetically.

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
- **For new rules, run dogfooding before pushing**: `npm run run-rules-on-codebase`. Re-run it after each fix — fixes to rule logic often surface new violations elsewhere. Delete any scratch files first (e.g. in `.ai-temporary/`), or the dogfooding run lints them too.
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

## Linting

CI lints with **ESLint**, not `xo` — a clean `npx xo` run does not mean CI passes.

Run `npm run fix` (or `npm run fix:js` for JS only) — it auto-fixes and reports whatever remains. Prefer it over hand-fixing errors one at a time.

Lint enforces single quotes (`avoidEscape: false`, no template literals). Don't write backtick strings in test cases unless you need interpolation — `--fix` can't convert a backtick string that contains a `'`, so you'd have to fix it by hand.

## Autofix

Always try to provide an autofix if it cannot change runtime behavior. If an autofix could change runtime behavior, try to provide a suggestion instead.

Do not complicate autofixes to handle shadowed built-in globals like `Number`, `Math`, `parseInt`, or `parseFloat`. Treat that as unsupported unless the rule already has a simple, local scope-safety check for another reason.

Do not complicate autofixes to preserve Proxy or accessor side effects. Treat that as unsupported.

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

Name after the target construct, not the fix. Be specific: `no-array-method-this-argument` not `no-this-argument`.

## Creating a new rule

1. Run `npm run create-rule` to scaffold the rule file, test file, and doc file. This also regenerates `rules/index.js` and updates doc headers.
2. Write tests in `test/<rule>.js` before implementing the rule.
3. Implement the rule in `rules/<rule>.js`.
4. Write documentation in `docs/rules/<rule>.md` (below the auto-generated header).
5. Run `npx ava test/<rule>.js` to verify tests pass.
6. Before pushing, run lint (`npm run lint:js`, which runs `eslint` — see [Linting](#linting)), dogfooding (`npm run run-rules-on-codebase`), and then `npm test`. If dogfooding finds intentional internal patterns, disable the rule in `eslint.dogfooding.config.js` instead of adding repo-specific heuristics.

## Commit message format

Follow these conventions:

- **New rule**: `` Add `rule-name` rule ``
- **Fix/improve existing rule**: `` `rule-name`: Short description ``
- **General fix**: `Fix short description`
- **Add option to rule**: `` `rule-name`: Add `optionName` option ``
- **Drop a rule**: `` Drop `rule-name` rule ``

Always use backticks around rule names and option names in commit messages.
