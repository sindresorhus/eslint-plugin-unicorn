# Snapshot report for `test/error-message.js`

The actual snapshot is saved in `error-message.js.snap`.

Generated by [AVA](https://avajs.dev).

## invalid(1): throw new Error()

> Input

    `␊
      1 | throw new Error()␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error()␊
        |       ^^^^^^^^^^^ Pass a message to the \`Error\` constructor.␊
    `

## invalid(2): throw Error()

> Input

    `␊
      1 | throw Error()␊
    `

> Error 1/1

    `␊
    > 1 | throw Error()␊
        |       ^^^^^^^ Pass a message to the \`Error\` constructor.␊
    `

## invalid(3): throw new Error('')

> Input

    `␊
      1 | throw new Error('')␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error('')␊
        |                 ^^ Error message should not be an empty string.␊
    `

## invalid(4): throw new Error(``)

> Input

    `␊
      1 | throw new Error(\`\`)␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error(\`\`)␊
        |                 ^^ Error message should not be an empty string.␊
    `

## invalid(5): const err = new Error(); throw err;

> Input

    `␊
      1 | const err = new Error();␊
      2 | throw err;␊
    `

> Error 1/1

    `␊
    > 1 | const err = new Error();␊
        |             ^^^^^^^^^^^ Pass a message to the \`Error\` constructor.␊
      2 | throw err;␊
    `

## invalid(6): let err = 1; err = new Error(); throw err;

> Input

    `␊
      1 | let err = 1;␊
      2 | err = new Error();␊
      3 | throw err;␊
    `

> Error 1/1

    `␊
      1 | let err = 1;␊
    > 2 | err = new Error();␊
        |       ^^^^^^^^^^^ Pass a message to the \`Error\` constructor.␊
      3 | throw err;␊
    `

## invalid(7): let err = new Error(); err = 1; throw err;

> Input

    `␊
      1 | let err = new Error();␊
      2 | err = 1;␊
      3 | throw err;␊
    `

> Error 1/1

    `␊
    > 1 | let err = new Error();␊
        |           ^^^^^^^^^^^ Pass a message to the \`Error\` constructor.␊
      2 | err = 1;␊
      3 | throw err;␊
    `

## invalid(8): const foo = new TypeError()

> Input

    `␊
      1 | const foo = new TypeError()␊
    `

> Error 1/1

    `␊
    > 1 | const foo = new TypeError()␊
        |             ^^^^^^^^^^^^^^^ Pass a message to the \`TypeError\` constructor.␊
    `

## invalid(9): const foo = new SyntaxError()

> Input

    `␊
      1 | const foo = new SyntaxError()␊
    `

> Error 1/1

    `␊
    > 1 | const foo = new SyntaxError()␊
        |             ^^^^^^^^^^^^^^^^^ Pass a message to the \`SyntaxError\` constructor.␊
    `

## invalid(10): const errorMessage = Object.freeze({errorMessage: 1}).errorMessage; throw new Error(errorMessage)

> Input

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
      2 | throw new Error(errorMessage)␊
    `

> Error 1/1

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
    > 2 | throw new Error(errorMessage)␊
        |                 ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(11): throw new Error([])

> Input

    `␊
      1 | throw new Error([])␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error([])␊
        |                 ^^ Error message should be a string.␊
    `

## invalid(12): throw new Error([foo])

> Input

    `␊
      1 | throw new Error([foo])␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error([foo])␊
        |                 ^^^^^ Error message should be a string.␊
    `

## invalid(13): throw new Error([0][0])

> Input

    `␊
      1 | throw new Error([0][0])␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error([0][0])␊
        |                 ^^^^^^ Error message should be a string.␊
    `

## invalid(14): throw new Error({})

> Input

    `␊
      1 | throw new Error({})␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error({})␊
        |                 ^^ Error message should be a string.␊
    `

## invalid(15): throw new Error({foo})

> Input

    `␊
      1 | throw new Error({foo})␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error({foo})␊
        |                 ^^^^^ Error message should be a string.␊
    `

## invalid(16): throw new Error({foo: 0}.foo)

> Input

    `␊
      1 | throw new Error({foo: 0}.foo)␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error({foo: 0}.foo)␊
        |                 ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(17): throw new Error(lineNumber=2)

> Input

    `␊
      1 | throw new Error(lineNumber=2)␊
    `

> Error 1/1

    `␊
    > 1 | throw new Error(lineNumber=2)␊
        |                 ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(18): const error = new RangeError;

> Input

    `␊
      1 | const error = new RangeError;␊
    `

> Error 1/1

    `␊
    > 1 | const error = new RangeError;␊
        |               ^^^^^^^^^^^^^^ Pass a message to the \`RangeError\` constructor.␊
    `

## invalid(19): throw Object.assign(new Error(), {foo})

> Input

    `␊
      1 | throw Object.assign(new Error(), {foo})␊
    `

> Error 1/1

    `␊
    > 1 | throw Object.assign(new Error(), {foo})␊
        |                     ^^^^^^^^^^^ Pass a message to the \`Error\` constructor.␊
    `

## invalid(1): new AggregateError(errors)

> Input

    `␊
      1 | new AggregateError(errors)␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`AggregateError\` constructor.␊
    `

## invalid(2): AggregateError(errors)

> Input

    `␊
      1 | AggregateError(errors)␊
    `

> Error 1/1

    `␊
    > 1 | AggregateError(errors)␊
        | ^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`AggregateError\` constructor.␊
    `

## invalid(3): new AggregateError(errors, "")

> Input

    `␊
      1 | new AggregateError(errors, "")␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, "")␊
        |                            ^^ Error message should not be an empty string.␊
    `

## invalid(4): new AggregateError(errors, ``)

> Input

    `␊
      1 | new AggregateError(errors, \`\`)␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, \`\`)␊
        |                            ^^ Error message should not be an empty string.␊
    `

## invalid(5): new AggregateError(errors, "", extraArgument)

> Input

    `␊
      1 | new AggregateError(errors, "", extraArgument)␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, "", extraArgument)␊
        |                            ^^ Error message should not be an empty string.␊
    `

## invalid(6): const errorMessage = Object.freeze({errorMessage: 1}).errorMessage; throw new AggregateError(errors, errorMessage)

> Input

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
      2 | throw new AggregateError(errors, errorMessage)␊
    `

> Error 1/1

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
    > 2 | throw new AggregateError(errors, errorMessage)␊
        |                                  ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(7): new AggregateError(errors, [])

> Input

    `␊
      1 | new AggregateError(errors, [])␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, [])␊
        |                            ^^ Error message should be a string.␊
    `

## invalid(8): new AggregateError(errors, [foo])

> Input

    `␊
      1 | new AggregateError(errors, [foo])␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, [foo])␊
        |                            ^^^^^ Error message should be a string.␊
    `

## invalid(9): new AggregateError(errors, [0][0])

> Input

    `␊
      1 | new AggregateError(errors, [0][0])␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, [0][0])␊
        |                            ^^^^^^ Error message should be a string.␊
    `

## invalid(10): new AggregateError(errors, {})

> Input

    `␊
      1 | new AggregateError(errors, {})␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, {})␊
        |                            ^^ Error message should be a string.␊
    `

## invalid(11): new AggregateError(errors, {foo})

> Input

    `␊
      1 | new AggregateError(errors, {foo})␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, {foo})␊
        |                            ^^^^^ Error message should be a string.␊
    `

## invalid(12): new AggregateError(errors, {foo: 0}.foo)

> Input

    `␊
      1 | new AggregateError(errors, {foo: 0}.foo)␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, {foo: 0}.foo)␊
        |                            ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(13): new AggregateError(errors, lineNumber=2)

