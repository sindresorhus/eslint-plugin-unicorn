import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// `JSON.parse(JSON.stringify(…))`
test.snapshot({
	valid: [
		'structuredClone(foo)',
		'JSON.parse(new JSON.stringify(foo))',
		'new JSON.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.stringify())',
		'JSON.parse(JSON.stringify(...foo))',
		'JSON.parse(JSON.stringify(foo, extraArgument))',
		'JSON.parse(...JSON.stringify(foo))',
		'JSON.parse(JSON.stringify(foo), extraArgument)',
		'JSON.parse(JSON.stringify?.(foo))',
		'JSON.parse(JSON?.stringify(foo))',
		'JSON.parse?.(JSON.stringify(foo))',
		'JSON?.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.not_stringify(foo))',
		'JSON.parse(not_JSON.stringify(foo))',
		'JSON.not_parse(JSON.stringify(foo))',
		'not_JSON.parse(JSON.stringify(foo))',
		'JSON.stringify(JSON.parse(foo))',
		// Not checking
		'JSON.parse(JSON.stringify(foo, undefined, 2))',
	],
	invalid: [
		'JSON.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.stringify(foo),)',
		'JSON.parse(JSON.stringify(foo,))',
		'JSON.parse(JSON.stringify(foo,),)',
		'JSON.parse( ((JSON.stringify)) (foo))',
		'(( JSON.parse)) (JSON.stringify(foo))',
		'JSON.parse(JSON.stringify( ((foo)) ))',
		outdent`
			function foo() {
				return JSON
					.parse(
						JSON.
							stringify(
								bar,
							),
					);
			}
		`,
		// A comment in a replaced or removed callee would be lost, so there is no suggestion
		'const a = JSON /* keep */ .parse(JSON.stringify(foo));',
		'JSON.parse(JSON./* keep */stringify(foo))',
		// A comment outside the callees is kept
		'JSON.parse(/* keep */ JSON.stringify(foo /* keep */))',
		'JSON.parse(JSON.stringify /* keep */ (foo))',
	],
});

// Custom functions
test.snapshot({
	valid: [
		'new _.cloneDeep(foo)',
		'notMatchedFunction(foo)',
		'_.cloneDeep()',
		'_.cloneDeep(...foo)',
		'_.cloneDeep(foo, extraArgument)',
		'_.cloneDeep?.(foo)',
		'_?.cloneDeep(foo)',
	],
	invalid: [
		'_.cloneDeep(foo)',
		'lodash.cloneDeep(foo)',
		'lodash.cloneDeep(foo,)',
		{
			code: 'myCustomDeepCloneFunction(foo,)',
			options: [{functions: ['myCustomDeepCloneFunction']}],
		},
		{
			code: 'my.cloneDeep(foo,)',
			options: [{functions: ['my.cloneDeep']}],
		},
		// Coverage for `isNodeMatchesNameOrPath`
		{
			code: outdent`
				class A {
					constructor() {
						this.a = new.target.cloneDeep(foo);
						this.b = import.meta.cloneDeep(foo);
					}
				}
			`,
			options: [{functions: ['new.target.cloneDeep']}],
		},
		{
			code: outdent`
				class A {
					constructor() {
						this.a = super.cloneDeep(foo);
					}
				}
			`,
			options: [{functions: ['super.cloneDeep']}],
		},
		// The callee is replaced by a bare `structuredClone`, so a comment would be lost
		'const b = _./* keep */cloneDeep(foo);',
		'const c = _. /* keep */ cloneDeep(foo);',
		'_.cloneDeep(/* keep */ foo)',
	],
});
