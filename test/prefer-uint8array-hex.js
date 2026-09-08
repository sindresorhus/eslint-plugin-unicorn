import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const encode = 'byte => byte.toString(16).padStart(2, \'0\')';
const decode = 'pair => Number.parseInt(pair, 16)';
const error = {messageId: 'prefer-uint8array-hex/error'};
const suggestion = {messageId: 'prefer-uint8array-hex/suggestion'};
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

testRule({
	valid: [
		'Uint8Array.fromHex(\'ff\').toString(\'hex\')',
		'Uint8Array.fromBase64(\'AA==\').toString(\'hex\')',
		`Array.from(Array(0, 255), ${encode}).join('')`,
		'Array(0, 255).toString(\'hex\')',
		'class Bytes extends Buffer { hex() { return super.toString(\'hex\'); } }',
		...[
			`new Uint8Array(super.match(/.{2}/g).map(${decode}))`,
			`Uint8Array.from(super.match(/.{2}/g).map(${decode}))`,
			`Uint8Array.from(super.match(/.{2}/g), ${decode})`,
		].map(expression => `class Hex extends String { decode() { return ${expression}; } }`),
		typeAware('class Buffer { toString(encoding: string) {} } class Bytes extends Buffer { hex() { return super.toString(\'hex\'); } }'),
		`Array.from(object?.bytes, ${encode}).join('')`,
		`new Uint8Array((object?.text).match(/.{2}/g).map(${decode}))`,
	],
	invalid: [
		{
			code: `const bytes = new Uint8Array([0, 255]); [...bytes].map(${encode}).join('');`,
			output: 'const bytes = new Uint8Array([0, 255]); bytes.toHex();',
			errors: [error],
		},
		{
			code: `[...bytes].map(${encode}).join('')`,
			errors: [{...error, suggestions: [{...suggestion, output: 'bytes.toHex()'}]}],
		},
		{
			code: `Array.from(new Uint8Array, ${encode}).join('')`,
			output: '(new Uint8Array).toHex()',
			errors: [error],
		},
		{
			code: `Array.from(condition ? new Uint8Array([255]) : [255], ${encode}).join('')`,
			errors: [{...error, suggestions: [{...suggestion, output: '(condition ? new Uint8Array([255]) : [255]).toHex()'}]}],
		},
		{
			code: 'Buffer.from(new Uint8Array([255])).toString(\'hex\')',
			output: 'new Uint8Array([255]).toHex()',
			errors: [error],
		},
		{
			code: 'new Buffer([255]).toString(\'hex\')',
			output: 'new Buffer([255]).toHex()',
			errors: [error],
		},
		{
			code: 'const buffer = new Buffer([255]); buffer.toString(\'hex\')',
			output: 'const buffer = new Buffer([255]); buffer.toHex()',
			errors: [error],
		},
		{
			code: `Array.from(new Buffer([255]), ${encode}).join('')`,
			output: 'new Buffer([255]).toHex()',
			errors: [error],
		},
		{
			code: 'import {Buffer as Bytes} from \'node:buffer\'; new Bytes([255]).toString(\'hex\')',
			output: 'import {Buffer as Bytes} from \'node:buffer\'; new Bytes([255]).toHex()',
			errors: [error],
		},
		{
			code: 'Buffer.from(buffer, offset, length).toString(\'hex\')',
			output: 'Buffer.from(buffer, offset, length).toHex()',
			errors: [error],
		},
		{
			code: 'Buffer.from(text, \'hex\')',
			errors: [{...error, suggestions: [{...suggestion, output: 'Uint8Array.fromHex(text)'}]}],
		},
		{
			code: `new Uint8Array(text.match(/.{2}/g).map(${decode}))`,
			errors: [{...error, suggestions: [{...suggestion, output: 'Uint8Array.fromHex(text)'}]}],
		},
		...[
			'Buffer.from((sideEffect(), text), \'hex\')',
			`new Uint8Array((sideEffect(), text).match(/.{2}/g).map(${decode}))`,
		].map(code => ({
			code,
			errors: [{...error, suggestions: [{...suggestion, output: 'Uint8Array.fromHex((sideEffect(), text))'}]}],
		})),
		{
			code: 'Buffer.from(text, \'hex\')?.toString()',
			errors: [{...error, suggestions: []}],
		},
		{
			code: `function hex(bytes: Uint8Array | number[]) { return Array.from(bytes, ${encode}).join(''); }`,
			languageOptions: {parser: parsers.typescript},
			errors: [{...error, suggestions: [{...suggestion, output: 'function hex(bytes: Uint8Array | number[]) { return bytes.toHex(); }'}]}],
		},
		{
			...typeAware(`function hex(value: {bytes: Uint8Array | number[]}) { return Array.from(value.bytes, ${encode}).join(''); }`),
			errors: [{...error, suggestions: [{...suggestion, output: 'function hex(value: {bytes: Uint8Array | number[]}) { return value.bytes.toHex(); }'}]}],
		},
		{
			...typeAware('interface Buffer extends Uint8Array { toString(encoding?: string): string; } function hex(value: {bytes: Buffer}) { return value.bytes.toString(\'hex\'); }'),
			output: 'interface Buffer extends Uint8Array { toString(encoding?: string): string; } function hex(value: {bytes: Buffer}) { return value.bytes.toHex(); }',
			errors: [error],
		},
	],
});

