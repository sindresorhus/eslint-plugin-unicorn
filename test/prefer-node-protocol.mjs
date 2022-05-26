import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'import unicorn from "unicorn";',
		'import fs from "./fs";',
		'import fs from "unknown-builtin-module";',
		'const fs = require("fs");',
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
