import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'import foo from "foo"',
		'export {foo} from "foo"',
		'export * from "foo"',
		'import foo from "foo" with {type: "json"}',
		'export {foo} from "foo" with {type: "json"}',
		'export * from "foo" with {type: "json"}',
	],
	invalid: [
		'import foo from "foo" with {}',
		'export {foo} from "foo" with {}',
		'export * from "foo" with {}',
		'export * from "foo"with{}',
		'export * from "foo"/* comment 1 */with/* comment 2 */{/* comment 3 */}/* comment 4 */',
	],
});
