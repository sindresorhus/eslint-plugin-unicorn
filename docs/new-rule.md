# Creating a new rule

## Prerequisite

- [Read the ESLint docs on creating a new rule.](https://eslint.org/docs/developer-guide/working-with-rules)
- Look at the commit for how previous rules were added as inspiration. For example, the [`no-unused-properties` rule](https://github.com/sindresorhus/eslint-plugin-unicorn/commit/0179443f24326fb01342a0bf799f7ac66e0e2c23).


## Tip

Use the [`astexplorer` site](https://astexplorer.net) with the `espree` parser and `ESLint v4` transform to interactively create the initial rule implementation. It lets you inspect the full AST as you would get from ESLint and you can even see the result of your auto-fixer implementation.


## Steps

- Go to the `test` directory and duplicate the `no-hex-escape.js` file and rename it to the name of your rule. Then write some tests before starting to implement the rule.
- Go to the `rules` directory and duplicate the `no-hex-escape.js` file and rename it to the name of your rule. Then start implementing the new rule logic.
- Go to the `docs/rules` directory and duplicate the `no-hex-escape.md` file and rename it to the name of your rule. Then write some documentation.
- Add the rule to [the recommended config](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/352ba4a0291f9210ca5c8e2e61c7e3ad14028e77/index.js#L19), [the recommended config in the readme](https://github.com/sindresorhus/eslint-plugin-unicorn/blame/352ba4a0291f9210ca5c8e2e61c7e3ad14028e77/readme.md#L35), and [the rule listing in the readme](https://github.com/sindresorhus/eslint-plugin-unicorn/blame/352ba4a0291f9210ca5c8e2e61c7e3ad14028e77/readme.md#L77) (The description should be the same as the heading of the documentation file).
- Run `$ npm test` to ensure the tests pass.
- Run `$ npm run integration` to run the rules against real projects to ensure your rule does not fail on real-world code.
- Open a pull request with a title like `` Add `rule-name` rule ``, for example, `` Add `no-unused-properties` rule ``.
- The pull request description should include the issue it fixes, for example, `Fixes #123`.
