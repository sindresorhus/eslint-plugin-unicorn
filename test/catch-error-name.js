import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'catch-error-name';

const generateError = (originalName, fixedName) => ({
	messageId: MESSAGE_ID,
	data: {
		originalName,
		fixedName,
	},
});

function invalidTestCase(options) {
	if (typeof options === 'string') {
		options = {code: options};
	}

	const {code, name, output, errors} = options;
	return {
		code,
		output: output || code,
		options: name ? [{name}] : [],
		errors,
	};
}

test({
	valid: [
		{
			code: 'try {} catch (err) {}',
			options: [{name: 'err'}],
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
			options: [{name: 'err'}],
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
		'obj.catch?.(error => {})',
		'obj.then(undefined, error => {})',
		'obj.then(result => {}, error => {})',
		'obj.then?.(undefined, error => {})',
		'obj.then?.(result => {}, error => {})',
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
			options: [{name: 'err'}],
		},
		{
			code: outdent`
				const handleError = err => {
					obj.then(undefined, err_ => { });
				}
			`,
			options: [{name: 'err'}],
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
			options: [{name: 'err'}],
		},
		{
			code: 'obj.then(undefined, err => {})',
			options: [{name: 'err'}],
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
			options: [{name: 'err'}],
		},
		{
			code: 'obj.then(undefined, function (err) {})',
			options: [{name: 'err'}],
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
		outdent`
			try {
				throw new Error('message');
			} catch {
				console.log('failed');
			}
		`,
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
					ignore: ['^_$'],
				},
			],
		},

		// Allowed names
		'try {} catch (error) {}',
		'try {} catch (error__) {}',
		'try {} catch (descriptiveError) {}',
		'try {} catch (descriptive_error) {}',
		'try {} catch (descriptiveError__) {}',
		'try {} catch (descriptive_error__) {}',

		// Allowed names, with `options.name`
		...[
			'try {} catch (exception) {}',
			'try {} catch (exception__) {}',
			'try {} catch (descriptiveException) {}',
			'try {} catch (descriptive_exception) {}',
			'try {} catch (descriptiveException__) {}',
			'try {} catch (descriptive_exception__) {}',
		].map(code => ({
			code,
			options: [{name: 'exception'}],
		})),

		// `ignore`
		{
			code: 'try {} catch (skipThisNameCheck) {}',
			options: [{ignore: ['^skip']}],
		},
		{
			code: 'try {} catch (skipThisNameCheck) {}',
			options: [{ignore: [/^skip/]}],
		},
		{
			code: outdent`
				try {} catch (skipThisNameCheck) {}
				try {} catch (ignoreThisNameCheck) {}
				try {} catch (pleaseIgnoreThisNameCheck) {}
			`,
			options: [{ignore: [/^skip/, /ignore/i]}],
		},
		{
			code: outdent`
				try {} catch (error1) {}
				try {} catch (error1__) {}
				try {} catch (error2) {}
			`,
			options: [{ignore: [/error\d*/]}],
		},
		{
			code: 'promise.catch(unicorn => {})',
			options: [{ignore: ['unicorn']}],
		},
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
			`,
			errors: [generateError('err', 'error')],
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
			name: 'err',
			errors: [generateError('error', 'err')],
		}),
		invalidTestCase({
			code: 'obj.catch(err => err)',
			output: 'obj.catch(error => error)',
			errors: [generateError('err', 'error')],
		}),
		invalidTestCase({
			code: 'obj?.catch(err => err)',
			output: 'obj?.catch(error => error)',
			errors: [generateError('err', 'error')],
		}),
		invalidTestCase({
			code: 'obj.then(undefined, err => err)',
			output: 'obj.then(undefined, error => error)',
			errors: [generateError('err', 'error')],
		}),
		invalidTestCase({
			code: 'obj.catch(error => error.stack)',
			output: 'obj.catch(err => err.stack)',
			name: 'err',
			errors: [generateError('error', 'err')],
		}),
		invalidTestCase({
			code: 'obj.then(undefined, error => error.stack)',
			output: 'obj.then(undefined, err => err.stack)',
			name: 'err',
			errors: [generateError('error', 'err')],
		}),
		invalidTestCase({
			code: 'obj?.then(undefined, error => error.stack)',
			output: 'obj?.then(undefined, err => err.stack)',
			name: 'err',
			errors: [generateError('error', 'err')],
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
			`,
			errors: [generateError('err', 'error')],
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
			`,
			errors: [generateError('err', 'error')],
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
			`,
			errors: [generateError('err', 'error_')],
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
			name: 'err',
			errors: [generateError('error', 'err')],
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
			errors: [generateError('foo', 'error_')],
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
			errors: [generateError('foo', 'error_')],
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
			errors: [generateError('foo', 'error__')],
		},
		invalidTestCase({
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
			name: 'error',
			errors: [generateError('foo', 'error__')],
		}),
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
			errors: Array.from({length: 4}).fill(generateError('err', 'error')),
		},

		// Allowed names
		{
			code: 'try {} catch (descriptiveError) {}',
			output: 'try {} catch (exception) {}',
			errors: [generateError('descriptiveError', 'exception')],
			options: [{name: 'exception'}],
		},

		// Should not run into an infinity loop
		{
			code: 'try {} catch (e) {}',
			errors: [generateError('e', 'has_space_after ')],
			options: [{name: 'has_space_after '}],
		},
		{
			code: 'try {} catch (e) {}',
			errors: [generateError('e', '1_start_with_a_number')],
			options: [{name: '1_start_with_a_number'}],
		},
		{
			code: 'try {} catch (e) {}',
			errors: [generateError('e', '_){} evilCode; if(false')],
			options: [{name: '_){} evilCode; if(false'}],
		},

		// `ignore`
		{
			code: 'try {} catch (notMatching) {}',
			output: 'try {} catch (error) {}',
			errors: [generateError('notMatching', 'error')],
			options: [{ignore: []}],
		},
		{
			code: 'try {} catch (notMatching) {}',
			output: 'try {} catch (error) {}',
			errors: [generateError('notMatching', 'error')],
			options: [{ignore: ['unicorn']}],
		},
		{
			code: 'try {} catch (notMatching) {}',
			output: 'try {} catch (error) {}',
			errors: [generateError('notMatching', 'error')],
			options: [{ignore: [/unicorn/]}],
		},
		{
			code: outdent`
				try {} catch (error1) {}
				try {} catch (error1__) {}
				try {} catch (error2) {}
				try {} catch (unicorn) {}
			`,
			output: outdent`
				try {} catch (error1) {}
				try {} catch (error1__) {}
				try {} catch (error2) {}
				try {} catch (error) {}
			`,
			errors: [generateError('unicorn', 'error')],
			options: [{ignore: [/error\d*/]}],
		},
		{
			code: outdent`
				try {} catch (notMatching) {}
				try {} catch (unicorn) {}
				try {} catch (unicorn__) {}
			`,
			output: outdent`
				try {} catch (error) {}
				try {} catch (unicorn) {}
				try {} catch (unicorn__) {}
			`,
			errors: [generateError('notMatching', 'error')],
			options: [{ignore: ['unicorn']}],
		},
		{
			code: 'promise.catch(notMatching => {})',
			output: 'promise.catch(error => {})',
			errors: [generateError('notMatching', 'error')],
			options: [{ignore: ['unicorn']}],
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
			`,
			errors: [generateError('_', 'error')],
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
			`,
			errors: [generateError('_', 'error')],
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
			`,
			errors: [generateError('_', 'error')],
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
			`,
			errors: [generateError('_', 'error')],
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
			`,
			errors: [generateError('_', 'error_')],
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
			`,
			errors: [generateError('_', 'error')],
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
			`,
			errors: [generateError('_', 'error')],
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
			errors: [generateError('_', 'error'), generateError('_', 'error')],
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
			`,
			errors: [generateError('e', 'error')],
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
			`,
			errors: [generateError('e', 'error')],
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
			errors: [generateError('e', 'error'), generateError('err', 'error')],
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
			errors: [generateError('anyName', 'error'), generateError('anyOtherName', 'error')],
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
			name: 'err',
			errors: [generateError('err2', 'err_')],
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
			`,
			errors: [generateError('e', 'error_')],
		}),
	],
});

