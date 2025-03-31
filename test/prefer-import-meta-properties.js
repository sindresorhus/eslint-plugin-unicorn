import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const __dirname = import.meta.dirname;',
		'const __filename = import.meta.filename;',
		outdent`
			import path from "path";
			const dirUrl = path.dirname(import.meta.url);
		`,
		'const url = import.meta.url;',
		'const dirname = new URL(".", import.meta.url).pathname;',
		'const filename = new URL(import.meta.url).pathname;',
		'const filename = fileURLToPath(import.meta.url);', // `fileURLToPath` is not imported
		'const dirname = path.dirname(import.meta.filename);', // `path` is not imported
		outdent`
			import path from "path";
			const not_dirname = path.dirname(new URL(import.meta.url).pathname); // It is the same as dirname on macOS but returns different results on Windows.
		`,
		outdent`
			// path is not initialized
			let path;
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			// path is unknown property
			const { path } = process.getBuiltinModule("node:path");
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			const { dirname } = process.getBuiltinModule("node:path");
			// dirname()() is unknown
			const x = dirname(x)(import.meta.filename);
		`,
		outdent`
			// path is unknown
			const path = new X();
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			// path is unknown
			const path = path;
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			// path is unknown
			const [path] = process.getBuiltinModule("node:path");
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			import path from "path";
			const dirname = path?.dirname(import.meta.filename);
		`,
		outdent`
			import path from "path";
			const dirname = path[dirname](import.meta.filename);
		`,
		outdent`
			import path from "path";
			const dirname = path["dirname"](import.meta.filename);
		`,
		outdent`
			import path from "path";
			const dirname = path.dirname?.(import.meta.filename);
		`,
		outdent`
			const { [fileURLToPath]: fileURLToPath } = process.getBuiltinModule("node:url");
			const filename = fileURLToPath(import.meta.url);
		`,
		outdent`
			const { ["fileURLToPath"]: fileURLToPath } = process.getBuiltinModule("node:url");
			const filename = fileURLToPath(import.meta.url);
		`,
		outdent`
			import {fileURLToPath} from "node:url";
			class Foo {
				constructor() {
					const filename = fileURLToPath(new.target.url)
				}
			}
		`,
		outdent`
			import {fileURLToPath} from "node:url";
			const filename = fileURLToPath(import.meta?.url)
		`,
		outdent`
			import {fileURLToPath} from "node:url";
			const filename = fileURLToPath(import.meta['url'])
		`,
	],
	invalid: [
		outdent`
			import path from "path";
			import { fileURLToPath } from "url";
			const dirname = path.dirname(fileURLToPath(import.meta.url));
		`,
		outdent`
			import path from "path";
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			import { fileURLToPath } from "url";
			const dirname = fileURLToPath(new URL(".", import.meta.url));
		`,
		outdent`
			import { fileURLToPath } from "url";
			const dirname = fileURLToPath(new URL("./", import.meta.url));
		`,
		outdent`
			import { fileURLToPath } from "url";
			const filename = fileURLToPath(import.meta.url);
		`,
		outdent`
			import { fileURLToPath } from "url";
			const filename = fileURLToPath(new URL(import.meta.url));
		`,
		outdent`
			import path from "node:path";
			import { fileURLToPath } from "node:url";
			const dirname = path.dirname(fileURLToPath(import.meta.url));
		`,
		outdent`
			import { fileURLToPath } from "node:url";
			const filename = fileURLToPath(import.meta.url);
		`,
		outdent`
			import * as path from "node:path";
			import url from "node:url";
			const dirname = path.dirname(url.fileURLToPath(import.meta.url));
		`,
		outdent`
			import url from "node:url";
			const filename = url.fileURLToPath(import.meta.url);
		`,
		outdent`
			import path from "node:path";
			import { fileURLToPath } from "node:url";
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
		`,
		outdent`
			import path from "node:path";
			const __filename = import.meta.filename;
			const __dirname = path.dirname(__filename);
		`,
		outdent`
			const path = process.getBuiltinModule("node:path");
			const { fileURLToPath } = process.getBuiltinModule("node:url");
			const filename = fileURLToPath(import.meta.url);
			const dirname = path.dirname(filename);
		`,
		outdent`
			const { fileURLToPath: renamed } = process.getBuiltinModule("node:url");
			const filename = renamed(import.meta.url);
		`,
		outdent`
			import { fileURLToPath as renamed } from "node:url";
			const filename = renamed(import.meta.url);
		`,
		outdent`
			const path = process.getBuiltinModule("path");
			const { fileURLToPath } = process.getBuiltinModule("url");
			const filename = fileURLToPath(import.meta.url);
			const dirname = path.dirname(filename);
		`,
		outdent`
			const filename = process.getBuiltinModule("node:url").fileURLToPath(import.meta.url);
			const dirname = process.getBuiltinModule("node:path").dirname(filename);
		`,
	],
});
