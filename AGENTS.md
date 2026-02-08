# Agents

## Rule anatomy

Rules export a default config object with `create` and `meta`. The `create` function uses `context.on(NodeType, listener)` to register visitors. Listeners return or yield problem objects (`{node, messageId, fix, suggest, data}`). See the [ESLint custom rules guide](https://eslint.org/docs/latest/extend/custom-rules) for full API details.

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
		schema,
		defaultOptions: [{option: 'default'}], // merged automatically
		messages,
	},
};
export default config;
```

Options are accessed via `context.options[0]`. Use `meta.defaultOptions` for defaults (no manual merging).

## Reusable utilities

Before writing helpers, check these directories:

- **`rules/ast/`** - AST node type checks: `isMethodCall`, `isCallExpression`, `isMemberExpression`, `isFunction`, `isStringLiteral`, etc.
- **`rules/utils/`** - General utilities: `needsSemicolon`, parenthesis helpers (`shouldAddParenthesesToMemberExpressionObject`, etc.), `isNodeMatches`, `getCallExpressionTokens`, `isSameReference`, `getReferences`, etc.
- **`rules/fix/`** - Fixer helpers: `removeArgument`, `removeMethodCall`, `replaceArgument`, `replaceReferenceIdentifier`, `removeParentheses`, `replaceTemplateElement`, `switchCallExpressionToNewExpression`, etc.
- **`rules/shared/`** - Shared rule logic for rules that share patterns (e.g., `simple-array-search-rule.js`).

Import from the barrel `index.js` in each directory (e.g., `import {isMethodCall} from './ast/index.js'`).

## Testing

Tests use AVA. Prefer `test.snapshot()` which auto-generates snapshots for errors, fixes, and suggestions:

```js
import {getTester} from './utils/test.js';
const {test} = getTester(import.meta);

test.snapshot({
	valid: ['validCode'],
	invalid: ['invalidCode'],
});
```

- Run all tests: `npm test`
- Run one rule's tests: `npx ava test/rule-name.js`
- Update snapshots: `npx ava test/rule-name.js -u`
- Focus a single case: wrap with `test.only('code')` or `test.only({code, options})` (remove before committing)
- For non-snapshot tests, use `test()` with explicit `errors` and `output`

## Autofix gotchas

When writing fix functions:

1. **Parentheses** - Replacing `foo` in `foo.bar()` with a complex expression may need wrapping: `(a + b).bar()`. Use helpers from `rules/utils/` like `shouldAddParenthesesToMemberExpressionObject`.
2. **Semicolons** - If a fix makes a statement start with `[` or `(`, check `needsSemicolon()` and prepend `;` if needed.
3. **Spacing** - Replacing `{foo}` with an identifier may merge tokens: `const{foo}` becomes `constfoo`. Add spaces when a symbol-boundary becomes a letter-boundary.
4. **Comments** - Avoid removing comments in fixes. Use range-aware replacements.
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

Run `npm run create-rule` to scaffold files, then write tests before implementing.
