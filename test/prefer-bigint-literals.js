import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'1n',
		'BigInt()',
		'BigInt(1, 1)',
		'BigInt(...[1])',
		'BigInt(true)',
		'BigInt(null)',
		'new BigInt(1)',
		'Not_BigInt(1)',
		'BigInt("1.0")',
		'BigInt("1.1")',
		'BigInt("1e3")',
		'BigInt(`1`)',
		'BigInt("1" + "2")',
		'BigInt?.(1)',
		'BigInt(1.1)',
		'typeof BigInt',
		'BigInt(1n)',
		'BigInt("not-number")',
		'BigInt("1_2")',
		'BigInt("1\\\n2")',
		'BigInt("1\\\n2")',
		String.raw`BigInt("\u{31}")`,
	],
	invalid: [
		'BigInt("0")',
		'BigInt("  0  ")',
		'BigInt("9007199254740993")',
		'BigInt("0B11")',
		'BigInt("0O777")',
		'BigInt("0XFe")',
		`BigInt("${'9'.repeat(100)}")`,
		'BigInt(0)',
		'BigInt(0B11_11)',
		'BigInt(0O777_777)',
		'BigInt(0XFe_fE)',
		// Legacy octal literals
		...[
			'BigInt(0777)',
			'BigInt(0888)',
		].map(code => ({code, languageOptions: {sourceType: 'script'}})),
		// Not fixable
		'BigInt(9007199254740993)',
		'BigInt(0x20000000000001)',
		'BigInt(9_007_199_254_740_993)',
		'BigInt(0x20_00_00_00_00_00_01)',
		'BigInt(1.0)',
		'BigInt(1e2)',
		'BigInt(/* comment */1)',
		`BigInt(${'9'.repeat(100)})`,
	],
});
