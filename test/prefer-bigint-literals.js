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
		String.raw`BigInt("\u{31}")`,
		'BigInt(!1)',
		'BigInt(~1)',
		'BigInt("++1")',
		'BigInt("+ 1")',
		'BigInt(void 0)',
		'BigInt(NaN)',
		'BigInt(Infinity)',
		'BigInt(-Infinity)',
		'BigInt(BigInt)',
		'BigInt(globalThis.x)',
		'BigInt(x)',
		'BigInt?.("1")',
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
		'BigInt("-1")',
		'BigInt("+1")',
		'BigInt(-1)',
		'BigInt(+1)',
		'-BigInt(-1)',
		'-BigInt("-1")',
		'-BigInt(1)',
		'-BigInt("1")',
		'BigInt(" +1 ")',
		'BigInt(" -1 ")',
		`
		foo
		BigInt("-1")
		`,
		'-BigInt("+1")',
		'-BigInt(/* comment */-1)',
		'-(BigInt(-1))',
		'2n - BigInt("-1")',
		'2n -BigInt("-1")',
		'BigInt(-1).toString()',
		'functionCall(-BigInt(1))',
		'obj[BigInt(1)]',
		'arr[BigInt(0)]',
		'void BigInt(1)',
		'typeof BigInt(1)',
		'BigInt(1) + BigInt(2)',
		'BigInt(1) ** 2n',
		'condition ? BigInt(1) : BigInt(2)',
		'+BigInt(1)',
		'+BigInt(-1)',
		'+BigInt("1")',
		'BigInt(+0)',
		'BigInt(-0)',
		'BigInt("+0")',
		'-BigInt("-0")',
		'1n - (( BigInt("-1") ))',
		'BigInt(-(+(-10)))',
	],
});

test({
	valid: [],
	invalid: [
		// A bigint literal can not have leading zeros
		{
			code: 'BigInt("00001");',
			output: '1n;',
			errors: 1,
		},
		{
			code: 'BigInt("007");',
			output: '7n;',
			errors: 1,
		},
		{
			code: 'BigInt("-00001");',
			output: '(-1n);',
			errors: 1,
		},
		{
			code: 'BigInt("  00001  ");',
			output: '1n;',
			errors: 1,
		},
		{
			code: 'BigInt("-0");',
			output: '0n;',
			errors: 1,
		},
		...[
			// A leading zero with a non-octal digit is a legacy octal literal, not a bigint literal
			'08',
			'09',
			'080',
			'0000008',
		].map(text => ({
			code: `BigInt("${text}");`,
			output: `${BigInt(text)}n;`,
			errors: 1,
		})),
		// `String(1e+21)` is also `1e+21`, but `1e+21n` is not a bigint literal
		{
			code: 'BigInt(1e+21);',
			errors: [{
				messageId: 'prefer-bigint-literals/error',
				suggestions: [{
					messageId: 'prefer-bigint-literals/suggestion',
					output: '1000000000000000000000n;',
				}],
			}],
		},
	],
});
