# Creating a new rule

## Prerequisite

- Ensure ESLint doesn't already have the [rule built-in](https://eslint.org/docs/rules/).
- [Read the ESLint docs on creating a new rule.](https://eslint.org/docs/developer-guide/working-with-rules)
- Look at the commit for how previous rules were added as inspiration. For example, the [`no-unused-properties` rule](https://github.com/sindresorhus/eslint-plugin-unicorn/commit/0179443f24326fb01342a0bf799f7ac66e0e2c23).

## Tip

Use the [`astexplorer` site](https://astexplorer.net) with the `espree` parser and `ESLint v4` transform to interactively create the initial rule implementation. It lets you inspect the full AST as you would get from ESLint and you can even see the result of your auto-fixer implementation.

## Steps

- Run `$ npm run create-rule` to create files for the new rule.
- Open “test/{RULE_ID}.mjs” and write some tests before implementing the rule.
- Open “rules/{RULE_ID}.js” and implement the rule logic.
- Add the correct [`meta.type`](https://eslint.org/docs/developer-guide/working-with-rules#rule-basics) to the rule.
- Open “docs/rules/{RULE_ID}.js” and write some documentation.
- Double check `configs-legacy/recommended.js` and `readme.md`, make sure the new rule is correctly added.
- Run `$ npm test` to ensure the tests pass.
- Run `$ npm run integration` to run the rules against real projects to ensure your rule does not fail on real-world code.
- Open a pull request with a title in exactly the format `` Add `rule-name` rule ``, for example, `` Add `no-unused-properties` rule ``.
- The pull request description should include the issue it fixes, for example, `Fixes #123`.
- Run `$ npm run run-rules-on-codebase` to run the rules against codebase to ensure code in the repository are following your rule, _you can ignore this step until your PR is reviewed_.
