import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'typeof notDeclared === "undefined"',
	],
	invalid: [
		'var withVar; typeof withVar == "undefined"',
		'let withLet; "undefined" != typeof withLet',
		'const withConst = 0; typeof withConst === "undefined"',
		'import withImport from "foo"; "undefined" !== typeof withImport',
		'withArrowFnParameter => typeof withArrowFnParameter === "undefined"',
		'function foo(withFnParameter) { "undefined" !== typeof withFnParameter }',
	],
});
