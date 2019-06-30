# Add conditions to TODO comments to make them error

Makes it possible to pass arguments to TODO and FIXME comments to trigger errors.

This rule also implements [`eslint/no-warning-comments`](https://eslint.org/docs/rules/no-warning-comments) behavior so you should disable that in favor of using this.

For projects with legacy branches, such as long term supported older versions, there might be situations where you fix TODOs in the master branch but on the other branches you leave it missing. Choose carefully which projects you would want this feature.

Supported conditions:

- `[YYYY-MM-DD]` to define a due date.
- `[>1]` or `[>=2]` to expire at some version (from package.json). No whitespace.
- `[+package]` or `[-package]` to expire when you add/remove a package.
- `[package@>1]` or `[package@>=2]` to expire when a package hits some version. No whitespace.
- `[engines node>8]` or `[engines node>=8]` to expire when package bump supported engines. Don't use spaces between the comparison.

Info:
- Multiple conditions can be separated by comma: `[YYYY-MM-DD, +foo-package, engines node>=8, bar-package@>=2]`.
You obviously cannot stack multiple dates, multiple versions of your package, or multiple `engines`.
- You use either `TODO`, `FIXME`, or `XXX`.
- Optional author name such as `TODO (lubien) [2019-05-30]` or `TODO [2019-05-30] (lubien)`.

If no proper argument is found, you'll be notified that the TODO is useless (`no-warning-comments` behavior).


## Fail

```js
// TODO [2000-01-01]: I'll fix this next week.

// TODO [>1]: If your package.json version is >1.
// TODO [>=1]: If your package.json version is >=1.
// TODO [>1, >2]: Multiple package versions won't work.

// TODO [+react]: When you install `react`, refactor to use it.
// TODO [-popura]: When you uninstall `popura` do some stuff.

// TODO [read-pkg@>1]: When `read-pkg` version is >1 don't forget to do this.
// TODO [read-pkg@>=5.1.1]: When `read-pkg` version is >=5.1.1 don't forget to do that.

// TODO [engines node>=8]: Use async/await!

// TODO: Add unicorns.
```


## Pass

```js
// TODO [2200-12-25]: Too long... Can you feel it?'
// FIXME [2200-12-25]: Too long... Can you feel it?

// TODO (lubien) [2200-12-12]: Too long... Can you feel it?
// FIXME [2200-12-25] (lubien): Too long... Can you feel it?

// TODO [-read-pkg]: We actually use this. If we remove this package I'll error.
// TODO [+popura]: I think we wont need a broken package.

// TODO [semver@>1000]: Welp hopefully we wont get at that.
// TODO [semver@>=1000]: Welp hopefully we wont get at that.

// TODO [2200-12-25, +popura, semver>1000]: Combo.

// TODO [engines node>100]: Just you wait for this version.

/*
 * TODO [2200-12-25]: Yet
 * TODO [2200-12-25]: Another
 * TODO [2200-12-25]: Way
 */
```


## Options

### ignoreDatesOnPullRequests

Disables time checks during pull requests.

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

Add more TODO verbs.

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
