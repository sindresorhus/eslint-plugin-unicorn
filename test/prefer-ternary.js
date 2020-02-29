import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-ternary';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-ternary', rule, {
	valid: [
		{
			code: outdent`
		if(a){
			b = 1;
		}`
		},
		{
			code: outdent`
			if(a){
				b = 1
				bar()
			}
			else{
				b = 2
			}`
		},
		{
			code: outdent`
			if(a){
				b = 1
			}
			else{
				c = 2
			}`
		},
		{
			code: outdent`
			if(a){
				b  = 1;
			} 
			else{
				c =  2;
			}`
		},
		{
			code: outdent`
			if(a){
				foo();
			} 
			else{
				bar();
			}`
		}

	],

	invalid: [
		{
			code: outdent`
			if(foo){
				bar = 1;
			} 
			else{
				bar = 2;
			}`,
			output: 'bar = (foo ? 1 : 2)',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: outdent`
			function foo(){
				if(bar){
					return 1;
				}
				else{
					return 2;
				}
			}`,
			output: outdent`
			function foo(){
				return (bar ? 1 : 2)
			}`,
			errors: [
				{column: 2, line: 2, type: 'IfStatement'}
			]
		},
		{
			code: outdent`
			function* generator(){
				while(foo){
					if(bar){
						yield bat
					}
					else{
						yield baz
					}
				}
			}`,
			output: outdent`
			function* generator(){
				while(foo){
					yield (bar ? bat : baz)
				}
			}`,
			errors: [
				{column: 3, line: 3, type: 'IfStatement'}
			]
		}
	]
});
