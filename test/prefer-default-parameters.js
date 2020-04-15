import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-default-parameters';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-default-parameters',
	messageId: 'preferDefaultParameters'
};

ruleTester.run('prefer-default-parameters', rule, {
	valid: [
		'function abc(foo = { bar: 123 }) { }',
		'function abc({ bar } = { bar: 123 }) { }',
		'function abc({ bar = 123 } = { bar }) { }',
		'function abc(foo = fooDefault) { }',
		'function abc(foo = {}) { }',
		'function abc(foo = \'bar\') { }',
		'function abc({ bar = 123 } = {}) { }',
		'function abc(foo) { foo = foo || bar(); }',
		'function abc(foo) { foo = foo || {bar} }',
		'function abc(foo) { const {bar} = foo || 123 }',
		'function abc(foo, bar) { bar = foo || \'bar\' }',
		'function abc(foo) { foo = foo && \'bar\' }',
		'function abc(foo) { foo = foo || 1 && 2 || 3 }',
		'function abc(foo) { foo = !foo || \'bar\' }',
		'function abc(foo) { foo = (foo && bar) || baz }',
		'function abc(foo = 123) { foo = foo || \'bar\' }',
		'function abc() { let foo = 123; foo = foo || \'bar\' }',
		'function abc() { let foo = 123; const bar = foo || \'bar\' }',
		'const abc = (foo = \'bar\') => { };',
		'const abc = (foo, bar) => { bar = foo || \'bar\' };',
		'foo = foo || \'bar\';',
		'const bar = foo || \'bar\';',
		outdent`
			function abc(foo) {
				function def(bar) {
					foo = foo || 'bar';
				}
			}
		`
	],
	invalid: [
		{
			code: 'function abc(foo) { foo = foo || \'bar\'; }',
			output: 'function abc(foo = \'bar\') { }',
			errors: [error]
		},
		{
			code: 'function abc(foo) { foo = foo || \'bar\';}',
			output: 'function abc(foo = \'bar\') { }',
			errors: [error]
		},
		{
			code: 'function abc(foo) { foo = foo || 123; }',
			output: 'function abc(foo = 123) { }',
			errors: [error]
		},
		{
			code: 'function abc(foo) { foo = foo || true; }',
			output: 'function abc(foo = true) { }',
			errors: [error]
		},
		{
			code: 'function abc(foo, bar) { foo = foo || \'bar\'; baz(); }',
			output: 'function abc(foo = \'bar\', bar) { baz(); }',
			errors: [error]
		},
		{
			code: 'function abc(foo) { const bar = foo || \'bar\'; }',
			output: 'function abc(bar = \'bar\') { }',
			errors: [error]
		},
		{
			code: 'function abc(foo) { let bar = foo || \'bar\'; }',
			output: 'function abc(bar = \'bar\') { }',
			errors: [error]
		},
		{
			code: 'function abc(bar) { foo(); bar = bar || 123; }',
			output: 'function abc(bar = 123) { foo(); }',
			errors: [error]
		},
		{
			code: 'const abc = (foo) => { foo = foo || \'bar\'; };',
			output: 'const abc = (foo = \'bar\') => { };',
			errors: [error]
		},
		{
			code: 'const abc = foo => { foo = foo || \'bar\'; };',
			output: 'const abc = (foo = \'bar\') => { };',
			errors: [error]
		},
		{
			code: 'const abc = (bar) => { foo(); bar = bar || \'bar\'; };',
			output: 'const abc = (bar = \'bar\') => { foo(); };',
			errors: [error]
		},
		{
			code: 'const abc = (foo) => { const bar = foo || \'bar\'; };',
			output: 'const abc = (bar = \'bar\') => { };',
			errors: [error]
		},
		{
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					bar();
					baz();
				}
			`,
			output: outdent`
				function abc(foo = 'bar') {
					bar();
					baz();
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar'; bar(); baz();
				}
			`,
			output: outdent`
				function abc(foo = 'bar') {
					bar(); baz();
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`,
			output: outdent`
				function abc(foo = 'bar') {
					function def(bar = 'foo') {
					}
				}
			`,
			errors: [error, error]
		}
	]
});
