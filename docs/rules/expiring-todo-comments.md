# Add conditions to TODO comments to make them error

Makes possible to pass arguments to TODO and FIXME comments to trigger errors.

This rule also implements [eslint/no-warning-comments](https://eslint.org/docs/rules/no-warning-comments) behavior so you should disable that in favor of using this.

For projects with legacy branches such as long term supported older versions there might be a situations where you fix TODOs in the master but on the other branches you leave missing.
Choose carefully which projects you would want this feature.

Currently supporting:

* `[YYYY-MM-DD]` to define a due date.
* `[>1]` or `[>=2]` to expire at some version (from package.json). Don't use spaces between.
* `[+package]` or `[-package]` to expire when you add/remove a package.
* `[package@>1]` or `[package@>=2]` to expire when a package hits some version. Don't use spaces between.
* `[engines node>8]` or `[engines node>=8]` to expire when package bump supported engines. Don't use spaces between the comparison.
* Stack by separating by comma such as `[YYYY-MM-DD, +package]`.
* You can either use `TODO` or `FIXME`.
* Optional author name such as `TODO (lubien) [2019-05-30]` or `TODO [2019-05-30] (lubien)`.

If no proper argument is found you'll be notified that the TODO is useless (no-warning-comments behavior).

## Fail

```js
// TODO [2000-01-01]: forgot to refactor
// TODO [2200-12-12, 2200-12-12]: multiple dates won't work


// TODO [>1]: if your package.json version is > 1
// TODO [>=1]: if your package.json version is >= 1
// TODO [>1, >2]: multiple package versions won't work

// TODO [+react]: when you install `react`, refactor to use it
// TODO [-popura]: when you uninstall `popura` do some stuff

// TODO [read-pkg@>1]: when `read-pkg` version is > 1 don't forget to do this
// TODO [read-pkg@>=5.1.1]: when `read-pkg` version is >= 5.1.1 don't forget to do that

// TODO [engines node>1]: Hopefully you support that and it'll trigger.

// TODO: do it
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

### ignoreDatesOnPR

Disables time checks during pull requests. Default: `true`.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"ignoreDatesOnPR": true
	}
]
```

### terms

Add more TODO verbs. Default: `['todo', 'fixme', 'xxx']`.

```js
"unicorn/expiring-todo-comments": [
	"error",
	{
		"terms": ["todo", "fixme", "xxx"]
	}
]
```
