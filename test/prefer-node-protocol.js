import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'import unicorn from "unicorn";',
		'import fs from "./fs";',
		'import fs from "unknown-builtin-module";',
		'import fs from "node:fs";',
		outdent`
			async function foo() {
				const fs = await import(fs);
			}
		`,
		outdent`
			async function foo() {
				const fs = await import(0);
			}
		`,
		outdent`
			async function foo() {
				const fs = await import(\`fs\`);
			}
		`,
		'import "punycode";', // Deprecated
		'import "node:punycode";', // Deprecated
		'import "punycode/";',
		'import "fs/";',
		// `test` is not a builtin module, `node:test` is
		'import "test";',
		'import "node:test";',
		// https://bun.sh/docs/runtime/bun-apis
		'import "bun";',
		'import "bun:jsc";',
		'import "bun:sqlite";',
	],
	invalid: [
		'import fs from "fs";',
		'export {promises} from "fs";',
		outdent`
			async function foo() {
				const fs = await import('fs');
			}
		`,
		'import fs from "fs/promises";',
		'export {default} from "fs/promises";',
		outdent`
			async function foo() {
				const fs = await import('fs/promises');
			}
		`,
		'import {promises} from "fs";',
		'export {default as promises} from "fs";',
		'import {promises} from \'fs\';',
		outdent`
			async function foo() {
				const fs = await import("fs/promises");
			}
		`,
		outdent`
			async function foo() {
				const fs = await import(/* escaped */"\\u{66}s/promises");
			}
		`,
		'import "buffer";',
		'import "child_process";',
		'import "timers/promises";',
	],
});

// `require`
test.snapshot({
	valid: [
		'const fs = require("node:fs");',
		'const fs = require("node:fs/promises");',
		'const fs = require(fs);',
		'const fs = notRequire("fs");',
		'const fs = foo.require("fs");',
		'const fs = require.resolve("fs");',
		'const fs = require(`fs`);',
		'const fs = require?.("fs");',
		'const fs = require("fs", extra);',
		'const fs = require();',
		'const fs = require(...["fs"]);',
		'const fs = require("unicorn");',
	],
	invalid: [
		'const {promises} = require("fs")',
		'const fs = require(\'fs/promises\')',
	],
});

// `process.getBuiltinModule`
test.snapshot({
	valid: [
		'const fs = process.getBuiltinModule("node:fs")',
		'const fs = process.getBuiltinModule?.("fs")',
		'const fs = process?.getBuiltinModule("fs")',
		'const fs = process.notGetBuiltinModule("fs")',
		'const fs = notProcess.getBuiltinModule("fs")',
		'const fs = process.getBuiltinModule("fs", extra)',
		'const fs = process.getBuiltinModule(...["fs"])',
		'const fs = process.getBuiltinModule()',
		'const fs = process.getBuiltinModule("unicorn")',
		// Not checking this to avoid false positive
		outdent`
			import {getBuiltinModule} from 'node:process';
			const fs = getBuiltinModule("fs");
		`,
	],
	invalid: [
		'const fs = process.getBuiltinModule("fs")',
	],
});

test.babel({
	valid: [
		'export fs from "node:fs";',
	],
	invalid: [
		{
			code: 'export fs from "fs";',
			output: 'export fs from "node:fs";',
			errors: 1,
		},
		{
			code: 'await import(\'assert/strict\')',
			output: 'await import(\'node:assert/strict\')',
			errors: 1,
		},
	],
});

test.typescript({
	valid: [
		'const fs = require("node:fs") as typeof import("node:fs");',
		'const fs = require("node:fs") as typeof SomeType<"fs">;',
		'const fs = require("node:fs") as typeof fs;',
		'const fs = require("node:fs") as "fs";',
		'const fs = require("node:fs") as any;',
		'type fs = typeof import("node:fs");',
		'type fs = SomeType<typeof import("node:fs")>;',
	],
	invalid: [
		{
			code: 'const fs = require("fs") as typeof import("fs");',
			output: 'const fs = require("node:fs") as typeof import("node:fs");',
			errors: 2,
		},
		{
			code: 'const fs = require("node:fs") as typeof import("fs");',
			output: 'const fs = require("node:fs") as typeof import("node:fs");',
			errors: 1,
		},
		{
			code: 'const fs = someFunc() as typeof import("fs");',
			output: 'const fs = someFunc() as typeof import("node:fs");',
			errors: 1,
		},
		{
			code: 'const fs = someFunc() as SomeType<typeof import("fs")>;',
			output: 'const fs = someFunc() as SomeType<typeof import("node:fs")>;',
			errors: 1,
		},
		{
			code: 'type fs = typeof import("fs");',
			output: 'type fs = typeof import("node:fs");',
			errors: 1,
		},
		{
			code: 'type fs = SomeType<typeof import("fs")>;',
			output: 'type fs = SomeType<typeof import("node:fs")>;',
			errors: 1,
		},
	],
});
