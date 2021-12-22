import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'typeof notDeclared === "undefined"',
		'typeof globalThis === "undefined"',
		'typeof foo.bar === "undefined"',
		'typeof foo?.bar === "undefined"',
	],
	invalid: [
		'var withVar; typeof withVar == "undefined"',
		'let withLet; "undefined" != typeof withLet',
		'const withConst = 0; typeof withConst === "undefined"',
		'import withImport from "foo"; "undefined" !== typeof withImport',
		'withArrowFnParameter => typeof withArrowFnParameter === "undefined"',
		'function foo(withFnParameter) { "undefined" !== typeof withFnParameter }',
		'let foo; typeof foo.bar == "undefined"',
		'let foo; typeof foo?.bar == "undefined"',
	],
});
