import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// Statements
test.snapshot({
	valid: [
		'import foo from "foo"',
		'export {foo} from "foo"',
		'export * from "foo"',
		'import foo from "foo" with {type: "json"}',
		'export {foo} from "foo" with {type: "json"}',
		'export * from "foo" with {type: "json"}',
		'export {}',
	],
	invalid: [
		'import "foo" with {}',
		'import foo from "foo" with {}',
		'export {foo} from "foo" with {}',
		'export * from "foo" with {}',
		'export * from "foo"with{}',
		'export * from "foo"/* comment 1 */with/* comment 2 */{/* comment 3 */}/* comment 4 */',
	],
});

// `ImportExpression`
test.snapshot({
	valid: [
		'import("foo")',
		'import("foo", {unknown: "unknown"})',
		'import("foo", {with: {type: "json"}})',
		'not_import("foo", {})',
		'not_import("foo", {with:{}})',
	],
	invalid: [
		'import("foo", {})',
		'import("foo", (( {} )))',
		'import("foo", {},)',
		'import("foo", {with:{},},)',
		'import("foo", {with:{}, unknown:"unknown"},)',
		'import("foo", {"with":{}, unknown:"unknown"},)',
		'import("foo", {unknown:"unknown", with:{}, },)',
		'import("foo", {unknown:"unknown", with:{} },)',
		'import("foo", {unknown:"unknown", with:{}, unknown2:"unknown2", },)',
		'import("foo"/* comment 1 */, /* comment 2 */{/* comment 3 */}/* comment 4 */,/* comment 5 */)',
		'import("foo", {/* comment 1 */"with"/* comment 2 */:/* comment 3 */{/* comment 4 */}, }/* comment 5 */,)',
	],
});

// A comment inside the removed attribute clause or options object prevents the fix
test.snapshot({
	valid: [],
	invalid: [
		'import foo from "foo" with {\n\t// why\n};',
		'export {foo} from "foo" with {/* why */};',
		'import("foo", {\n\t// why\n});',
		'import("foo", {unknown: "unknown", with: {/* why */}});',
		// A comment outside the removed tokens is kept
		'import foo from "foo" /* why */ with {};',
		'import("foo", {unknown: "unknown", /* why */ with: {}});',
	],
});
