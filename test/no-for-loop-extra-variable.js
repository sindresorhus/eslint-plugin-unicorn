import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'for (let i = 0; i < arr.length; i += 1) {}',
		'for (let i = 0, j = 5; i < j; i += 1) {}',
		'for (let i = 0, j = arr.length; k < j; i += 1) {}',
		'for (let i = 0, j = arr.length; i < j; update(i)) {}',
		outdent`
			for (var i = 0, j = arr.length; i < j; i += 1) {}
			console.log(j);
		`,
		'for (let i = 0, j = arr.length, k = 1; i < j; i += 1) {}',
		'for (let [i] = [0], j = arr.length; i < j; i += 1) {}',
	],
	invalid: [
		{
			code: outdent`
				for (let i = 0, j = arr.length; i < j; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; i < arr.length; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
		},
		{
			code: outdent`
				for (let i = 0, j = arr.length; j > i; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; arr.length > i; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
		},
		{
			code: outdent`
				for (let i = 0, j = arr.length; i < j; i += 1) {
					console.log(j);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; i < arr.length; i += 1) {
					console.log(arr.length);
				}
			`,
		},
		{
			code: outdent`
				for (var i = 0, j = arr.length; i < j; i += 1) {
					console.log(arr[i]);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (var i = 0; i < arr.length; i += 1) {
					console.log(arr[i]);
				}
			`,
		},
		{
			code: outdent`
				for (let i = 0, j = arr.length; i < j; i++) {
					console.log(arr[i]);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; i < arr.length; i++) {
					console.log(arr[i]);
				}
			`,
		},
		{
			code: outdent`
				for (let i = 0, j = arr.length; i < j; ++i) {
					console.log(arr[i]);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; i < arr.length; ++i) {
					console.log(arr[i]);
				}
			`,
		},
		{
			code: outdent`
				for (let i = 0, j = arr.length; i < j; i = i + 1) {
					console.log(arr[i]);
				}
			`,
			errors: [{messageId: 'no-for-loop-extra-variable'}],
			output: outdent`
				for (let i = 0; i < arr.length; i = i + 1) {
					console.log(arr[i]);
				}
			`,
		},
	],
});
