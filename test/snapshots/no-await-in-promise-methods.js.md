# Snapshot report for `test/no-await-in-promise-methods.js`

The actual snapshot is saved in `no-await-in-promise-methods.js.snap`.

Generated by [AVA](https://avajs.dev).

## invalid(1): Promise.all([await promise])

> Input

    `␊
      1 | Promise.all([await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await promise])␊
        |              ^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([promise])␊
    `

## invalid(2): Promise.allSettled([await promise])

> Input

    `␊
      1 | Promise.allSettled([await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.allSettled([await promise])␊
        |                     ^^^^^^^^^^^^^ Promise in \`Promise.allSettled()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.allSettled([promise])␊
    `

## invalid(3): Promise.any([await promise])

> Input

    `␊
      1 | Promise.any([await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.any([await promise])␊
        |              ^^^^^^^^^^^^^ Promise in \`Promise.any()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.any([promise])␊
    `

## invalid(4): Promise.race([await promise])

> Input

    `␊
      1 | Promise.race([await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.race([await promise])␊
        |               ^^^^^^^^^^^^^ Promise in \`Promise.race()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.race([promise])␊
    `

## invalid(5): Promise.all([, await promise])

> Input

    `␊
      1 | Promise.all([, await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([, await promise])␊
        |                ^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([, promise])␊
    `

## invalid(6): Promise.all([await promise,])

> Input

    `␊
      1 | Promise.all([await promise,])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await promise,])␊
        |              ^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([promise,])␊
    `

## invalid(7): Promise.all([await promise],)

> Input

    `␊
      1 | Promise.all([await promise],)␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await promise],)␊
        |              ^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([promise],)␊
    `

## invalid(8): Promise.all([await (0, promise)],)

> Input

    `␊
      1 | Promise.all([await (0, promise)],)␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await (0, promise)],)␊
        |              ^^^^^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([(0, promise)],)␊
    `

## invalid(9): Promise.all([await (( promise ))])

> Input

    `␊
      1 | Promise.all([await (( promise ))])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await (( promise ))])␊
        |              ^^^^^^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([(( promise ))])␊
    `

## invalid(10): Promise.all([await await promise])

> Input

    `␊
      1 | Promise.all([await await promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await await promise])␊
        |              ^^^^^^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([await promise])␊
    `

## invalid(11): Promise.all([...foo, await promise1, await promise2])

> Input

    `␊
      1 | Promise.all([...foo, await promise1, await promise2])␊
    `

> Error 1/2

    `␊
    > 1 | Promise.all([...foo, await promise1, await promise2])␊
        |                      ^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([...foo, promise1, await promise2])␊
    `

> Error 2/2

    `␊
    > 1 | Promise.all([...foo, await promise1, await promise2])␊
        |                                      ^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([...foo, await promise1, promise2])␊
    `

## invalid(12): Promise.all([await /* comment*/ promise])

> Input

    `␊
      1 | Promise.all([await /* comment*/ promise])␊
    `

> Error 1/1

    `␊
    > 1 | Promise.all([await /* comment*/ promise])␊
        |              ^^^^^^^^^^^^^^^^^^^^^^^^^^ Promise in \`Promise.all()\` should not be awaited.␊
    ␊
    --------------------------------------------------------------------------------␊
    Suggestion 1/1: Remove \`await\`.␊
      1 | Promise.all([/* comment*/ promise])␊
    `
