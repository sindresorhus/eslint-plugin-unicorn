/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'JSON.parse(await fs.readFile(file, "buffer"));',
		'JSON.parse(await fs.readFile(file, "gbk"));',
		'JSON.parse(await fs.readFile(file, ));',
		'JSON.parse(await fs.readFile(file, unknown));',
		'JSON.parse(await fs.readFile(...file, "utf8"));',
		'JSON.parse(await fs.readFile(file, ..."utf8"));',
		'JSON.parse(await fs.readFile(file, 0));',
		'JSON.parse(await fs.readFile(file, "utf8", extraArgument));',
		'JSON.parse(await fs.readFile?.(file, "utf8"));',
		'JSON.parse(await fs?.readFile(file, "utf8"));',
		'JSON.parse(await fs.notReadFileMethod(file, "utf8"));',
		'JSON.parse?.(await fs.readFile(file, "utf8"));',
		'JSON?.parse(await fs.readFile(file, "utf8"));',
		'window.JSON.parse(await fs.readFile(file, "utf8"));',
		'JSON.stringify(await fs.readFile(file, "utf8"));',
		'NOT_JSON.parse(await fs.readFile(file, "utf8"));',
		'for (const string of []) JSON.parse(string);',
		'JSON.parse(await fs.readFile(file, "utf8"), extraArgument);',
		'JSON.parse(foo);',
		'JSON.parse();',
		'JSON.parse(await fs.readFile(file, {encoding: "not-utf8"}));',
		'JSON.parse(await fs.readFile(file, {encoding: "utf8", extraProperty: "utf8"}));',
		'JSON.parse(await fs.readFile(file, {...encoding}));',
		'JSON.parse(await fs.readFile(file, {encoding: unknown}));',
		'const encoding = "gbk";JSON.parse(await fs.readFile(file, {encoding: encoding}));',
		'const readingOptions = {encoding: "utf8", extraProperty: undefined};JSON.parse(await fs.readFile(file, readingOptions));',
		outdent`
			const {string} = await fs.readFile(file, "utf8");
			JSON.parse(string);
		`,
		outdent`
			const string = fs.readFile(file, () => {});
			JSON.parse(string);
		`,
		outdent`
			const abortControl = new AbortControl();
			const {signal} = abortControl;
			const promise = readFile(fileName, { encoding: "utf8", signal });
			if (foo) {
				JSON.parse(await promise);
			} else {
				controller.abort();
			}
		`,
		outdent`
			const string= await fs.readFile(file, "utf8");
			console.log(string);
			JSON.parse(string);
		`,
		outdent`
			const string= await fs.readFile(file, "utf8");
			JSON.parse(\`[\${string}]\`);
		`,
		outdent`
			const foo = {};
			foo.bar = await fs.readFile(file, "utf8");
			JSON.parse(foo.bar);
		`,
		outdent`
			const foo = await fs.readFile(file, "utf8");
			const bar = await foo;
			console.log(baz);
			const baz = await bar;
			JSON.parse(baz);
		`,
		outdent`
			const foo = fs.readFile(file, "utf8");
			function fn1() {
				const foo = "{}";
				JSON.parse(foo);
			}
		`,
	],
	invalid: [
		'JSON.parse(await fs.readFile(file, "utf8"));',
		'JSON.parse(await fs.readFile(file, "utf8",));',
		'JSON.parse(await fs.readFile(file, "UTF-8"));',
		'JSON.parse(await fs.readFileSync(file, "utf8"));',
		'JSON.parse(fs.readFileSync(file, "utf8"));',
		'const CHARSET = "UTF8"; JSON.parse(await fs.readFile(file, CHARSET));',
		'const EIGHT = 8; JSON.parse(await fs.readFile(file, `utf${EIGHT}`));',
		'JSON.parse(await fs["readFile"](file, "utf8"));',
		'JSON.parse(await fs.readFile(file, {encoding: "utf8"}));',
		'const EIGHT = 8; JSON.parse(await fs.readFile(file, {encoding: `utf${EIGHT}`}));',
		'JSON.parse(await fs.readFile(file, {...({encoding: "utf8"})}));',
		'const encoding = "utf8";JSON.parse(await fs.readFile(file, {encoding}));',
		'const CHARSET = "utF-8", readingOptions = {encoding: CHARSET}; JSON.parse(await fs.readFile(file, readingOptions));',
		'const EIGHT = 8, ENCODING = "encoding"; JSON.parse(await fs.readFile(file, {[ENCODING]: `utf${EIGHT}`}));',
		outdent`
			const string = await fs.readFile(file, "utf8");
			JSON.parse(string);
		`,
		outdent`
			let string = await fs.readFile(file, "utf8");
			JSON.parse(string);
		`,
		outdent`
			const foo = await await fs.readFile(file, "utf8");
			const bar = await await foo;
			const baz = await bar;
			JSON.parse(baz);
		`,
		outdent`
			var foo = await fs.readFile(file, "utf8");
			let bar = await foo;
			const baz = await bar;
			JSON.parse(baz);
		`,
		outdent`
			const foo = fs.readFile(file, "utf8");
			async function fn1() {
				const bar = await foo;

				function fn2() {
					const baz = bar;
					JSON.parse(baz);
				}
			}
		`,
		outdent`
			const buffer = fs.readFile(file, "utf8"); /* Should report */
			const foo = buffer;
			async function fn1() {
				const buffer = fs.readFile(file, "utf8"); /* Should NOT report */
				JSON.parse(await foo);
			}
		`,
		outdent`
			const buffer = fs.readFile(file, "utf8"); /* Should report */
			const foo = buffer;
			async function fn1() {
				const buffer = fs.readFile(file, "utf8"); /* Should NOT report */
				const baz = foo;
				for (;;) {
					const buffer = fs.readFile(file, "utf8"); /* Should NOT report */
					JSON.parse(await baz);
				}
			}
		`,
		outdent`
			const foo = fs.readFile(file, "utf8");
			function fn1() {
				JSON.parse(foo);

				function fn2() {
					const foo = "{}";
				}
			}
		`,
		// Maybe false positive, we can trace the callee if necessary
		outdent`
			const string = await NOT_A_FS_MODULE.readFile(file, "utf8");
			JSON.parse(string);
		`,
	],
});
