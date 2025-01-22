import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			switch (foo) {
				case a:
				case b:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
					break;
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					break;
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
					// Fallthrough
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				default:
					handleDefaultCase();
					break;
				case b:
					handleCaseB();
					break;
			}
		`,
		outdent`
			switch (1) {
					// This is not useless
					case 1:
					default:
							console.log('1')
					case 1:
							console.log('2')
			}
		`,
	],
	invalid: [
		outdent`
			switch (foo) {
				case a:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a: {
				}
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a: {
					;;
					{
						;;
						{
							;;
						}
					}
				}
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case (( b ))         :
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case b:
					handleCaseAB();
					break;
				case d:
				case d:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				// eslint-disable-next-line
				case a:
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				// eslint-disable-next-line
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
	],
});
