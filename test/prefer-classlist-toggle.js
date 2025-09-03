import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// `IfStatement`
test.snapshot({
	valid: [
		outdent`
			if (condition) {
				element.classList.notAdd('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element.classList.remove('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element.classList.add('className');
			} else {
				element.classList.add('className');
			}
		`,
		outdent`
			if (condition) {
				element.classList.add('className1');
			} else {
				element.classList.remove('className2');
			}
		`,
		outdent`
			element.classList.add('className');
			element.classList.remove('className');
		`,
		outdent`
			if (condition) {
				element.classList.add?.('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element.classList?.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				a.add('className');
			} else {
				a.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element.notClassList.add('className');
			} else {
				element.notClassList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element.classList.add('className');
				foo();
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				{
					element.classList.add('className');
				}
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				element1.classList.add('className');
			} else {
				element2.classList.remove('className');
			}
		`,
	],
	invalid: [
		outdent`
			if (condition) {
				element.classList.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		// Not `BlockStatement`
		outdent`
			if (condition)
				element.classList.add('className');
			else
				element.classList.remove('className');
		`,
		outdent`
			if (condition)
				element.classList.add('className');
			else {
				element.classList.remove('className');
			}
		`,
		// Optional element
		outdent`
			if (condition) {
				element?.classList.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (condition)
				element.classList.add('className');
			else
				element?.classList.remove('className');
		`,
		outdent`
			if (condition) {
				element.classList.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		// Negative
		outdent`
			if (condition) {
				element.classList.remove('className');
			} else {
				element.classList.add('className');
			}
		`,
		// Parentheses
		outdent`
			if (condition) {
				(( element )).classList.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (0, condition) {
				element.classList.add('className');
			} else {
				element.classList.remove('className');
			}
		`,
		outdent`
			if (0, condition) {
				element.classList.remove('className');
			} else {
				element.classList.add('className');
			}
		`,
		// ASI
		outdent`
			foo

			if (condition) {
				(( element )).classList.add('className')
			} else {
				element.classList.remove('className')
			}
		`,
		outdent`
			if (condition) {
				(( element )).classList.add('className')
			} else {
				element.classList.remove('className')
			}

			[].forEach(foo);
		`,
	],
});