testRule.snapshot({
	valid: [
		'bytes.toHex()',
		'Uint8Array.fromHex(text)',
		`bytes.map(${encode}).join('')`,
		`new Uint8Array([255]).map(${encode}).join('')`,
		...[16, 3].map(width => `[...bytes].map(byte => byte.toString(16).padStart(${width}, '0')).join('')`),
		'[...bytes].map(byte => byte.toString(10).padStart(2, \'0\')).join(\'\')',
		'[...bytes].map(byte => byte.toString(16).padStart(2, \' \')).join(\'\')',
		'[...bytes].map(byte => other.toString(16).padStart(2, \'0\')).join(\'\')',
		'[...bytes].map(async byte => byte.toString(16).padStart(2, \'0\')).join(\'\')',
		'[...bytes].map(function * (byte) { return byte.toString(16).padStart(2, \'0\'); }).join(\'\')',
		'[...bytes].map((byte = sideEffect()) => byte.toString(16).padStart(2, \'0\')).join(\'\')',
		'[...bytes].map(byte => { sideEffect(); return byte.toString(16).padStart(2, \'0\'); }).join(\'\')',
		`[...bytes].map(${encode}, sideEffect()).join('')`,
		`[...bytes].map(${encode}).join('-')`,
		`[...bytes].map(${encode}).join()`,
		`[...bytes, 1].map(${encode}).join('')`,
		`[...bytes].map(${encode})?.join('')`,
		`[...bytes]?.map(${encode}).join('')`,
		`[...bytes].map?.(${encode}).join('')`,
		`[...bytes]['map'](${encode}).join('')`,
		`Array.from(bytes, ${encode}, sideEffect()).join('')`,
		`Array.from?.(bytes, ${encode}).join('')`,
		...[
			'[0, 255]',
			'new Uint16Array([256])',
			'new Uint8ClampedArray([255])',
			'new Int8Array([-1])',
			'new BigUint64Array([1n])',
			'Uint16Array.of(256)',
			'Uint8ClampedArray.from([255])',
			'new Set([1])',
			'\'text\'',
		].map(receiver => `const bytes = ${receiver}; [...bytes].map(${encode}).join('')`),
		`Array.from(1 + 1, ${encode}).join('')`,
		'(typeof value).toString(\'hex\')',
		'(value++).toString(\'hex\')',
		'(class {}).toString(\'hex\')',
		...['number[]', 'Uint16Array', 'Uint8ClampedArray'].map(type => ({
			code: `function hex(bytes: ${type}) { return Array.from(bytes, ${encode}).join(''); }`,
			languageOptions: {parser: parsers.typescript},
		})),
		'new Uint8Array([255]).toString(\'hex\')',
		'new Date().toString(\'hex\')',
		'({toString() {}}).toString(\'hex\')',
		...['Buffer', 'Array', 'Uint8Array', 'Uint16Array'].map(receiver => `${receiver}.toString('hex')`),
		'import {Buffer as Bytes} from \'node:buffer\'; Bytes.toString(\'hex\')',
		`Array.from(Uint8Array, ${encode}).join('')`,
		'buffer.toString(\'base64\')',
		'buffer.toString(encoding)',
		'buffer.toString(\'hex\', 0, 5)',
		'buffer?.toString(\'hex\')',
		'buffer.toString?.(\'hex\')',
		'buffer[\'toString\'](\'hex\')',
		'Buffer.from(text, \'base64\')',
		'Buffer.from(text, \'hex\', sideEffect())',
		'Buffer.from(...arguments_)',
		'Buffer?.from(text, \'hex\')',
		'Buffer.from?.(text, \'hex\')',
		'Buffer[\'from\'](text, \'hex\')',
		'const Buffer = custom; Buffer.from(text, \'hex\')',
		'import Buffer from \'node:buffer\'; Buffer.from(text, \'hex\')',
		'import {Buffer} from \'custom\'; Buffer.from(text, \'hex\')',
		'text.match(/.{2}/g).map(pair => Number.parseInt(pair, 16))',
		...['/.{2}/', '/.{2}/gy', '/.{2}/dg', '/.{3}/g', '/[a-z]{2}/g', 'pattern'].map(pattern => `new Uint8Array(text.match(${pattern}).map(${decode}))`),
		'new Uint8Array(text.match(/.{2}/g).map(pair => Number.parseInt(pair, 10)))',
		'new Uint8Array(text.match(/.{2}/g).map(pair => Number.parseInt(other, 16)))',
		'new Uint8Array(text.match(/.{2}/g).map(async pair => Number.parseInt(pair, 16)))',
		`new Uint8Array(text.match(/.{2}/g)?.map(${decode}))`,
		`new Uint8Array((text.match(/.{2}/g) || fallback).map(${decode}))`,
		`Uint8Array.from(text.match(/.{2}/g), ${decode}, sideEffect())`,
		typeAware('function hex(value: {toString(encoding: string): string}) { return value.toString(\'hex\'); }'),
	],
	invalid: [
		...[`[...bytes].map(${encode})`, `Array.from(bytes).map(${encode})`, `Array.from(bytes, ${encode})`].flatMap(expression => [
			`${expression}.join('')`,
			`const bytes = new Uint8Array([0, 15, 255]); ${expression}.join('')`,
		]),
		'Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, \'0\'); }).join(\'\')',
		'Array.from(bytes, byte => { return byte.toString(16).padStart(2, \'0\'); }).join(\'\')',
		'Array.from(bytes, (byte) => ((byte).toString(0x10).padStart(2, \'0\'))).join(\'\')',
		`Array.from(bytes, ${encode}).join('').toUpperCase()`,
		`Array.from((condition ? left : right), ${encode}).join('')`,
		`Array.from((sideEffect(), bytes), ${encode}).join('')`,
		`const bytes = new Uint8Array(); const alias = bytes; Array.from(alias, ${encode}).join('')`,
		`const bytes = Uint8Array.of(1, 255); Array.from(bytes, ${encode}).join('')`,
		`const bytes = Uint8Array.from([1, 255]); Array.from(bytes, ${encode}).join('')`,
		`const bytes = Buffer.alloc(2); [...bytes].map(${encode}).join('')`,
		`Array.from(/* keep */ bytes, ${encode}).join('')`,
		'Array.from(bytes, byte => byte.toString(16).padStart(2, /* keep */ \'0\')).join(\'\')',
		`foo()\nArray.from((condition ? new Uint8Array() : new Uint8Array()), ${encode}).join('')`,
		`function hex() { return[...bytes].map(${encode}).join(''); }`,
		{code: `const element = <span>{Array.from(bytes, ${encode}).join('')}</span>`, languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		...['bytes as Uint8Array', '<Uint8Array>bytes', 'bytes!', 'bytes satisfies Uint8Array'].map(expression => ({
			code: `Array.from((${expression}), ${encode}).join('')`,
			languageOptions: {parser: parsers.typescript},
		})),
		{code: `function hex(bytes: Uint8Array<ArrayBuffer>) { return Array.from(bytes, ${encode}).join(''); }`, languageOptions: {parser: parsers.typescript}},
		{code: `import {Buffer as Bytes} from 'node:buffer'; function hex(bytes: Bytes) { return [...bytes].map(${encode}).join(''); }`, languageOptions: {parser: parsers.typescript}},
		typeAware(`function hex(value: {bytes: Uint8Array}) { return Array.from(value.bytes, ${encode}).join(''); }`),
		typeAware('function hex(value: any) { return value.toString(\'hex\'); }'),
		'buffer.toString(\'hex\')',
		'getBuffer().toString(\'HEX\')',
		'Buffer.from(bytes).toString(\'hex\')',
		'Buffer.from(text, \'utf8\').toString(\'hex\')',
		'Buffer.from([256, -1]).toString(\'hex\')',
		'Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(\'hex\')',
		'Buffer.alloc(10).toString(\'hex\')',
		'const buffer = Buffer.from(bytes); buffer.toString(\'hex\')',
		'Buffer.from(bytes).toString(/* keep */ \'hex\')',
		'Buffer.from(/* keep */ new Uint8Array()).toString(\'hex\')',
		{code: '(buffer as Buffer).toString(\'hex\')', languageOptions: {parser: parsers.typescript}},
		...['Buffer', 'globalThis.Buffer', 'global.Buffer', 'window.Buffer', 'self.Buffer'].map(constructor => `${constructor}.from(text, 'hEx')`),
		...['buffer', 'node:buffer'].flatMap(source => [
			`import {Buffer} from '${source}'; Buffer.from(text, 'hex')`,
			`import {Buffer as Bytes} from '${source}'; Bytes.from(new Uint8Array()).toString('hex')`,
		]),
		'Buffer.from(text, \'hex\').toString()',
		'Buffer.from(text, \'hex\').length',
		{code: '(Buffer.from(text, \'hex\') as Buffer).toString()', languageOptions: {parser: parsers.typescript}},
		'Buffer.from(text, /* keep */ \'hex\')',
		'Buffer.from(text, \'hex\',)',
		...['/../g', '/.{2}/g', '/.{1,2}/g', '/[0-9a-f]{2}/gi', String.raw`/[\da-f]{2}/gi`, '/.{2}/gsu', '/.{2}/gv'].map(pattern => `new Uint8Array(text.match(${pattern}).map(${decode}))`),
		`Uint8Array.from(text.match(/.{2}/g).map(${decode}))`,
		`Uint8Array.from(text.match(/.{2}/g), ${decode})`,
		'new Uint8Array(text.match(/.{2}/g).map(pair => parseInt(pair, 16)))',
		'new Uint8Array(text.match(/.{2}/g).map(function (pair) { return parseInt(pair, 16); }))',
		`new Uint8Array((text.match(/.{2}/g) ?? []).map(${decode}))`,
		`Uint8Array.from((text.match(/.{2}/g) || []), ${decode})`,
		`new Uint8Array((getText()).match(/.{2}/g).map(${decode})).buffer`,
		'new Uint8Array(text.match(/.{2}/g).map(pair => parseInt(/* keep */ pair, 16)))',
		...['', 'AaFf', 'f', 'aag1', 'aa bb', '0xff'].map(text => `new Uint8Array('${text}'.match(/.{2}/g).map(${decode}))`),
		{code: `new Uint8Array(text.match(/.{2}/g)!.map(${decode}))`, languageOptions: {parser: parsers.typescript}},
	],
});

test('works with array and number style rules across fixing passes and suggestions', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: Object.fromEntries([
			'prefer-uint8array-hex',
			'prefer-array-from-map',
			'prefer-spread',
			'prefer-number-properties',
			'no-useless-spread',
			'no-new-buffer',
			'no-unsafe-buffer-conversion',
		].map(name => [`unicorn/${name}`, 'error'])),
	};
	const encoded = linter.verifyAndFix(`const bytes = new Uint8Array([0, 255]); Array.from(bytes).map(${encode}).join('');`, config);
	t.is(encoded.output, 'const bytes = new Uint8Array([0, 255]); bytes.toHex();');
	t.deepEqual(encoded.messages, []);

	const decoded = linter.verifyAndFix('new Uint8Array(text.match(/.{2}/g).map(pair => parseInt(pair, 16)))', config);
	t.true(decoded.output.includes('Number.parseInt'));
	const [message] = decoded.messages;
	t.is(message.ruleId, 'unicorn/prefer-uint8array-hex');
	t.is(decoded.messages.length, 1);
	const [{fix}] = message.suggestions;
	const suggested = decoded.output.slice(0, fix.range[0]) + fix.text + decoded.output.slice(fix.range[1]);
	t.is(suggested, 'Uint8Array.fromHex(text)');
	t.deepEqual(linter.verify(suggested, config), []);

	const buffer = linter.verifyAndFix('new Buffer([255]).toString(\'hex\')', config);
	t.is(buffer.output, 'Buffer.from([255]).toHex()');
	t.deepEqual(buffer.messages, []);

	const view = linter.verifyAndFix('Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(\'hex\')', config);
	t.is(view.output, 'Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toHex()');
	t.deepEqual(view.messages, []);
});
