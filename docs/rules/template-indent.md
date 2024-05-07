# Fix whitespace-insensitive template indentation

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Tagged templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) often look ugly/jarring because their indentation doesn't match the code they're found in. In many cases, whitespace is insignificant, or a library like [strip-indent](https://www.npmjs.com/package/strip-indent) is used to remove the margin. See [proposal-string-dedent](https://github.com/tc39/proposal-string-dedent) (stage 1 at the time of writing) for a proposal on fixing this in JavaScript.

This rule will automatically fix the indentation of multiline string templates, to keep them in alignment with the code they are found in. A configurable whitelist is used to ensure no whitespace-sensitive strings are edited.

## Fail

```js
function foo() {
	const sqlQuery = sql`
select *
from students
where first_name = ${x}
and last_name = ${y}
	`;

	const gqlQuery = gql`
									query user(id: 5) {
										firstName
										lastName
									}
								`;

	const html = /* HTML */ `
				<div>
						<span>hello</span>
				</div>
	`;
}
```

## Pass

The above will auto-fix to:

```js
function foo() {
	const sqlQuery = sql`
		select *
		from students
		where first_name = ${x}
		and last_name = ${y}
	`;

	const gqlQuery = gql`
		query user(id: 5) {
			firstName
			lastName
		}
	`;

	const html = /* HTML */ `
		<div>
				<span>hello</span>
		</div>
	`;
}
```

Under the hood, [strip-indent](https://npmjs.com/package/strip-indent) is used to determine how the template "should" look. Then a common indent is added to each line based on the margin of the line the template started at. This rule will *not* alter the relative whitespace between significant lines, it will only shift the content right or left so that it aligns sensibly with the surrounding code.

## Options

The rule accepts lists of `tags`, `functions`, `selectors` and `comments` to match template literals. `tags` are tagged template literal identifiers, functions are names of utility functions like `stripIndent`, selectors can be any [ESLint selector](https://eslint.org/docs/developer-guide/selectors), and comments are `/* block-commented */` strings.

Default configuration:

```js
{
	'unicorn/template-indent': [
		'warn',
		{
			tags: [
				'outdent',
				'dedent',
				'gql',
				'sql',
				'html',
				'styled'
			],
			functions: [
				'dedent',
				'stripIndent'
			],
			selectors: [],
			comments: [
				'HTML',
				'indent'
			]
		}
	]
}
```

You can use a selector for custom use-cases, like indenting *all* template literals, even those without template tags or function callers:

```js
{
	'unicorn/template-indent': [
		'warn',
		{
			tags: [],
			functions: [],
			selectors: [
				'TemplateLiteral'
			]
		}
	]
}
```

Indentation will be done with tabs or spaces depending on the line of code that the template literal starts at. You can override this by supplying an `indent`, which should be either a number (of spaces) or a string consisting only of whitespace characters:

```js
{
	'unicorn/template-indent': [
		'warn', {
			indent: 8,
		}
	]
}
```

```js
{
	'unicorn/template-indent': [
		'warn',
		{
			indent: '\t\t'
		}
	]
}
```
