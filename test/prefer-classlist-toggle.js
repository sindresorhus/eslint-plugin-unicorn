import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// `IfStatement`
test.snapshot({
	valid: [
		outdent`
			if (condition) {
				el.classList.notAdd('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				el.classList.remove('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				el.classList.add('className');
			} else {
				el.classList.add('className');
			}
		`,
		outdent`
			if (condition) {
				el.classList.add('className1');
			} else {
				el.classList.remove('className2');
			}
		`,
		outdent`
			el.classList.add('className');
			el.classList.remove('className');
		`,
		outdent`
			if (condition) {
				el.classList.add?.('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				el.classList?.add('className');
			} else {
				el.classList.remove('className');
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
				el.notClassList.add('className');
			} else {
				el.notClassList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				el.classList.add('className');
				foo();
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				{
					el.classList.add('className');
				}
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition) {
				el1.classList.add('className');
			} else {
				el2.classList.remove('className');
			}
		`,
	],
	invalid: [
		outdent`
			if (condition) {
				el.classList.add('className');
			} else {
				el.classList.remove('className');
			}
		`,
		// Not `BlockStatement`
		outdent`
			if (condition)
				el.classList.add('className');
			else
				el.classList.remove('className');
		`,
		outdent`
			if (condition)
				el.classList.add('className');
			else {
				el.classList.remove('className');
			}
		`,
		// Optional element
		outdent`
			if (condition) {
				el?.classList.add('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (condition)
				el.classList.add('className');
			else
				el?.classList.remove('className');
		`,
		outdent`
			if (condition) {
				el.classList.add('className');
			} else {
				el.classList.remove('className');
			}
		`,
		// Negative
		outdent`
			if (condition) {
				el.classList.remove('className');
			} else {
				el.classList.add('className');
			}
		`,
		// Parentheses
		outdent`
			if (condition) {
				(( el )).classList.add('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (0, condition) {
				el.classList.add('className');
			} else {
				el.classList.remove('className');
			}
		`,
		outdent`
			if (0, condition) {
				el.classList.remove('className');
			} else {
				el.classList.add('className');
			}
		`,
		// ASI
		outdent`
			foo

			if (condition) {
				(( el )).classList.add('className')
			} else {
				el.classList.remove('className')
			}
		`,
		// ASI
		outdent`
			if (condition) {
				(( el )).classList.add('className')
			} else {
				el.classList.remove('className')
			}

			[].forEach(foo);
		`,
	],
});
