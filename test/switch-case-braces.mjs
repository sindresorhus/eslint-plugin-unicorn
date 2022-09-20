import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Empty
test.snapshot({
	valid: [
		outdent`
			switch(foo){
				case 1: {
					break;
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					; // <- Not empty
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					{} // <- Not empty
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					break;
				}
			}
		`,
		{
			code: outdent`
				switch(foo){
					case 1:
						label: // <- Not empty
						{
						}
				}
			`,
			options: ['avoid'],
		},
		{
			code: outdent`
				switch(foo){
					case 1: {
					}
					; // <- Not empty
				}
			`,
			options: ['avoid'],
		},
	],
	invalid: [
		outdent`
			switch(foo){
				case 1: {
				}
				case 2: {
				}
				default: {
					doSomething();
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					// fallthrough
				}
				default: {
				}
				// fallthrough
				case 3: {
					doSomething();
					break;
				}
			}
		`,
	],
});

// Enforce braces
test.snapshot({
	valid: [
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
			}
		`,
	],
	invalid: [
		outdent`
			switch(foo) {
				default:
					doSomething();
			}
		`,
		outdent`
			switch(foo) {
				case 1: {
					doSomething();
				}
				break; // <-- This should be between braces;
			}
		`,
		outdent`
			switch(foo) {
				default:
					label: {}
			}
		`,
	],
});

// Avoid braces
test.snapshot({
	valid: [
		outdent`
			switch(foo) {
				default: {
					var a;
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					function a() {}
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
				break;
			}
		`,
	].map(code => ({code, options: ['avoid']})),
	invalid: [
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					{
						const bar = 2;
						doSomething();
					}
					doSomethingElse();
				}
			}
		`,
		outdent`
			switch(foo) {
				case 1: {
					break;
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {{{
					doSomething();
				}}}
			}
		`,
		outdent`
			switch(foo) {
				default: {{{
					doSomething();
					{
						doSomethingElseInBlockStatement();
					}
				}}}
			}
		`,
	].map(code => ({code, options: ['avoid']})),
});
