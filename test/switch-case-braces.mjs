import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// empty
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
	]
});
