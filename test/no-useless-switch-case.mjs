import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

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
					// Fallthrough
				default:
					handleDefaultCase();
					break;
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
				case b:
				case c:
				case d:
				case (( e ))         :
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case b:
				case c:
					handleCaseABC();
					break;
				case d:
				case e:
				default:
					handleDefaultCase();
					break;
			}
		`,
	],
});
