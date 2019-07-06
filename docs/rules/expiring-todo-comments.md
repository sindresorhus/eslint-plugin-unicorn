# Add expiration conditions to TODO comments

Makes it possible to pass arguments to TODO, FIXME and XXX comments to trigger ESLint.

From [ESLint's documentation](https://eslint.org/docs/rules/no-warning-comments):

> Developers often add comments to code which is not complete or needs review.

TODO comments are useful when a piece of code needs some work. Unfortunately these can be easily forgotten as it's easy to forget to track them, leaving dangling tasks to be found at later random moments.

With this rule, a TODO can have a condition right from the beginning to define its lifespan. When the condition is met, ESLint will take care of reporting that there's work to be done.

This rule also defines by default that **there must be no TODO comment without conditions** so that you should take more care before simply adding tasks with no life expectancy. For more information read the section [`eslint/no-warning-comments`](#disallow-warning-comments-no-warning-comments) below. To disable this behavior see [`allowWarningComments`](#allowWarningComments) below.

Conditions quick overview:

- Expire after a **specific date**.
- Expire when **your package** (package.json) reaches a specific **version**.
- Expire when a package.json **`engines`** property reaches a specific **version**.
- Expire when you **install/uninstall** a specific **package**.
- Expire when a **package** reaches a specific **version**.

## Conditions

### Expiry Date

Using a date as condition, a TODO will only work as long as this date is not met. This is specially useful when you either know when the action should take place or simply want to set boundaries for yourself.

```js
// TODO [2019-11-15]: Refactor this code before the sprint ends.
// TODO (@lubien) [2019-07-18]: When John deliver his code. I can reuse it.
// TODO [2019-08-10] I must refactor this for sure before I deliver.
```

Dates are [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Dates) and use [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) timezone.

Multiple dates on the same TODO are not valid and will be reported. There's no point in having two dates as the closest one will always be the one that is reported.

### Package Version

If you're working on a npm package, you should have a root level package.json with a [`version`](https://docs.npmjs.com/files/package.json#version) field as specified by npm. This condition takes place under this value.

By assigning a condition to compare a package.json `version`, the TODO will report as soon as the condition is met. It's really useful when the work is related to the version of the package itself such as deprecated APIs.

```js
// TODO [>=1.0.0]: I should work around this when we reach v1.
// TODO @lubien [>0]: For now this is fine but for a stable version we must refactor.
// FIXME [>10] This feature is deprecated and should be removed on next major version.
```

Multiple package versions on the same TODO are not valid and will be reported. Just like dates, multiple versions will make no sense as the closest one will be the one to trigger the report.

### Engine Version

On package.json you can specify over [engines](https://docs.npmjs.com/files/package.json#engines) field Node.js (`node`) versions that your package supports.

With that in mind, this condition is triggered as soon as package.json `node` engine reaches the target version. This is particularly useful for maintainers that strive for compatibility but have plans to the future where some feature will be widely available and then could drop support for older versions.

Imagine you want to use async/await but for now you support node versions that don't have it? Maybe you're eager to use import and export but for now you have to support CommonJS?

```js
// TODO [engine:node@>=8]: We can use async/await now.
// FIXME [engine:node@>=20.0.0] Hey, node can use import/export now, we should refactor.
```

Argument versions should be [semver](https://semver.org/) compatible such as: `1.2.45`, `5.3`, `1`.

Only `node` engine is supported by this condition.

Supported comparisons are `>` and `>=`. Comparison must have a `@` before such as `@>` and `@>=`.

### Dependency Presence

As a Node.js developer, you probably already know about package.json [dependencies](https://docs.npmjs.com/files/package.json#dependencies) and [devDependencies](https://docs.npmjs.com/files/package.json#devdependencies). This condition works over the presence or absence of dependencies in both fields.

You may use `+` to trigger when the dependency is added and `-` when the dependency is removed.

```js
// TODO [-vue-function-api]: When we remove `vue-function-api` we should refactor this.
// FIXME [+read-pkg] If we use this package we don't need to use this function below.
// XXX @lubien [+react, -jquery]: We can use react for this widget instead of JQuery.
```

This condition is really useful when the code should be looked upon changes in dependencies that are known to happen such as `vue-function-api` that will eventually be part of `vue` itself.

### Dependency Version

Another way to make conditions over dependencies is to look upon versions. This is useful when developers know that changes in further versions of dependencies will impact their code.

```js
// TODO [vue@>=3]: Refactor to function API when it's stable.
// FIXME [cerebro@>0.10.0] This is a quickfix until cerebro fix this.
// XXX [popura@>=2.0.0] This API is deprecated so we should not use it by then.
```

Argument versions should be [semver](https://semver.org/) compatible such as: `1.2.45`, `5.3`, `1`.

Supported comparisons are `>` and `>=`. Comparison must have a `@` before such as `@>` and `@>=`.

### Combinations

Any combination of rules is possible as long as you separate by commas. Each condition **trigger an individual report.**

```js
// TODO [+react, -jquery]: We can use react for this widget instead of JQuery.
// TODO [2019-07-15, +react]: Refactor this if we install React or if we reach that date.
// TODO [-vue-function-api, vue@>=3]: Now we should use Vue native function API.
```

### Block Comments

You can also use block comments to specify TODOs with conditions. Each line can have it's own set of conditions. This is specially useful when you aim for more details.

```js
/*
 * We should really make this code better.
 * When we support from Node.js 12 we can refactor imports.
 * And we also can do [x], [y], [z].
 * TODO [engine:node@>=12]: Use import/export.
 */

/*
 * This code would be so easy if we used `popura` package helpers.
 * When you can, install `popura`, use it and remove dead code.
 * TODO [+popura]: Refactor to use `popura`.
 *
 * You can also use `popura-cli` so we wont to help on [feature].
 * TODO [+popura-cli]: Document how to use `popura-cli`.
 */
```

## Disallow Warning Comments (no-warning-comments)

This rule implements [`eslint/no-warning-comments`](https://eslint.org/docs/rules/no-warning-comments).

The sole difference is that first we check for **valid conditions** to apply this rule. If no valid condition is met we fallback to `eslint/no-warning-comments` and you'll see something like `Unexpected 'todo' comment.`

The reason behind is that now that you have a powerful rule to make sure there are no stray TODOs on your code, you should strive for best pratices. Don't just put TODOs and leave then live forever. Define conditions to justify the presence of warning comments.

With that in mind, **you should disable** that ESLint rule in favor of this one as you will get the same behavior and more.

You can also opt to `allowWarningComments` on this rule and have both rules coexist (See [`allowWarningComments`](#allowWarningComments) below).

## Legacy Branches

Although this rule works just fine when you maintain a `master` branch, it gets trickier when you have legacy branches that happen to have unclosed TODOs.

Imagine you maintain a `master` branch at a version such as 10 and always keep working on it and also keep fixing your TODOs. But your package happen to **publish and support** legacy branches such as 8 and 9 for [long term support](https://en.wikipedia.org/wiki/Long-term_support) with code such as security patches, meaning you might have stray TODOs that won't get fixed and will cause your build to break unless you either fix or drop the TODO.

## Conditions Overview

- `[YYYY-MM-DD]` to define an [UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time) due date in the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Dates) format.
- `[>1]` or `[>=2]` to expire at some version (from package.json). No whitespace.
- `[+package]` or `[-package]` to expire when you add/remove a package.
- `[package@>1]` or `[package@>=2]` to expire when a package hits some version. No whitespace.
- `[engine:node@>8]` or `[engine:node@>=8]` to expire when package bump supported engines. No whitespace.

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

// TODO [>1]: If your package.json version is > 1
// TODO [>=1]: If your package.json version is >= 1
// TODO [>1, >2]: Multiple package versions won't work

// TODO [+already-have-pkg]: Since we already have it, this reports.
// TODO [-we-dont-have-this-package]: Since we don't have, trigger report.

// TODO [read-pkg@>1]: When `read-pkg` version is > 1 don't forget to do this
// TODO [read-pkg@>=5.1.1]: When `read-pkg` version is >= 5.1.1 don't forget to do that

// TODO [engine:node@>=8]: Whoops we are already supporting it!

// TODO: Add unicorns.
```

## Pass

```js
// TODO [2200-12-25]: Too long... Can you feel it?'
// FIXME [2200-12-25]: Too long... Can you feel it?

// TODO (lubien) [2200-12-12]: You can add something before the arguments.
// TODO @lubien [2200-12-12]: You can add something before the arguments.
// FIXME [2200-12-25] (lubien): You can add something after the arguments, before the colon.
// TODO [2200-12-12] No colon after argument.

// TODO [+react]: Refactor this when we use React.
// TODO [-lodash]: If we remove lodash we need to change this.

// TODO [lodash@>10]: Lodash has a new way to do this, when we bump version let's use it.
// TODO [lodash@>=10]: Lodash has a new way to do this, when we bump version let's use it.

// TODO [2200-12-25, +popura, lodash@>10]: Combo.

// TODO [engine:node@>12]: When we bump version we can use import/export.

/*
 * TODO [2200-12-25]: Yet
 * TODO [2200-12-25]: Another
 * TODO [2200-12-25]: Way
 */
```

## Options

### ignoreDatesOnPullRequests

Disables `Expiry Date` checks during pull requests.

Sometimes developers may send [Pull Requests](https://help.github.com/en/articles/about-pull-requests) at a time when TODO expiry dates are triggered. This means that their code would fail to pass linting, causing a false positive.

By default this rule will not trigger expiry dates while on Pull Requests so that the one responsible for the fix will be the maintainer not the contributor.

Default: `true`.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"ignoreDatesOnPullRequests": true
	}
]
```

### terms

Add or remove TODO verbs.

The defaults come from [eslint/no-warning-comments](https://eslint.org/docs/rules/no-warning-comments#options).

If you just want to add a verb, make sure to leave the older ones there like `['todo', 'fixme', 'xxx', 'mytodo']` otherwise any TODO with older verbs will be ignored. Similarly, when you want to remove a verb, leave the others in like `['todo', 'fixme']`.

Default: `['todo', 'fixme', 'xxx']`.

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

Ignore TODOs without conditions.

As mentioned before, [`eslint/no-warning-comments`](#disallow-warning-comments-no-warning-comments) will be triggered when there are no valid conditions on a TODO comment. If you want only triggering TODO conditions to be reported, you can disable this fallback rule with this setting.

This is also helpful if you want to use **both** this rule and [`eslint/no-warning-comments`](#disallow-warning-comments-no-warning-comments) **but want different warning levels** as it's not possible to set multiple warning levels on the same rule.

Default: `false`.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"allowWarningComments": false
	}
]
```
