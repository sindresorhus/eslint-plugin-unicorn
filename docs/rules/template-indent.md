# Fix whitespace-insensitive template indentation.

Tagged templates often look ugly/jarring because their indentation often doesn't match the code they're found in. In many cases, whitespace is insignificant, or a library like [strip-indent](https://www.npmjs.com/package/strip-indent) is used to remove the margin. See [proposal-string-dedent](https://github.com/tc39/proposal-string-dedent) (stage 1 at time of writing) for a proposal for fixing this in javascript.

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

Under the hood, [strip-indent](https://npmjs.com/package/strip-indent) is used to determine how the template "should" look. Then a common indent is added to each line based on the margin of the line the template started in. This rule will _not_ alter the relative whitespace between significant lines, it will only shift then content right or left so that it aligns sensibly with the surrounding code.

## Options

The rule accepts lists of `tags`, `functions` and `selectors` to match template literals. `tags` are tagged template literal identifiers, functions are names of utility functions like `stripIndent`, and selectors can be any [eslint selector](https://eslint.org/docs/developer-guide/selectors).

Default configuration:

```js
{
  'unicorn/template-indent': ['warn', {
    tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
    functions: ['dedent', 'stripIndent'],
    selectors: [],
    comments: ['HTML', 'indent'],
  }]
}
```

You can use a selector for custom use cases, like indenting _all_ template literals, even those without template tags or function callers:

```js
{
  'unicorn/template-indent': ['warn', {
    tags: [],
    functions: [],
    selectors: ['TemplateLiteral'],
  }]
}
```
