/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'JSON.parse(await fs.readFile(file, "buffer"));',
		'JSON.parse(await fs.readFile(file, "gbk"));',
		'JSON.parse(await fs.readFile(file, ));',
		'JSON.parse?.(await fs.readFile(file, "utf8"));',
		'JSON?.parse(await fs.readFile(file, "utf8"));',
		'window.JSON.parse(await fs.readFile(file, "utf8"));',
		'JSON.stringify(await fs.readFile(file, "utf8"));',
		'NOT_JSON.parse(await fs.readFile(file, "utf8"));',
		'for (const string of []) JSON.parse(string);',
		'JSON.parse(await fs.readFile(file, "utf8"), extraArgument);',
		'JSON.parse(foo);',
		'JSON.parse();',
		outdent`
			const {string} = await fs.readFile(file, "utf8");
			JSON.parse(string);
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
	],
	invalid: [
		'JSON.parse(await fs.readFile(file, "utf8"));',
		'JSON.parse(await fs.readFile(file, "utf8",));',
		'JSON.parse(await fs.readFile(file, "UTF-8"));',
		'JSON.parse(await fs.readFileSync(file, "utf8"));',
		'JSON.parse(fs.readFileSync(file, "utf8"));',
		'const CHARSET = "UTF8"; JSON.parse(await fs.readFile(file, CHARSET));',
		'const EIGHT = 8; JSON.parse(await fs.readFile(file, `utf${EIGHT}`));',
		outdent`
			const string = await fs.readFile(file, "utf8");
			JSON.parse(string);
		`,
		outdent`
			let string = await fs.readFile(file, "utf8");
			JSON.parse(string);
		`,
		outdent`
			const foo = await fs.readFile(file, "utf8");
			const bar = await foo;
			const baz = await bar;
			JSON.parse(baz);
		`,
		outdent`
			var foo = await fs.readFile(file, "utf8");
			let bar = await foo;
			const baz = await bar;
			JSON.parse(baz);
		`,
		// Maybe false positive, we can trace the callee if necessary
		outdent`
			const string = await NOT_A_FS_MODULE.readFile(file, "utf8");
			JSON.parse(string);
		`,
	],
});
