import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/catch-error-name';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

function invalidTestCase(options) {
	if (typeof options === 'string') {
		options = {code: options};
	}

	const {code, name, output} = options;
	return {
		code,
		output: output || code,
		options: name ? [{name}] : [],
		errors: [{ruleId: 'catch-error-name'}]
	};
}

ruleTester.run('catch-error-name', rule, {
	valid: [
		'try {} catch (error) {}',
		{
			code: 'try {} catch (err) {}',
			options: [{name: 'err'}]
		},
		outdent`
			try {
			} catch (outerError) {
				try {
				} catch (innerError) {}
			}
		`,
		outdent`
			const handleError = error => {
				try {
					doSomething();
				} catch (error_) {
					console.log(error_);
				}
			}
		`,
		{
			code: outdent`
				const handleError = err => {
					try {
						doSomething();
					} catch (err_) {
						console.log(err_);
					}
				}
			`,
			options: [{name: 'err'}]
		},
		outdent`
			const handleError = error => {
				const error_ = new Error('🦄');

				try {
					doSomething();
				} catch (error__) {
					console.log(error__);
				}
			}
		`,
		'obj.catch(error => {})',
		'obj.then(undefined, error => {})',
		'obj.then(result => {}, error => {})',
		outdent`
			const handleError = error => {
				obj.catch(error_ => { });
			}
		`,
		outdent`
			const handleError = error => {
				obj.then(undefined, error_ => { });
			}
		`,
		{
			code: outdent`
				const handleError = err => {
					obj.catch(err_ => { });
				}
			`,
			options: [{name: 'err'}]
		},
		{
			code: outdent`
				const handleError = err => {
					obj.then(undefined, err_ => { });
				}
			`,
			options: [{name: 'err'}]
		},
		outdent`
			const handleError = error => {
				const error_ = new Error('foo bar');

				obj.catch(error__ => { });
			}
		`,
		outdent`
			const handleError = error => {
				const error_ = new Error('foo bar');

				obj.then(undefined, error__ => { });
			}
		`,
		outdent`
			const handleError = error => {
				const error_ = new Error('foo bar');
				const error__ = new Error('foo bar');
				const error___ = new Error('foo bar');
				const error____ = new Error('foo bar');
				const error_____ = new Error('foo bar');
				const error______ = new Error('foo bar');
				const error_______ = new Error('foo bar');
				const error________ = new Error('foo bar');
				const error_________ = new Error('foo bar');

				obj.catch(error__________ => { });
			}
		`,
		'obj.catch(() => {})',
		{
			code: 'obj.catch(err => {})',
			options: [{name: 'err'}]
		},
		{
			code: 'obj.then(undefined, err => {})',
			options: [{name: 'err'}]
		},
		outdent`
			obj.catch(
				outerError => {
					return obj2.catch(innerError => {})
				}
			)
		`,
		'obj.catch(function (error) {})',
		'obj.then(undefined, function (error) {})',
		'obj.catch(function onReject(error) {})',
		'obj.then(undefined, function onReject(error) {})',
		'obj.then(function onFulfilled(result) {}, function onReject(error) {})',
		'obj.catch(function () {})',
		{
			code: 'obj.catch(function (err) {})',
			options: [{name: 'err'}]
		},
		{
			code: 'obj.then(undefined, function (err) {})',
			options: [{name: 'err'}]
		},
		outdent`
			obj.catch(function (outerError) {
				return obj2.catch(function (innerError) {
				})
			})
		`,
		outdent`
			obj.then(undefined, function (outerError) {
				return obj2.then(undefined, function (innerError) {
				})
			})
		`,
		outdent`
			obj.then(undefined, function (outerError) {
				return obj2.catch(function (innerError) {
				})
			})
		`,
		outdent`
			obj.catch(function (outerError) {
				return obj2.then(undefined, function (innerError) {
				})
			})
		`,
		'obj.catch()',
		'foo(function (error) {})',
		'foo().then(function (error) {})',
		'foo().catch(function (error) {})',
		{
			code: 'try {} catch (skipErr) {}',
			options: [
				{
					caughtErrorsIgnorePattern: '^skip'
				}
			]
		},
		outdent`
			try {
				throw new Error('message');
			} catch {
				console.log('failed');
			}
		`,
		'try {} catch (descriptiveError) {}',
		'try {} catch (descriptiveerror) {}',
		'try {} catch ({message}) {}',
		'obj.catch(function ({message}) {})',
		'obj.catch(({message}) => {})',
		'obj.then(undefined, ({message}) => {})',

		// Extra arguments
		'obj.catch(error => {}, anotherArgument)',
		'obj.then(undefined, error => {}, anotherArgument)',

		// `_`
		'obj.catch(_ => {})',
		'obj.catch((_) => {})',
		'obj.catch((_) => { console.log(foo); })',
		'try {} catch (_) {}',
		'try {} catch (_) { console.log(foo); }',
		outdent`
			try {
			} catch (_) {
				try {
				} catch (_) {}
			}
		`,
		// Ignore `_` even it's used
		{
			code: `
				try {
				} catch (_) {
					console.log(_);
				}
			`,
			options: [
				{
					caughtErrorsIgnorePattern: '^_$'
				}
			]
		}
	],

	invalid: [
		invalidTestCase({
			code: outdent`
				try {
				} catch (err) {
					console.log(err)
				}
			`,
			output: outdent`
				try {
				} catch (error) {
					console.log(error)
				}
			`
		}),
		invalidTestCase({
			code: outdent`
				try {
				} catch (error) {
					console.log(error)
				}
			`,
			output: outdent`
				try {
				} catch (err) {
					console.log(err)
				}
			`,
			name: 'err'
		}),
		{
			code: 'try {} catch (outerError) {}',
			output: 'try {} catch (error) {}',
			errors: [
				{
					ruleId: 'catch-error-message',
					message: 'The catch parameter should be named `error`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^_$'
				}
			]
		},
		{
			code: 'try {} catch (innerError) {}',
			output: 'try {} catch (error) {}',
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^_$'
				}
			]
		},
		invalidTestCase({
			code: 'obj.catch(err => err)',
			output: 'obj.catch(error => error)'
		}),
		invalidTestCase({
			code: 'obj.then(undefined, err => err)',
			output: 'obj.then(undefined, error => error)'
		}),
		invalidTestCase({
			code: 'obj.catch(error => error.stack)',
			output: 'obj.catch(err => err.stack)',
			name: 'err'
		}),
		invalidTestCase({
			code: 'obj.then(undefined, error => error.stack)',
			output: 'obj.then(undefined, err => err.stack)',
			name: 'err'
		}),
		invalidTestCase({
			code: outdent`
				obj.catch(function (err) {
					console.log(err)
				})
			`,
			output: outdent`
				obj.catch(function (error) {
					console.log(error)
				})
			`
		}),
		invalidTestCase({
			code: outdent`
				obj.then(undefined, function (err) {
					console.log(err)
				})
			`,
			output: outdent`
				obj.then(undefined, function (error) {
					console.log(error)
				})
			`
		}),
		// TODO: this could fix to `error`
		invalidTestCase({
			code: outdent`
				obj.then(
					function error(err) {
						console.log(err)
					},
					function error(err) {
						console.log(err)
					}
				)
			`,
			output: outdent`
				obj.then(
					function error(err) {
						console.log(err)
					},
					function error(error_) {
						console.log(error_)
					}
				)
			`
		}),
		invalidTestCase({
			code: outdent`
				obj.catch(function (error) {
					console.log(error)
				})
			`,
			output: outdent`
				obj.catch(function (err) {
					console.log(err)
				})
			`,
			name: 'err'
		}),
		{
			code: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error2) {
						console.log(error2);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^_$'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			output: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(error__ => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error__`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			output: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(error__ => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error__`.'
				}
			],
			options: [
				{
					name: 'error'
				}
			]
		},
		{
			code: outdent`
				obj.catch(err => {});
				obj.catch(err => {});
				obj.then(err => {}, err => {});
				obj.then(err => {}, err => {});
			`,
			output: outdent`
				obj.catch(error => {});
				obj.catch(error => {});
				obj.then(err => {}, error => {});
				obj.then(err => {}, error => {});
			`,
			errors: [{}, {}, {}, {}]
		},
		{
			code: 'try {} catch (_error) {}',
			output: 'try {} catch (error) {}',
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^skip'
				}
			]
		},
		{
			code: outdent`
				Promise.reject(new Error())
					.catch(function onError(errorResult) {
						console.log('errorResult should be fixed to', errorResult)
					})
			`,
			output: outdent`
				Promise.reject(new Error())
					.catch(function onError(error) {
						console.log('errorResult should be fixed to', error)
					})
			`,
			errors: [
				{
					ruleId: 'catch-error-message',
					message: 'The catch parameter should be named `error`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^_$'
				}
			]
		},

		// `_`
		invalidTestCase({
			code: outdent`
				obj.catch(_ => {
					console.log(_);
				})
			`,
			output: outdent`
				obj.catch(error => {
					console.log(error);
				})
			`
		}),
		invalidTestCase({
			code: outdent`
				obj.then(undefined, _ => {
					console.log(_);
				})
			`,
			output: outdent`
				obj.then(undefined, error => {
					console.log(error);
				})
			`
		}),
		invalidTestCase({
			code: outdent`
				obj.catch(function (_) {
					console.log(_);
				})
			`,
			output: outdent`
				obj.catch(function (error) {
					console.log(error);
				})
			`
		}),
		invalidTestCase({
			code: outdent`
				try {
				} catch (_) {
					console.log(_);
				}
			`,
			output: outdent`
				try {
				} catch (error) {
					console.log(error);
				}
			`
		}),
		// TODO: this should fix to `error`, not `error_`
		invalidTestCase({
			code: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (_) {
						console.log(_);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`
		}),
		invalidTestCase({
			code: outdent`
				try {
				} catch (_) {
					console.log(_)
					try {
					} catch (_) {}
				}
			`,
			output: outdent`
				try {
				} catch (error) {
					console.log(error)
					try {
					} catch (_) {}
				}
			`
		}),
		invalidTestCase({
			code: outdent`
				try {
				} catch (_) {
					try {
					} catch (_) {
						console.log(_)
					}
				}
			`,
			output: outdent`
				try {
				} catch (_) {
					try {
					} catch (error) {
						console.log(error)
					}
				}
			`
		}),
		{
			code: outdent`
				try {
				} catch (_) {
					console.log(_)
					try {
					} catch (_) {
						console.log(_)
					}
				}
			`,
			output: outdent`
				try {
				} catch (error) {
					console.log(error)
					try {
					} catch (error) {
						console.log(error)
					}
				}
			`,
			errors: [{ruleId: 'catch-error-name'}, {ruleId: 'catch-error-name'}]
		},

		// #107
		invalidTestCase({
			code: outdent`
				foo.then(() => {
					try {} catch (e) {}
				}).catch(error => error);
			`,
			output: outdent`
				foo.then(() => {
					try {} catch (error) {}
				}).catch(error => error);
			`
		}),
		invalidTestCase({
			code: outdent`
				foo.then(() => {
					try {} catch (e) {}
				});
			`,
			output: outdent`
				foo.then(() => {
					try {} catch (error) {}
				});
			`
		}),
		{
			code: outdent`
				foo.then(() => {
					try {} catch (e) {}
				}).catch(err => err);
			`,
			output: outdent`
				foo.then(() => {
					try {} catch (error) {}
				}).catch(error => error);
			`,
			errors: [{}, {}]
		},
		{
			code: outdent`
				try {
					doSomething();
				} catch (anyName) { // Nesting of catch clauses disables the rule
					try {
						doSomethingElse();
					} catch (anyOtherName) {
						// ...
					}
				}
			`,
			output: outdent`
				try {
					doSomething();
				} catch (error) { // Nesting of catch clauses disables the rule
					try {
						doSomethingElse();
					} catch (error) {
						// ...
					}
				}
			`,
			errors: [{}, {}]
		},
		invalidTestCase({
			code: outdent`
				exports.get = function (req, res) {
						myfunc(function (err, values) {
								if (err) {
									console.log(err);
									return;
								} else {
												var temp;
												try {
														temp = JSON.parse(values.value);
												}
												catch(err2) {
														exports.services.logger.error('catching', err2);
														temp = values;
												}
												return temp;
								}
						});
				};
			`,
			output: outdent`
				exports.get = function (req, res) {
						myfunc(function (err, values) {
								if (err) {
									console.log(err);
									return;
								} else {
												var temp;
												try {
														temp = JSON.parse(values.value);
												}
												catch(err_) {
														exports.services.logger.error('catching', err_);
														temp = values;
												}
												return temp;
								}
						});
				};
			`,
			name: 'err'
		}),

		// #561
		invalidTestCase({
			code: outdent`
				try {
				} catch (e) {
					const error = new Error(e);
					throw error
				}
			`,
			output: outdent`
				try {
				} catch (error_) {
					const error = new Error(error_);
					throw error
				}
			`
		})
	]
});

typescriptRuleTester.run('catch-error-name', rule, {
	valid: [],
	invalid: [
		invalidTestCase({
			code: outdent`
				promise.catch(function (err: Error) {
					console.log(err)
				})
			`,
			output: outdent`
				promise.catch(function (error: Error) {
					console.log(error)
				})
			`
		})
	]
});
