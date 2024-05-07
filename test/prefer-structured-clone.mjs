import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `JSON.parse(JSON.stringify(…))`
test.snapshot({
	valid: [
		'JSON.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.stringify())',
		'JSON.parse(JSON.stringify(...foo))',
		'JSON.parse(JSON.stringify(foo, extraArgument))',
		'JSON.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.stringify?.(foo))',
		'JSON.parse(JSON?.stringify(foo))',
		'JSON.parse?.(JSON.stringify(foo))',
		'JSON?.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.not_stringify(foo))',
		'JSON.parse(not_JSON.stringify(foo))',
		'JSON.not_parse(JSON.stringify(foo))',
		'not_JSON.parse(JSON.stringify(foo))',
		'JSON.stringify(JSON.parse(foo))',
	],
	invalid: [
		'JSON.parse(JSON.stringify(foo))',
		'JSON.parse(JSON.stringify(foo),)',
		'JSON.parse(JSON.stringify(foo,))',
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
	],
});
