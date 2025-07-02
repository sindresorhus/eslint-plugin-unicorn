# Add expiration conditions to TODO comments

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule makes it possible to pass arguments to TODO, FIXME and XXX comments to trigger ESLint to report.

From [ESLint's documentation](https://eslint.org/docs/latest/rules/no-warning-comments):

> Developers often add comments to code which is not complete or needs review.

TODO comments are useful when a piece of code needs some work. Unfortunately these can be easily forgotten as it's common to forget to track them, leaving dangling tasks to be found at later random moments, or never at all.

With this rule, a TODO can have a condition right from the beginning to define its lifespan. When the condition is met, ESLint will take care of reporting that there's work to be done.

This rule will ignore all TODOs without conditions. For more information, read the below [`eslint/no-warning-comments`](#disallow-warning-comments-no-warning-comments) section.

Quick overview of conditions:

- Expire after a **specific date**.
- Expire when **your package** (package.json) reaches a specific **version**.
- Expire when a package.json **`engines`** property reaches a specific **version**.
- Expire when you **install/uninstall** a specific **package**.
- Expire when a **package** reaches a specific **version**.

## Conditions

### Expiry Date

Using a date as condition, a TODO will only work as long as this date is not met. This is especially useful when you either know when the action should take place or simply want to set boundaries for yourself.

```js
// TODO [2019-11-15]: Refactor this code before the sprint ends.
// TODO (@lubien) [2019-07-18]: When John delivers his code. I can reuse it.
// TODO [2019-08-10]: I must refactor this for sure before I deliver.
```

Dates are in [ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601#Dates) and use [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) as timezone.

Multiple dates on the same TODO are not valid and will be reported. There's no point in having two dates as the closest one will always be the one that is reported.

### Package Version

If you're working on an npm package, you should have a root level package.json with a [`version`](https://docs.npmjs.com/files/package.json#version) field as specified by npm. This condition takes place under this value.

By assigning a condition to compare a package.json `version`, the TODO will report as soon as the condition is met. It's really useful when the work is related to the version of the package itself such as deprecated APIs.

```js
// TODO [>=1.0.0]: I should work around this when we reach v1.
// TODO (@lubien) [>0]: For now this is fine but for a stable version we must refactor.
// FIXME [>10]: This feature is deprecated and should be removed from the next major version.
```

Multiple package versions on the same TODO are not valid and will be reported. Just like dates, multiple versions will make no sense as the closest one will be the one to trigger the report.

### Engine Version

In package.json, you can specify an [`"engines"` field](https://docs.npmjs.com/files/package.json#engines) with the Node.js (`node`) versions that your package supports.

With that in mind, this condition is triggered as soon as package.json's `node` engine reaches the target version. This is particularly useful for maintainers that strive for compatibility but have plans for the future when some feature will be widely available and when support for older versions could be dropped.

Imagine you want to use `async`/`await` but for now you support Node.js versions that don't have it. Maybe you're eager to use `import` and `export` but for now you have to support CommonJS?

```js
// TODO [engine:node@>=8]: We can use async/await now.
// FIXME [engine:node@>=20.0.0]: Hey, node can use import/export now, we should refactor.
```

Argument versions should be [semver](https://semver.org/) compatible such as: `1.2.45`, `5.3`, `1`.

Only the `node` engine is supported by this condition.

Supported comparisons are `>` and `>=`. Comparison must have a `@` before such as `@>` and `@>=`.

### Dependency Presence

As a Node.js developer, you probably already know about package.json [dependencies](https://docs.npmjs.com/files/package.json#dependencies) and [devDependencies](https://docs.npmjs.com/files/package.json#devdependencies). This condition works based on the presence or absence of dependencies in both fields.

You may use `+` to trigger when a dependency is added and `-` when a dependency is removed.

```js
// TODO [-vue-function-api]: When we remove `vue-function-api` we should refactor this.
// FIXME [+read-pkg]: If we use this package we don't need to use this function below.
// XXX @lubien [+react, -jquery]: We can use React for this widget instead of jQuery.
```

Such conditions are really useful when the code depends upon changes in dependencies that are known to be happening such as `vue-function-api` that will eventually be part of `vue` itself.

### Dependency Version

Another way to make conditions based on dependencies is to look at versions. This is useful when developers know that changes in future versions of dependencies will impact their code.

```js
// TODO [vue@>=3]: Refactor to function API when it's stable.
// FIXME [cerebro@>0.10.0]: This is a quickfix until cerebro fixes this.
// XXX [popura@>=2.0.0]: This API is deprecated so we should not use it by then.
```

Argument versions should be [semver](https://semver.org/) compatible such as: `1.2.45`, `5.3`, `1`.

Supported comparisons are `>` and `>=`. Comparison must have a `@` before such as `@>` and `@>=`.

### Pre-releases

TODO comments with rules for package.json and dependency versions support the semver pre-release format, such as `1.0.0-my.pre.release.1.2.3`. This means that if your TODO asks for version `>=1.0.0` and you're in `1.0.0-beta`, your TODO will **not** trigger as a pre-release comes first. When the version is at least `1.0.0`, it will properly trigger.

Keep in mind that pre-releases compare by number and alphabetical order. Example: `1.0.0-alpha` < `1.0.0-alpha.1` < `1.0.0-alpha.beta` < `1.0.0-beta` < `1.0.0-beta.2` < `1.0.0-beta.11` < `1.0.0-rc.1` < `1.0.0`.

You can read more about the semver pre-release format [here](https://semver.org/#spec-item-9) and semver precedence rules [here](https://semver.org/#spec-item-11).

### Combinations

Any combination of rules is possible as long as you separate them by commas. Each condition **triggers an individual report.**

```js
// TODO [+react, -jquery]: We can use React for this widget instead of jQuery.
// TODO [2019-07-15, +react]: Refactor this if we install React or if we reach that date.
// TODO [-vue-function-api, vue@>=3]: Now we should use Vue native function API.
```

### Block Comments

You can also use block comments to specify TODOs with conditions. Each line can have its own set of conditions. This is especially useful when you aim for more details.

```js
/*
 * We should really make this code better.
 * When we support Node.js 12 we can refactor imports.
 * And we also can do [x], [y], [z].
 * TODO [engine:node@>=12]: Use import/export.
 */

/*
 * This code would be so easy if we used `popura` package helpers.
 * When you can, install `popura`, use it and remove dead code.
 * TODO [+popura]: Refactor to use `popura`.
 *
 * You can also use `popura-cli` since we want help on [feature].
 * TODO [+popura-cli]: Document how to use `popura-cli`.
 */
```

## Disallow Warning Comments (no-warning-comments)

This rule implements [`eslint/no-warning-comments`](https://eslint.org/docs/rules/no-warning-comments).

The sole difference is that first we check for **valid conditions** to apply this rule. If no valid conditions are met, we fall back to `eslint/no-warning-comments` if [`allowWarningComments`](#allowwarningcomments) is set to `false` (default `true`) and you'll see something like `Unexpected 'todo' comment without any conditions.`

The reason behind this is that now that you have a powerful rule to make sure there are no stray TODOs on your code, you should strive for best practices. Don't just add TODO comments and leave them forever. Define conditions to justify the presence of warning comments.

With that in mind, you **could** disable that ESLint rule in favor of this one as you will get its same behavior and more.

Since by default the option `allowWarningComments` is `true`, both rules can coexist even with different reporting levels. For example, one might want to error when conditions are met, but just warn on TODOs without conditions (See [`allowWarningComments`](#allowwarningcomments) below).

## Legacy Branches

Although this rule works just fine when you maintain a `main` branch, it gets trickier when you have legacy branches that happen to have unclosed TODOs.

Imagine you maintain a `main` branch at a version such as 10 and always keep working on it and also keep fixing your TODOs. But your package happens to **publish and support** legacy branches such as 8 and 9 for [long term support](https://en.wikipedia.org/wiki/Long-term_support) with code such as security patches, meaning you might have stray TODOs that won't get fixed and will cause your build to break unless you either fix or drop the TODO.

## Conditions Overview

- `[YYYY-MM-DD]` to define a [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) due date in the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Dates) format.
- `[>1]` or `[>=2]` to expire at some version (from package.json). No whitespace.
- `[+package]` or `[-package]` to expire when you add/remove a package.
- `[package@>1]` or `[package@>=2]` to expire when a package hits some version. No whitespace.
- `[engine:node@>8]` or `[engine:node@>=8]` to expire when the package bumps to the supported engines. No whitespace.

## Overall Information

- Multiple conditions can be separated by comma:
  `[YYYY-MM-DD, +foo-package, engine:node@>=8, bar-package@>=2]`.
- You cannot stack multiple dates or multiple versions of
  your package on the same TODO.
- You can use either `TODO`, `FIXME`, or `XXX`. You can change
  these using options. (See [options.terms](#terms)).
- TODOs may have any string before arguments. Really useful
  when you want to highlight more information such as author name
  like `TODO (lubien) [2019-05-30]` or `TODO @lubien [2019-05-30]`.
- TODOs may or may not have a colon before the message such as
  `TODO [...]: message` or `TODO [...] message`.
- If no proper argument is found, you'll be notified that the TODO is useless (See [`eslint/no-warning-comments`](#disallow-warning-comments-no-warning-comments)).

## Fail

```js
// TODO [2000-01-01]: I'll fix this next week.
// TODO [2000-01-01, 2001-01-01]: Multiple dates won't work.

// TODO [>1]: If your package.json version is > 1.
// TODO [>=1]: If your package.json version is >= 1.
// TODO [>1, >2]: Multiple package versions won't work.

// TODO [+already-have-pkg]: Since we already have it, this reports.
// TODO [-we-dont-have-this-package]: Since we don't have, trigger a report.

// TODO [read-pkg@>1]: When `read-pkg` version is > 1 don't forget to do this.
// TODO [read-pkg@>=5.1.1]: When `read-pkg` version is >= 5.1.1 don't forget to do that.

// TODO [engine:node@>=8]: Whoops, we are already supporting it!

// TODO: Add unicorns.
```

## Pass

```js
// TODO [2200-12-25]: Too long... Can you feel it?
// FIXME [2200-12-25]: Too long... Can you feel it?

// TODO (lubien) [2200-12-12]: You can add something before the arguments.
// TODO @lubien [2200-12-12]: You can add something before the arguments.
// FIXME [2200-12-25] (lubien): You can add something after the arguments, before the colon.
// TODO [2200-12-12] No colon after argument.

// TODO [+react]: Refactor this when we use React.
// TODO [-lodash]: If we remove lodash we need to change this.

// TODO [lodash@>10]: Lodash has a new way to do this; when we bump to its version let's use it.
// TODO [lodash@>=10]: Lodash has a new way to do this; when we bump to its version let's use it.

// TODO [2200-12-25, +popura, lodash@>10]: Combo.

// TODO [engine:node@>12]: When we bump to this Node version we can use import/export.

/*
 * TODO [2200-12-25]: Yet
 * TODO [2200-12-25]: Another
 * TODO [2200-12-25]: Way
 */
```

## Options

### ignoreDatesOnPullRequests

Type: `boolean`\
Default: `true`

Disables `Expiry Date` checks during pull requests.

Sometimes developers may send [Pull Requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) at a time when TODO expiry dates are triggered. This means that their code would fail to pass linting, causing a false-positive.

By default, this rule will not trigger expiry dates while on Pull Requests so that the one responsible for the fix will be the maintainer not the contributor.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"ignoreDatesOnPullRequests": true
	}
]
```

### terms

Type: `string[]`\
Default: `['todo', 'fixme', 'xxx']`

Add or remove TODO verbs.

The defaults come from the [`eslint/no-warning-comments` rule](https://eslint.org/docs/rules/no-warning-comments#options).

If you just want to add a verb, make sure to explicitly include the default ones like `['todo', 'fixme', 'xxx', 'mytodo']` or otherwise any default TODO verb will be ignored. Similarly, when you want to remove a verb, leave the others in like `['todo', 'fixme']`.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"terms": [
			"todo",
			"fixme",
			"xxx"
		]
	}
]
```

### allowWarningComments

Type: `boolean`\
Default: `true`

Ignore TODOs without conditions.

As mentioned before, the [`eslint/no-warning-comments` rule](#disallow-warning-comments-no-warning-comments) will be triggered when there are no valid conditions on a TODO comment.

This is helpful if you want to use **both** this rule and the [`eslint/no-warning-comments` rule](#disallow-warning-comments-no-warning-comments), **but want different warning levels**, as it's not possible to set multiple warning levels on the same rule.

If you want this rule to trigger on stray TODO conditions, you can enable this fallback rule with this option.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"allowWarningComments": false
	}
]
```

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

Ignore TODOs matching any of the given regex patterns. This option is only useful if you have `allowWarningComments` set to `false`.

When a string is given, it will be interpreted as a regular expression inside of a string (as strings are required for ESLint config in JSON).

Don't forget that you must escape special characters in string regexes. If you want to ignore numbers with `\d` for example, to match `#\d`, you must use `/#\d/` or `"#\\d"`.

As an example of this option, if you want this rule to **completely ignore** comments containing references to GitHub issues, you can do so by ignoring `"#\\d+"`:

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"allowWarningComments": false,
		"ignore": [
			"#\\d+",
			/issue-\d+/i
		]
	}
]
```

### date

Type: `string` (`date` format)\
Default: `<today>`

For TODOs with date deadlines, this option makes them trigger only if the deadline is later than the specified date. You could set this to a date in the future to find TODOs that expire soon, or set it far in the past if you want to ignore recently-expired TODOs.

The format must match [json-schema's date](https://json-schema.org/understanding-json-schema/reference/string.html#dates-and-times).

### examples

Find tech debt that has grown up and gone to college by triggering the rule only for incredibly old TODOs:

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"date": "2000-01-01"
	}
]
```

Prepare for the future by triggering the rule on known Y3K bugs:

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"date": "3000-01-01"
	}
]
```