> Input

    `␊
      1 | new AggregateError(errors, lineNumber=2)␊
    `

> Error 1/1

    `␊
    > 1 | new AggregateError(errors, lineNumber=2)␊
        |                            ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(14): const error = new AggregateError;

> Input

    `␊
      1 | const error = new AggregateError;␊
    `

> Error 1/1

    `␊
    > 1 | const error = new AggregateError;␊
        |               ^^^^^^^^^^^^^^^^^^ Pass a message to the \`AggregateError\` constructor.␊
    `

## invalid(1): new SuppressedError(error, suppressed,)

> Input

    `␊
      1 | new SuppressedError(error, suppressed,)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed,)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(2): new SuppressedError(error,)

> Input

    `␊
      1 | new SuppressedError(error,)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error,)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(3): new SuppressedError()

> Input

    `␊
      1 | new SuppressedError()␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError()␊
        | ^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(4): SuppressedError(error, suppressed,)

> Input

    `␊
      1 | SuppressedError(error, suppressed,)␊
    `

> Error 1/1

    `␊
    > 1 | SuppressedError(error, suppressed,)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(5): SuppressedError(error,)

> Input

    `␊
      1 | SuppressedError(error,)␊
    `

> Error 1/1

    `␊
    > 1 | SuppressedError(error,)␊
        | ^^^^^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(6): SuppressedError()

> Input

    `␊
      1 | SuppressedError()␊
    `

> Error 1/1

    `␊
    > 1 | SuppressedError()␊
        | ^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `

## invalid(7): new SuppressedError(error, suppressed, "")

> Input

    `␊
      1 | new SuppressedError(error, suppressed, "")␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, "")␊
        |                                        ^^ Error message should not be an empty string.␊
    `

## invalid(8): new SuppressedError(error, suppressed, ``)

> Input

    `␊
      1 | new SuppressedError(error, suppressed, \`\`)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, \`\`)␊
        |                                        ^^ Error message should not be an empty string.␊
    `

## invalid(9): new SuppressedError(error, suppressed, "", options)

> Input

    `␊
      1 | new SuppressedError(error, suppressed, "", options)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, "", options)␊
        |                                        ^^ Error message should not be an empty string.␊
    `

## invalid(10): const errorMessage = Object.freeze({errorMessage: 1}).errorMessage; throw new SuppressedError(error, suppressed, errorMessage)

> Input

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
      2 | throw new SuppressedError(error, suppressed, errorMessage)␊
    `

> Error 1/1

    `␊
      1 | const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;␊
    > 2 | throw new SuppressedError(error, suppressed, errorMessage)␊
        |                                              ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(11): new SuppressedError(error, suppressed, [])

> Input

    `␊
      1 | new SuppressedError(error, suppressed, [])␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, [])␊
        |                                        ^^ Error message should be a string.␊
    `

## invalid(12): new SuppressedError(error, suppressed, [foo])

> Input

    `␊
      1 | new SuppressedError(error, suppressed, [foo])␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, [foo])␊
        |                                        ^^^^^ Error message should be a string.␊
    `

## invalid(13): new SuppressedError(error, suppressed, [0][0])

> Input

    `␊
      1 | new SuppressedError(error, suppressed, [0][0])␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, [0][0])␊
        |                                        ^^^^^^ Error message should be a string.␊
    `

## invalid(14): new SuppressedError(error, suppressed, {})

> Input

    `␊
      1 | new SuppressedError(error, suppressed, {})␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, {})␊
        |                                        ^^ Error message should be a string.␊
    `

## invalid(15): new SuppressedError(error, suppressed, {foo})

> Input

    `␊
      1 | new SuppressedError(error, suppressed, {foo})␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, {foo})␊
        |                                        ^^^^^ Error message should be a string.␊
    `

## invalid(16): new SuppressedError(error, suppressed, {foo: 0}.foo)

> Input

    `␊
      1 | new SuppressedError(error, suppressed, {foo: 0}.foo)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, {foo: 0}.foo)␊
        |                                        ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(17): new SuppressedError(error, suppressed, lineNumber=2)

> Input

    `␊
      1 | new SuppressedError(error, suppressed, lineNumber=2)␊
    `

> Error 1/1

    `␊
    > 1 | new SuppressedError(error, suppressed, lineNumber=2)␊
        |                                        ^^^^^^^^^^^^ Error message should be a string.␊
    `

## invalid(18): const error = new SuppressedError;

> Input

    `␊
      1 | const error = new SuppressedError;␊
    `

> Error 1/1

    `␊
    > 1 | const error = new SuppressedError;␊
        |               ^^^^^^^^^^^^^^^^^^^ Pass a message to the \`SuppressedError\` constructor.␊
    `
