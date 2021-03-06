# Snapshot report for `test/prefer-top-level-await.mjs`

The actual snapshot is saved in `prefer-top-level-await.mjs.snap`.

Generated by [AVA](https://avajs.dev).

## Invalid #1
      1 | (async () => {})()

> Error 1/1

    `␊
    > 1 | (async () => {})()␊
        |           ^^ Prefer top-level await over an async IIFE.␊
    `

## Invalid #2
      1 | (async function() {})()

> Error 1/1

    `␊
    > 1 | (async function() {})()␊
        |  ^^^^^^^^^^^^^^ Prefer top-level await over an async IIFE.␊
    `

## Invalid #3
      1 | (async function() {}())

> Error 1/1

    `␊
    > 1 | (async function() {}())␊
        |  ^^^^^^^^^^^^^^ Prefer top-level await over an async IIFE.␊
    `

## Invalid #4
      1 | (async function run() {})()

> Error 1/1

    `␊
    > 1 | (async function run() {})()␊
        |  ^^^^^^^^^^^^^^^^^^ Prefer top-level await over an async IIFE.␊
    `

## Invalid #5
      1 | (async function(c, d) {})(a, b)

> Error 1/1

    `␊
    > 1 | (async function(c, d) {})(a, b)␊
        |  ^^^^^^^^^^^^^^ Prefer top-level await over an async IIFE.␊
    `

## Invalid #1
      1 | foo.then(bar)

> Error 1/1

    `␊
    > 1 | foo.then(bar)␊
        |     ^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #2
      1 | foo.catch(() => process.exit(1))

> Error 1/1

    `␊
    > 1 | foo.catch(() => process.exit(1))␊
        |     ^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #3
      1 | foo.finally(bar)

> Error 1/1

    `␊
    > 1 | foo.finally(bar)␊
        |     ^^^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #4
      1 | foo.then(bar, baz)

> Error 1/1

    `␊
    > 1 | foo.then(bar, baz)␊
        |     ^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #5
      1 | foo.then(bar, baz).finally(qux)

> Error 1/1

    `␊
    > 1 | foo.then(bar, baz).finally(qux)␊
        |                    ^^^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #6
      1 | (foo.then(bar, baz)).finally(qux)

> Error 1/1

    `␊
    > 1 | (foo.then(bar, baz)).finally(qux)␊
        |                      ^^^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #7
      1 | (async () => {})().catch(() => process.exit(1))

> Error 1/1

    `␊
    > 1 | (async () => {})().catch(() => process.exit(1))␊
        |                    ^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #8
      1 | (async function() {}()).finally(() => {})

> Error 1/1

    `␊
    > 1 | (async function() {}()).finally(() => {})␊
        |                         ^^^^^^^ Prefer top-level await over using a promise chain.␊
    `

## Invalid #1
      1 | const foo = async () => {};
      2 | foo();

> Error 1/1

    `␊
      1 | const foo = async () => {};␊
    > 2 | foo();␊
        | ^^^^^ Prefer top-level await over an async function \`foo\` call.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Insert \`await\`.␊
      1 | const foo = async () => {};␊
      2 | await foo();␊
    `

## Invalid #2
      1 | const foo = async function () {}, bar = 1;
      2 | foo(bar);

> Error 1/1

    `␊
      1 | const foo = async function () {}, bar = 1;␊
    > 2 | foo(bar);␊
        | ^^^^^^^^ Prefer top-level await over an async function \`foo\` call.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Insert \`await\`.␊
      1 | const foo = async function () {}, bar = 1;␊
      2 | await foo(bar);␊
    `

## Invalid #3
      1 | foo();
      2 | async function foo() {}

> Error 1/1

    `␊
    > 1 | foo();␊
        | ^^^^^ Prefer top-level await over an async function \`foo\` call.␊
      2 | async function foo() {}␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Insert \`await\`.␊
      1 | await foo();␊
      2 | async function foo() {}␊
    `
