import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-for-loop-extra-variable';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'no-for-loop-extra-variables',
	message: 'Unnecessary variable in for-loop.'
};

ruleTester.run('no-for-loop-extra-variable', rule, {
	valid: [
		outdent`
			for(let i = 1; i < arr.length; i += 1) {
				const element = arr[i];
				console.log(element);
			}
		`,
		outdent`
			for(let i = 1, j=arr.length; i < j; otherVariable += 1) {
				const element = arr[i];
				console.log(element);
			}
		`,
		outdent`
			for(let i = 1, j=arr.length, k =0; i < j; i += 1) {
				const element = arr[i];
				console.log(element);
			}
		`,
		outdent`
			for(let i = 1, j=arr.length; i < j; iterationFunction(i)) {
				const element = arr[i];
				console.log(element);
			}
		`
	],
	invalid: [
		{
			// J never used anywhere else (let)
			code: outdent`
				for(let i = 1, j=arr.length; i < j; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; i < arr.length; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// J never used anywhere else (var)
			code: outdent`
				for(var i = 1, j=arr.length; i < j; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(var i = 1; i < arr.length; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// ++ instead of += 1
			code: outdent`
				for(let i = 1, j=arr.length; i < j; i ++) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; i < arr.length; i ++) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// I = i + 1 instead of += 1
			code: outdent`
				for(let i = 1, j=arr.length; i < j; i = i + 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; i < arr.length; i = i + 1) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// Multiple references to j in test
			code: outdent`
				for(let i = 1, j=arr.length; i < j + j * 2; i++) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; i < arr.length + arr.length * 2; i++) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// J on left side of test
			code: outdent`
				for(let i = 1, j=arr.length; j > i; i += 1) {
					console.log('string');
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; arr.length > i; i += 1) {
					console.log('string');
				}
			`
		},
		{
			// J fixed value
			code: outdent`
				for(let i = 1, j=5; j > i; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; 5 > i; i += 1) {
					const element = arr[i];
					console.log(element);
				}
			`
		},
		{
			// J used in loop only (let)
			code: outdent`
				for(let i = 1, j=arr.length; i < j; i += 1) {
					otherFunction(j)
				}
			`,
			errors: [error],
			output: outdent`
				let j=arr.length
				for(let i = 1; i < j; i += 1) {
					otherFunction(j)
				}
			`
		},
		{
			// J used in loop only (var)
			code: outdent`
				for(var i = 1, j=arr.length; i < j; i += 1) {
					otherFunction(j)
				}
			`,
			errors: [error],
			output: outdent`
				var j=arr.length
				for(var i = 1; i < j; i += 1) {
					otherFunction(j)
				}
			`
		},
		{
			// J used after loop only (let)
			code: outdent`
				for(let i = 1, j = arr.length; j > i; i += 1) {
					console.log('string');
				}
				let j = 3;
			`,
			errors: [error],
			output: outdent`
				for(let i = 1; arr.length > i; i += 1) {
					console.log('string');
				}
				let j = 3;
			`
		},
		{
			// J used after loop only (var)
			code: outdent`
				for(var i = 1, j = arr.length; j > i; i += 1) {
					console.log('string');
				}
				console.log(j);
			`,
			errors: [error],
			output: outdent`
				var j = arr.length
				for(var i = 1; j > i; i += 1) {
					console.log('string');
				}
				console.log(j);
			`
		},
		{
			// J used in loop and after loop (let)
			code: outdent`
				for(let i = 1, j = arr.length; j > i; i += 1) {
					console.log(j);
				}
				let j = 3;
			`,
			errors: [error],
			output: outdent`
				for(let i = 1, j = arr.length; j > i; i += 1) {
					console.log(j);
				}
				let j = 3;
			`
		},
		{
			// J used in loop and after loop (var)
			code: outdent`
				for(var i = 1, j = arr.length; j > i; i += 1) {
					console.log(j);
				}
				console.log(j);
			`,
			errors: [error],
			output: outdent`
				var j = arr.length
				for(var i = 1; j > i; i += 1) {
					console.log(j);
				}
				console.log(j);
			`
		},
		{
			// J used before loop only (let)
			code: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					for(let i = 1, j = arr.length; j > i; i += 1) {
						console.log('string');
					}
				}
			`,
			errors: [error],
			output: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					for(let i = 1; arr.length > i; i += 1) {
						console.log('string');
					}
				}
			`
		},
		{
			// J used before and in loop (let)
			code: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					for(let i = 1, j = arr.length; j > i; i += 1) {
						console.log(j);
					}
				}
			`,
			errors: [error],
			output: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					let j = arr.length
				for(let i = 1; j > i; i += 1) {
						console.log(j);
					}
				}
			`
		},
		{
			// J used before and in loop (var)
			code: outdent`
				if(conditional){
					var j = 5
				}
				else{	
					for(var i = 1, j = arr.length; j > i; i += 1) {
						console.log(j);
					}
				}
			`,
			errors: [error],
			output: outdent`
				if(conditional){
					var j = 5
				}
				else{	
					var j = arr.length
				for(var i = 1; j > i; i += 1) {
						console.log(j);
					}
				}
			`
		},
		{
			// J used before, in, and after loop (let)
			code: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					for(let i = 1, j = arr.length; j > i; i += 1) {
						console.log(j);
					}
					let j = 5
				}
			`,
			errors: [error],
			output: outdent`
				if(conditional){
					let j = 5
				}
				else{	
					for(let i = 1, j = arr.length; j > i; i += 1) {
						console.log(j);
					}
					let j = 5
				}
			`
		},
		{
			// J used before, in, and after loop (var)
			code: outdent`
				if(conditional){
					console.log(j)
				}
				else{	
					for(var i = 1, j = arr.length; j > i; i += 1) {
						console.log(j);
					}
					console.log(j)
				}
			`,
			errors: [error],
			output: outdent`
				if(conditional){
					console.log(j)
				}
				else{	
					var j = arr.length
				for(var i = 1; j > i; i += 1) {
						console.log(j);
					}
					console.log(j)
				}
			`
		}
	]
});
