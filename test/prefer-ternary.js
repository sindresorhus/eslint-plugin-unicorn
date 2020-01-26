import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-ternary';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-ternary', rule, {
	valid: [
		'if(a){b = 1;}',
		{
			code: `if(a){
					b = 1
					doSomeStuff()
				}
				else{
					b = 2
				}`
		},
		{
			code: `if(a){
					b = 1
				}
				else{
					c = 2
				}`
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					b =  2;
				}`,
			options: [{assignment: 'never'}]
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					c =  2;
				}`,
			options: [{assignment: 'same'}]
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					c =  2;
				}`,
			options: [{assignment: 'never'}]
		},
		{
			code: `function foo(){
					if(a){
						return 1;
					} 
					else{
						return 2;
					}
				}`,
			options: [{return: false}]
		},
		{
			code: `if(a){
					foo();
				} 
				else{
					bar();
				}`
		},
		{
			code: `if(a){
					foo();
				} 
				else{
					bar();
				}`,
			options: [{call: false}]
		}

	],

	invalid: [
		{
			code: `if(a){
			b  = 1;
		} 
		else{
			b =  2;
		}`,
			output: 'b = a ? 1 : 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					b =  2;
				}`,
			options: ['always'],
			output: 'b = a ? 1 : 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					b =  2;
				}`,
			options: [{assignment: 'same'}],
			output: 'b = a ? 1 : 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: `if(a){
					b  = 1;
				} 
				else{
					b =  2;
				}`,
			options: [{assignment: 'any'}],
			output: 'b = a ? 1 : 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},

		{
			code: `if(a){
					b = 1;
				} 
				else{
					c = 2;
				}`,
			options: ['always'],
			output: 'a ? b = 1 : c = 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: `if(a){
					b = 1;
				} 
				else{
					c = 2;
				}`,
			options: [{assignment: 'any'}],
			output: 'a ? b = 1 : c = 2',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},

		{
			code: 'function foo(){if(a){return 1;}else{return 2;}}',
			output: 'function foo(){return a ? 1 : 2}',
			errors: [
				{column: 16, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: 'function foo(){if(a){return 1;}else{return 2;}}',
			options: ['always'],
			output: 'function foo(){return a ? 1 : 2}',
			errors: [
				{column: 16, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: 'function foo(){if(a){return 1;}else{return 2;}}',
			options: [{return: true}],
			output: 'function foo(){return a ? 1 : 2}',
			errors: [
				{column: 16, line: 1, type: 'IfStatement'}
			]
		},

		{
			code: `if(a){
					foo();
				} 
				else{
					bar();
				}`,
			options: ['always'],
			output: 'a ? foo() : bar()',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		},
		{
			code: `if(a){
					foo(param1, [param2, param3]);
				} 
				else{
					bar();
				}`,
			options: [{call: true}],
			output: 'a ? foo(param1, [param2, param3]) : bar()',
			errors: [
				{column: 1, line: 1, type: 'IfStatement'}
			]
		}
	]
});
