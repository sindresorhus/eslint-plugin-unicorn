import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-ternary');

const errors = [{messageId: 'prefer-ternary'}];
const onlySingleLineOptions = ['only-single-line'];

// Destructuring assignments
test({
	valid: [
		...[
			['[a, b]', '[a, c]'],
			['[a, b]', '[b, a]'],
			['[a = 1]', '[a = 2]'],
			['[a, ...rest]', '[a, ...other]'],
			['[a]', '{a}'],
			['{a, b}', '{b, a}'],
			['{key: a}', '{other: a}'],
			['{a = 1}', '{a = 2}'],
			['{[key]: a}', '{[other]: a}'],
		].map(([consequent, alternate]) => `if (test) { (${consequent} = first); } else { (${alternate} = second); }`),
		'if (test) { [a /* comment */] = first; } else { [a] = second; }',
		'if (test) { ({a} = first); } else { ({a /* comment */} = second); }',
		'if (test) { [a] = first ? second : third; } else { [a] = other; }',
		'if (test ? first : second) { [a] = first; } else { [a] = second; }',
		'if (test) { [a] = first; } else { [a] = format({\nvalue: second,\n}); }',
		'if (test) { [a] = items.map(item => { return item; }); } else { [a] = second; }',
		'let [a] = first; if (test) { [a] = second; }',
		{
			code: 'if (test) { [a,\nb] = first; } else { [a, b] = second; }',
			options: onlySingleLineOptions,
		},
		{
			code: 'if (test) { [a] = format(\nfirst\n); } else { [a] = second; }',
			options: onlySingleLineOptions,
		},
	],
	invalid: [
		{
			code: outdent`
				let r, g, b;
				if (Y > 1) {
					[r, g, b] = RGB.map((c) => (c > 0 ? c / 255 : 0));
				} else {
					[r, g, b] = RGB;
				}
			`,
			output: 'let r, g, b;\n[r, g, b] = Y > 1 ? RGB.map((c) => (c > 0 ? c / 255 : 0)) : RGB;',
			errors,
		},
		...[
			'[a, b]',
			'[a, {b}]',
			'[a = fallback(), ...rest]',
			'[object.value, object[key]]',
			'[a, , b]',
			'[]',
			'{a, b}',
			'{key: a, nested: {b}}',
			'{a = fallback(), ...rest}',
			'{[getKey()]: object.value}',
			'{}',
		].map(pattern => ({
			code: `if (test) { (${pattern} = first); } else { (${pattern} = second); }`,
			output: pattern.startsWith('{') ? `(${pattern} = test ? first : second);` : `${pattern} = test ? first : second;`,
			errors,
		})),
		{
			code: 'if (test) { [ a, b ] = first; } else { [a,b] = second; }',
			output: '[ a, b ] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) { ({ a, b } = first); } else { ({a,b} = second); }',
			output: '({ a, b } = test ? first : second);',
			errors,
		},
		{
			code: 'if (test) { [a,\nb] = first; } else { [a, b] = second; }',
			output: '[a,\nb] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) {\r\n  [a, b] = first;\r\n} else {\r\n  [a, b] = second;\r\n}',
			output: '[a, b] = test ? first : second;',
			errors,
		},
		{
			code: 'if (test) { [a, b] = first; } else { [a, b] = second; }',
			output: '[a, b] = test ? first : second;',
			options: onlySingleLineOptions,
			errors,
		},
		{
			code: 'run()\nif (test) { [a] = first; } else { [a] = second; }',
			output: 'run()\n;[a] = test ? first : second;',
			errors,
		},
		{
			code: 'run()\nif (test) { ({a} = first); } else { ({a} = second); }',
			output: 'run()\n;({a} = test ? first : second);',
			errors,
		},
		{
			code: 'if (test) { [a] = first; /* eslint-disable no-alert */ } else { [a] = second; }',
			output: null,
			errors,
		},
		...[
			['[value!]', '[value!] = test ? (first as number[]) : second;'],
			['[(object as Value).value]', '[(object as Value).value] = test ? (first as number[]) : second;'],
			['{value: object.value!}', '({value: object.value!} = test ? (first as number[]) : second);'],
		].map(([pattern, output]) => ({
			code: `if (test) { (${pattern} = (first as number[])); } else { (${pattern} = second); }`,
			output,
			languageOptions: {parser: parsers.typescript},
			errors,
		})),
	],
});
