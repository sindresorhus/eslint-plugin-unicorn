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
