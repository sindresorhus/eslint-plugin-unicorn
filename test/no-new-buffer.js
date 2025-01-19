import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const buffer = Buffer',
		'const buffer = new NotBuffer(1)',
		'const buffer = Buffer.from(\'buf\')',
		'const buffer = Buffer.from(\'7468697320697320612074c3a97374\', \'hex\')',
		'const buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
		'const buffer = Buffer.alloc(10)',
	],
	invalid: [
		// `new Buffer(array)`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_array
		'const buffer = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
		'const buffer = new Buffer([0x62, bar])',
		outdent`
			const array = [0x62];
			const buffer = new Buffer(array);
		`,

		// `new Buffer(arrayBuffer[, byteOffset[, length]])`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_arraybuffer_byteoffset_length
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer);
		`,
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer, 0, );
		`,
		outdent`
			const arrayBuffer = new ArrayBuffer(10);
			const buffer = new Buffer(arrayBuffer, 0, 2);
		`,

		// `new Buffer(size)`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_size
		'const buffer = new Buffer(10);',
		outdent`
			const size = 10;
			const buffer = new Buffer(size);
		`,
		'new Buffer(foo.length)',
		'new Buffer(Math.min(foo, bar))',

		// `new Buffer(string[, encoding])`
		// https://nodejs.org/api/buffer.html#buffer_new_buffer_string_encoding
		'const buffer = new Buffer("string");',
		'const buffer = new Buffer("7468697320697320612074c3a97374", "hex")',
		outdent`
			const string = "string";
			const buffer = new Buffer(string);
		`,
		// eslint-disable-next-line no-template-curly-in-string
		'const buffer = new Buffer(`${unknown}`)',

		// Unknown
		'const buffer = new (Buffer)(unknown)',
		'const buffer = new Buffer(unknown, 2)',
		'const buffer = new Buffer(...unknown)',

		// `ReturnStatement`
		outdent`
			() => {
				return new // 1
					Buffer();
			}
		`,
		outdent`
			() => {
				return (
					new // 2
						Buffer()
				);
			}
		`,
		outdent`
			() => {
				return new // 3
					(Buffer);
			}
		`,
		outdent`
			() => {
				return new // 4
					Buffer;
			}
		`,
		outdent`
			() => {
				return (
					new // 5
						Buffer
				);
			}
		`,
		outdent`
			() => {
				return (
					new // 6
						(Buffer)
				);
			}
		`,

		// Misc
		'const buffer = new /* comment */ Buffer()',
		'const buffer = new /* comment */ Buffer',
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'new Buffer(input, encoding);',
			output: 'Buffer.from(input, encoding);',
			errors: 1,
		},
	],
});
