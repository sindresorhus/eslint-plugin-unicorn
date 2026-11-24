import {fileURLToPath} from 'node:url';
import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fileURLToPath(new URL('../', import.meta.url)),
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'test/fixtures/prefer-map-get/tsconfig.json',
			},
		},
	},
});

const globalScript = typeAware(outdent`
	const map = new Map([['key', 'value']]);
	if (map.has('key')) {
		const name = map.get('key');
		console.log(name);
	}
`);

test({
	valid: [],
	invalid: [
		{
			...globalScript,
			languageOptions: {...globalScript.languageOptions, globals: {name: 'off'}},
			errors: [{messageId: 'prefer-map-get', suggestions: 0}],
		},
		{
			...typeAware('function read(map: WeakMap<object, number>, key: object) {\r\n  if (map.has(key)) {\r\n    const entry = map.get(key);\r\n    use(entry);\r\n  }\r\n}'),
			errors: [{
				messageId: 'prefer-map-get',
				suggestions: [{
					messageId: 'reuseGetResult',
					output: 'function read(map: WeakMap<object, number>, key: object) {\r\n  const entry = map.get(key);\r\n  if (entry !== undefined) {\r\n    use(entry);\r\n  }\r\n}',
				}],
			}],
		},
		{
			...typeAware('function read(map: Map<string, number>, key: string) { if (map.has(key)) { const entry = map.get(key);use(entry); } }'),
			errors: [{
				messageId: 'prefer-map-get',
				suggestions: [{
					messageId: 'reuseGetResult',
					output: 'function read(map: Map<string, number>, key: string) { const entry = map.get(key); if (entry !== undefined) { use(entry); } }',
				}],
			}],
		},
	],
});

test.snapshot({
	valid: [
		'const map = new Map(); if (map.has(key)) { const entry = map.get(key); use(entry); }',
		{
			code: 'declare const map: Map<string, number>; if (map.has("key")) { const entry = map.get("key"); use(entry); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const map: Map<string, number | undefined>; if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number | null>; if (map.has("key")) { const entry = map.get("key")!; entry.toFixed(); }'),
		typeAware(outdent`
			declare const map: Map<string, number>;
			declare const key: string;
			if (map.has(key)) {
				const entry = map.get(key as LocalKey);
				type LocalKey = typeof key;
				use(entry);
			}
		`),
		typeAware(outdent`
			declare const map: Map<string, number>;
			declare const key: string;
			if (map.has(key)) {
				const entry = (map as LocalMap).get(key);
				type LocalMap = typeof map;
				use(entry);
			}
		`),
		typeAware('declare const map: Map<undefined, undefined>; if (map.has(undefined)) { const entry = map.get(undefined); use(entry); }'),
		typeAware('declare const map: Map<string, unknown>; if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('function read<Value>(map: Map<string, Value>, key: string) { if (map.has(key)) { const entry = map.get(key); use(entry); } }'),
		typeAware('function read<Value extends number | undefined>(map: Map<string, Value | null>, key: string) { if (map.has(key)) { const entry = map.get(key); use(entry); } }'),
		typeAware('const map = new Map(); if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, void>; if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has("key")) { const entry = map.get("other"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; declare const other: Map<string, number>; if (map.has("key")) { const entry = other.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has("key")) { log(); const entry = map.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has(getKey())) { const entry = map.get(getKey()); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has(object.key)) { const entry = map.get(object.key); use(entry); }'),
		typeAware('declare const map: Map<RegExp, number>; if (map.has(/key/)) { const entry = map.get(/key/); use(entry); }'),
		typeAware('declare const map: Map<string, number> | undefined; if (map?.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has("key")) { const entry = map.get?.("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; if (map.has("key") && ready) { const entry = map.get("key"); use(entry); }'),
		typeAware('export {}; interface Map { has(key: string): boolean; get(key: string): number; } declare const map: Map; if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
		typeAware('class Cache extends Map<string, number> {} const cache = new Cache(); if (cache.has("key")) { const entry = cache.get("key"); use(entry); }'),
		typeAware('declare const map: Map<string, number>; const key = "key"; if (map.has(key)) { const entry = map.get(key); use(entry); const key = "other"; }'),
		typeAware('declare const map: Map<string, number>; if (map.get("key") !== undefined) { use(); }'),
	],
	invalid: [
		typeAware(outdent`
			export {};
			const map = new Map([[undefined, 0]]);
			if (map.has(undefined)) {
				const entry = map.get(undefined);
				use(entry);
			} else {
				missing();
			}
		`),
		typeAware('export {}; declare const map: ReadonlyMap<string, false | null>; if (map.has(`key`)) { const entry = map.get("key"); use(entry); }'),
		typeAware('function read<Value extends number | null>(map: Map<string, Value>, key: string) { if (map.has(key)) { const entry = map.get(key); use(entry); } }'),
		typeAware(outdent`
			function read(map: Map<string, number>, key: string, undefined: number) {
				if (map.has(key)) {
					const entry = map.get(key)!;
					use(entry, undefined);
				}
			}
		`),
		typeAware('export {}; declare const map: Map<string, number>; if (map.has("key")) { const entry = map.get("key"); use(entry); } use(entry);'),
		typeAware('export {}; declare const map: Map<string, number>; if (map.has(/* comment */ "key")) { const entry = map.get("key"); use(entry); }'),
		typeAware(outdent`
			export {};
			declare const map: Map<string, number>;
			if (map.has('key')) {
				// @ts-expect-error
				const entry = map.get('key');
				use(entry);
			}
		`),
		typeAware(outdent`
			export {};
			declare const map: Map<string, number>;
			// @ts-ignore
			if (map.has('key')) {
				const entry = map.get('key');
				use(entry);
			}
		`),
		typeAware('declare const map: Map<string, number>; if (ready) { start(); } else if (map.has("key")) { const entry = map.get("key"); use(entry); }'),
	],
});