test.typescript({
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
			`,
			errors: [generateError('err', 'error')],
		}),
		// https://github.com/untitled-labs/metabase-custom/blob/0fbb8b3d6f183bff6ad786d5158ddabf745f1f5c/frontend/src/metabase/containers/dnd/ItemDragSource.jsx#L51
		{
			code: outdent`
				@DragSource({
					async endDrag(props, monitor, component) {
						try {
						} catch (e) {
							alert("There was a problem moving these items: " + e);
						}
					}
				})
				export default class A {}
			`,
			output: outdent`
				@DragSource({
					async endDrag(props, monitor, component) {
						try {
						} catch (error) {
							alert("There was a problem moving these items: " + error);
						}
					}
				})
				export default class A {}
			`,
			errors: 1,
		},
	],
});

test.babel({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				babelOptions: {
					parserOpts: {
						plugins: [
							['decorators', {decoratorsBeforeExport: true}],
						],
					},
				},
			},
		},
	},
	valid: [],
	invalid: [
		// https://github.com/untitled-labs/metabase-custom/blob/0fbb8b3d6f183bff6ad786d5158ddabf745f1f5c/frontend/src/metabase/containers/dnd/ItemDragSource.jsx#L51
		{
			code: outdent`
				@DragSource({
					async endDrag(props, monitor, component) {
						try {
						} catch (e) {
							alert("1There was a problem moving these items: " + e);
						}
					}
				})
				export default class A {}
			`,
			output: outdent`
				@DragSource({
					async endDrag(props, monitor, component) {
						try {
						} catch (error) {
							alert("1There was a problem moving these items: " + error);
						}
					}
				})
				export default class A {}
			`,
			errors: 1,
		},
	],
});
