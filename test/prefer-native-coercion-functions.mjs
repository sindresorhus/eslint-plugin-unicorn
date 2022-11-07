import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = async v => String(v)',
		'const foo = v => String',
		'const foo = v => v',
		'const foo = v => NotString(v)',
		'const foo = v => String(notFirstParameterName)',
		'const foo = v => new String(v)',
		'const foo = v => String?.(v)',
		'const foo = async function (v) {return String(v);}',
		'const foo = function * (v) {return String(v);}',
		'const foo = async function * (v) {return String(v);}',
		'const foo = function * (v) {yield String(v);}',
		'const foo = async function (v) {await String(v);}',
		'const foo = function (v) {return;}',
		outdent`
			function foo(v) {
				'use strict';
				return String(v);
			}
		`,
		outdent`
			function foo(v) {
				return String(v);
				function x() {}
			}
		`,
		outdent`
			function foo({v}) {
				return String(v);
			}
		`,
		outdent`
			function foo(v) {
				return String({v});
			}
		`,
		outdent`
			function foo(...v) {
				return String(v);
			}
		`,
		outdent`
			function foo(...v) {
				return String(...v);
			}
		`,
		outdent`
			class A {
				constructor(v) {
					return String(v);
				}
			}
		`,
		outdent`
			class A {
				get foo() {
					return String(v);
				}
			}
		`,
		outdent`
			class A {
				set foo(v) {
					return String(v);
				}
			}
		`,
		'({get foo() {return String(v)}})',
		'({set foo(v) {return String(v)}})',
	],
	invalid: [
		'const foo = v => String(v)',
		'const foo = v => Number(v)',
		'const foo = v => BigInt(v)',
		'const foo = v => Boolean(v)',
		'const foo = v => Symbol(v)',
		outdent`
			const foo = v => {
				return String(v);
			}
		`,
		outdent`
			const foo = function (v) {
				return String(v);
			}
		`,
		'function foo(v) { return String(v); }',
		'export default function foo(v) { return String(v); }',
		'export default function (v) { return String(v); }',
		outdent`
			class A {
				foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				static foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				#foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			class A {
				static #foo(v) {
					return String(v);
				}

				bar() {}
			}
		`,
		outdent`
			object = {
				foo(v) {
					return String(v);
				},
				bar
			}
		`,
		outdent`
			object = {
				foo: function(v) {
					return String(v);
				},
				bar
			}
		`,
		outdent`
			object = {
				[function(v) {return String(v);}]: 1,
			}
		`,

		// No fix
		'const foo = (v, extra) => String(v)',
		'const foo = (v, ) => String(v, extra)',
		'const foo = (v, ) => /* comment */ String(v)',
	],
});

// Array callbacks
test.snapshot({
	valid: [
		'array.some?.(v => v)',
		'array?.some(v => v)',
		'array.notSome(v => v)',
		'array.some(callback, v => v)',
		'some(v => v)',
		'array.some(v => notFirstParameterName)',
		'array.some(function(v) {return notFirstParameterName;})',
		'array.some(function(v) {return;})',
		'array.some(function(v) {return v.v;})',
		outdent`
			const identity = v => v;
			array.some(identity)
		`,
		outdent`
			array.some(function(v) {
				"use strict";
				return v;
			})
		`,
	],
	invalid: [
		'array.every(v => v)',
		'array.filter(v => v)',
		'array.find(v => v)',
		'array.findLast(v => v)',
		'array.some(v => v)',
		'array.findIndex(v => v)',
		'array.findLastIndex(v => v)',
		'array.some(v => v)',
		outdent`
			array.some(v => {
				return v;
			})
		`,
		outdent`
			array.some(function (v) {
				return v;
			})
		`,

		// No fix
		'array.some((v, extra) => v)',
		'array.some((v, ) => /* comment */ v)',
	],
});
