import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		outdent`
			import {fileURLToPath} from 'node:url';
			const assets = fileURLToPath(new URL('.', import.meta.url)) + 'assets';
		`,
		outdent`
			import {fileURLToPath} from 'url';
			const dirname = fileURLToPath(new URL('./', import.meta.url));
		`,
		outdent`
			import {dirname} from 'node:path';
			import {fileURLToPath} from 'node:url';
			const parentDirectory = dirname(fileURLToPath(new URL('.', import.meta.url)));
		`,
		'process.getBuiltinModule(`node:url`).fileURLToPath(new URL(`.\\u002f`, import.meta.url))',
		'process.getBuiltinModule(`node:url`).fileURLToPath(new URL(tag`./`, import.meta.url))',
		'process.getBuiltinModule(`node:${name}`).fileURLToPath(import.meta.url)', // eslint-disable-line no-template-curly-in-string
		outdent`
			import {fileURLToPath} from 'node:url';
			const filename = fileURLToPath(import.meta.url, {windows: true});
		`,
		outdent`
			import path from 'node:path';
			const dirname = path.win32.dirname(import.meta.filename);
		`,
		outdent`
			import {win32 as path} from 'node:path';
			const dirname = path.dirname(import.meta.filename);
		`,
		outdent`
			import url from 'node:url';
			const filename = url[(getName(), 'fileURLToPath')](import.meta.url);
		`,
		outdent`
			import {fileURLToPath} from 'node:url';
			const filename = fileURLToPath(import.meta[(getName(), 'url')]);
		`,
		outdent`
			import {fileURLToPath} from 'node:url';
			const filename = fileURLToPath(new URL(import.meta.url, getBaseUrl()));
		`,
	],
	invalid: [
		{
			code: 'process.getBuiltinModule(`node:url`).fileURLToPath(import.meta.url)',
			output: 'import.meta.filename',
			errors: 1,
		},
		{
			code: 'import {fileURLToPath} from "node:url"; function filename() {return(fileURLToPath)(import.meta.url);}',
			output: 'import {fileURLToPath} from "node:url"; function filename() {return import.meta.filename;}',
			errors: 1,
		},
		{
			code: 'import {dirname} from "node:path"; const result = dirname(import.meta.filename)instanceof String;',
			output: 'import {dirname} from "node:path"; const result = import.meta.dirname instanceof String;',
			errors: 1,
		},
		{
			code: 'import {fileURLToPath} from "node:url"; delete fileURLToPath(import.meta.url);',
			errors: 1,
		},
		{
			code: 'import {fileURLToPath} from "node:url"; delete fileURLToPath(import.meta.url).metadata;',
			output: 'import {fileURLToPath} from "node:url"; delete import.meta.filename.metadata;',
			errors: 1,
		},
		{
			code: 'import {dirname} from "node:path"; const filename = import.meta.filename; delete (dirname(filename) as string);',
			errors: 1,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import {fileURLToPath} from "node:url"; const filename = fileURLToPath(import.meta.url)as string;',
			output: 'import {fileURLToPath} from "node:url"; const filename = import.meta.filename as string;',
			errors: 1,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import {fileURLToPath} from "node:url"; const filename = fileURLToPath(import.meta["url"]);',
			output: 'import {fileURLToPath} from "node:url"; const filename = import.meta.filename;',
			errors: 1,
		},
		{
			code: 'const {[`fileURLToPath`]: convert} = process["getBuiltinModule"]("node:url"); const filename = convert(import.meta.url);',
			output: 'const {[`fileURLToPath`]: convert} = process["getBuiltinModule"]("node:url"); const filename = import.meta.filename;',
			errors: 1,
		},
		{
			code: 'import {"fileURLToPath" as convert} from "node:url"; const filename = convert(import.meta.url);',
			output: 'import {"fileURLToPath" as convert} from "node:url"; const filename = import.meta.filename;',
			errors: 1,
		},
		{
			code: outdent`
				import {default as path} from 'node:path';
				import {"default" as url} from 'node:url';
				const directory = path.dirname(url.fileURLToPath(import.meta.url));
			`,
			output: outdent`
				import {default as path} from 'node:path';
				import {"default" as url} from 'node:url';
				const directory = import.meta.dirname;
			`,
			errors: 1,
		},
	],
});

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
		// `fileURLToPath` is not imported
		'const filename = fileURLToPath(import.meta.url);',
		// `path` is not imported
		'const dirname = path.dirname(import.meta.filename);',
		outdent`
			import path from "path";
			// It is the same as dirname on macOS but returns different results on Windows.
			const notDirname = path.dirname(new URL(import.meta.url).pathname);
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
			const dirname = path.dirname?.(import.meta.filename);
		`,
		outdent`
			const { [fileURLToPath]: fileURLToPath } = process.getBuiltinModule("node:url");
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
		// `fileURLToPath` is not imported from `url`
		outdent`
			import {fileURLToPath} from "./url.js";
			const filename = fileURLToPath(import.meta.url);
		`,
		// The base is not the current directory
		outdent`
			import {fileURLToPath} from "node:url";
			const dirname = fileURLToPath(new URL(base, import.meta.url));
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
			import {dirname} from 'node:path';
			import {fileURLToPath} from 'node:url';
			const directory = dirname(fileURLToPath(new URL(import.meta.url)));
		`,
		'import path from "node:path"; const directory = path[`dirname`](import.meta["filename"]);',
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

		// A comment inside the call is preserved by not fixing
		outdent`
			import {fileURLToPath} from 'node:url';
			const filename = fileURLToPath(/* comment */ import.meta.url);
		`,
		outdent`
			import {dirname} from 'node:path';
			const directory = dirname(import.meta.filename /* comment */);
		`,
	],
});
