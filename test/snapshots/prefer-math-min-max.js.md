# Snapshot report for `test/prefer-math-min-max.js`

The actual snapshot is saved in `prefer-math-min-max.js.snap`.

Generated by [AVA](https://avajs.dev).

## invalid(1): height > 50 ? 50 : height

> Input

    `␊
      1 | height > 50 ? 50 : height␊
    `

> Output

    `␊
      1 | Math.min(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height > 50 ? 50 : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(2): height >= 50 ? 50 : height

> Input

    `␊
      1 | height >= 50 ? 50 : height␊
    `

> Output

    `␊
      1 | Math.min(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height >= 50 ? 50 : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(3): height < 50 ? height : 50

> Input

    `␊
      1 | height < 50 ? height : 50␊
    `

> Output

    `␊
      1 | Math.min(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height < 50 ? height : 50␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(4): height <= 50 ? height : 50

> Input

    `␊
      1 | height <= 50 ? height : 50␊
    `

> Output

    `␊
      1 | Math.min(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height <= 50 ? height : 50␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(5): height > maxHeight ? maxHeight : height

> Input

    `␊
      1 | height > maxHeight ? maxHeight : height␊
    `

> Output

    `␊
      1 | Math.min(height, maxHeight)␊
    `

> Error 1/1

    `␊
    > 1 | height > maxHeight ? maxHeight : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(6): height < maxHeight ? height : maxHeight

> Input

    `␊
      1 | height < maxHeight ? height : maxHeight␊
    `

> Output

    `␊
      1 | Math.min(height, maxHeight)␊
    `

> Error 1/1

    `␊
    > 1 | height < maxHeight ? height : maxHeight␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(7): window.height > 50 ? 50 : window.height

> Input

    `␊
      1 | window.height > 50 ? 50 : window.height␊
    `

> Output

    `␊
      1 | Math.min(window.height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | window.height > 50 ? 50 : window.height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(8): window.height < 50 ? window.height : 50

> Input

    `␊
      1 | window.height < 50 ? window.height : 50␊
    `

> Output

    `␊
      1 | Math.min(window.height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | window.height < 50 ? window.height : 50␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(9): height > 50 ? height : 50

> Input

    `␊
      1 | height > 50 ? height : 50␊
    `

> Output

    `␊
      1 | Math.max(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height > 50 ? height : 50␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(10): height >= 50 ? height : 50

> Input

    `␊
      1 | height >= 50 ? height : 50␊
    `

> Output

    `␊
      1 | Math.max(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height >= 50 ? height : 50␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(11): height < 50 ? 50 : height

> Input

    `␊
      1 | height < 50 ? 50 : height␊
    `

> Output

    `␊
      1 | Math.max(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height < 50 ? 50 : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(12): height <= 50 ? 50 : height

> Input

    `␊
      1 | height <= 50 ? 50 : height␊
    `

> Output

    `␊
      1 | Math.max(height, 50)␊
    `

> Error 1/1

    `␊
    > 1 | height <= 50 ? 50 : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(13): height > maxHeight ? height : maxHeight

> Input

    `␊
      1 | height > maxHeight ? height : maxHeight␊
    `

> Output

    `␊
      1 | Math.max(height, maxHeight)␊
    `

> Error 1/1

    `␊
    > 1 | height > maxHeight ? height : maxHeight␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(14): height < maxHeight ? maxHeight : height

> Input

    `␊
      1 | height < maxHeight ? maxHeight : height␊
    `

> Output

    `␊
      1 | Math.max(height, maxHeight)␊
    `

> Error 1/1

    `␊
    > 1 | height < maxHeight ? maxHeight : height␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
    `

## invalid(15): function a() { return +foo > 10 ? 10 : +foo }

> Input

    `␊
      1 | function a() {␊
      2 | 	return +foo > 10 ? 10 : +foo␊
      3 | }␊
    `

> Output

    `␊
      1 | function a() {␊
      2 | 	return Math.min(+foo, 10)␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function a() {␊
    > 2 | 	return +foo > 10 ? 10 : +foo␊
        | 	       ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(16): function a() { return+foo > 10 ? 10 : +foo }

> Input

    `␊
      1 | function a() {␊
      2 | 	return+foo > 10 ? 10 : +foo␊
      3 | }␊
    `

> Output

    `␊
      1 | function a() {␊
      2 | 	return Math.min(+foo, 10)␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function a() {␊
    > 2 | 	return+foo > 10 ? 10 : +foo␊
        | 	      ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(17): (0,foo) > 10 ? 10 : (0,foo)

> Input

    `␊
      1 | (0,foo) > 10 ? 10 : (0,foo)␊
    `

> Output

    `␊
      1 | Math.min((0,foo), 10)␊
    `

> Error 1/1

    `␊
    > 1 | (0,foo) > 10 ? 10 : (0,foo)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(18): foo.bar() > 10 ? 10 : foo.bar()

> Input

    `␊
      1 | foo.bar() > 10 ? 10 : foo.bar()␊
    `

> Output

    `␊
      1 | Math.min(foo.bar(), 10)␊
    `

> Error 1/1

    `␊
    > 1 | foo.bar() > 10 ? 10 : foo.bar()␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(19): async function foo() { return await foo.bar() > 10 ? 10 : await foo.bar() }

> Input

    `␊
      1 | async function foo() {␊
      2 | 	return await foo.bar() > 10 ? 10 : await foo.bar()␊
      3 | }␊
    `

> Output

    `␊
      1 | async function foo() {␊
      2 | 	return Math.min(await foo.bar(), 10)␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | async function foo() {␊
    > 2 | 	return await foo.bar() > 10 ? 10 : await foo.bar()␊
        | 	       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(20): async function foo() { await(+foo > 10 ? 10 : +foo) }

> Input

    `␊
      1 | async function foo() {␊
      2 | 	await(+foo > 10 ? 10 : +foo)␊
      3 | }␊
    `

> Output

    `␊
      1 | async function foo() {␊
      2 | 	await (Math.min(+foo, 10))␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | async function foo() {␊
    > 2 | 	await(+foo > 10 ? 10 : +foo)␊
        | 	      ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(21): function foo() { return(foo.bar() > 10) ? 10 : foo.bar() }

> Input

    `␊
      1 | function foo() {␊
      2 | 	return(foo.bar() > 10) ? 10 : foo.bar()␊
      3 | }␊
    `

> Output

    `␊
      1 | function foo() {␊
      2 | 	return Math.min(foo.bar(), 10)␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function foo() {␊
    > 2 | 	return(foo.bar() > 10) ? 10 : foo.bar()␊
        | 	      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(22): function* foo() { yield+foo > 10 ? 10 : +foo }

> Input

    `␊
      1 | function* foo() {␊
      2 | 	yield+foo > 10 ? 10 : +foo␊
      3 | }␊
    `

> Output

    `␊
      1 | function* foo() {␊
      2 | 	yield Math.min(+foo, 10)␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function* foo() {␊
    > 2 | 	yield+foo > 10 ? 10 : +foo␊
        | 	     ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(23): export default+foo > 10 ? 10 : +foo

> Input

    `␊
      1 | export default+foo > 10 ? 10 : +foo␊
    `

> Output

    `␊
      1 | export default Math.min(+foo, 10)␊
    `

> Error 1/1

    `␊
    > 1 | export default+foo > 10 ? 10 : +foo␊
        |               ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(24): foo.length > bar.length ? bar.length : foo.length

> Input

    `␊
      1 | foo.length > bar.length ? bar.length : foo.length␊
    `

> Output

    `␊
      1 | Math.min(foo.length, bar.length)␊
    `

> Error 1/1

    `␊
    > 1 | foo.length > bar.length ? bar.length : foo.length␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(1): function foo(a, b) { return (a as number) > b ? a : b; }

> Input

    `␊
      1 | function foo(a, b) {␊
      2 | 	return (a as number) > b ? a : b;␊
      3 | }␊
    `

> Output

    `␊
      1 | function foo(a, b) {␊
      2 | 	return Math.max(a as number, b);␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function foo(a, b) {␊
    > 2 | 	return (a as number) > b ? a : b;␊
        | 	       ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(2): function foo(a, b) { return (a as number) > b ? a : b; }

> Input

    `␊
      1 | function foo(a, b) {␊
      2 | 	return (a as number) > b ? a : b;␊
      3 | }␊
    `

> Output

    `␊
      1 | function foo(a, b) {␊
      2 | 	return Math.max(a as number, b);␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function foo(a, b) {␊
    > 2 | 	return (a as number) > b ? a : b;␊
        | 	       ^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(3): function foo(a, b) { return (a as unknown as number) > b ? a : b; }

> Input

    `␊
      1 | function foo(a, b) {␊
      2 | 	return (a as unknown as number) > b ? a : b;␊
      3 | }␊
    `

> Output

    `␊
      1 | function foo(a, b) {␊
      2 | 	return Math.max(a as unknown as number, b);␊
      3 | }␊
    `

> Error 1/1

    `␊
      1 | function foo(a, b) {␊
    > 2 | 	return (a as unknown as number) > b ? a : b;␊
        | 	       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.max()\` to simplify ternary expressions.␊
      3 | }␊
    `

## invalid(4): var foo = 10; var value = foo > bar ? bar : foo;

> Input

    `␊
      1 | var foo = 10;␊
      2 |␊
      3 | var value = foo > bar ? bar : foo;␊
    `

> Output

    `␊
      1 | var foo = 10;␊
      2 |␊
      3 | var value = Math.min(foo, bar);␊
    `

> Error 1/1

    `␊
      1 | var foo = 10;␊
      2 |␊
    > 3 | var value = foo > bar ? bar : foo;␊
        |             ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(5): var foo = 10; var bar = 20; var value = foo > bar ? bar : foo;

> Input

    `␊
      1 | var foo = 10;␊
      2 | var bar = 20;␊
      3 |␊
      4 | var value = foo > bar ? bar : foo;␊
    `

> Output

    `␊
      1 | var foo = 10;␊
      2 | var bar = 20;␊
      3 |␊
      4 | var value = Math.min(foo, bar);␊
    `

> Error 1/1

    `␊
      1 | var foo = 10;␊
      2 | var bar = 20;␊
      3 |␊
    > 4 | var value = foo > bar ? bar : foo;␊
        |             ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `

## invalid(6): var foo: number; var bar: number; var value = foo > bar ? bar : foo;

> Input

    `␊
      1 | var foo: number;␊
      2 | var bar: number;␊
      3 |␊
      4 | var value = foo > bar ? bar : foo;␊
    `

> Output

    `␊
      1 | var foo: number;␊
      2 | var bar: number;␊
      3 |␊
      4 | var value = Math.min(foo, bar);␊
    `

> Error 1/1

    `␊
      1 | var foo: number;␊
      2 | var bar: number;␊
      3 |␊
    > 4 | var value = foo > bar ? bar : foo;␊
        |             ^^^^^^^^^^^^^^^^^^^^^ Prefer \`Math.min()\` to simplify ternary expressions.␊
    `
