import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function foo() {
				array.push(value);
				return;
			}
		`,
		outdent`
			function foo() {
				array.unshift(value);
				return;
			}
		`,
		outdent`
			function foo() {
				return array.length + 1;
			}
		`,
		outdent`
			function foo() {
				return array.push();
			}
		`,
		outdent`
			function foo() {
				return array.unshift();
			}
		`,
		outdent`
			function foo() {
				return stream.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this.stream.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdin.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdout.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stderr.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return stream?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdin?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return array['push'](value);
			}
		`,
		outdent`
			function foo() {
				return array['unshift'](value);
			}
		`,
		outdent`
			function foo() {
				return array[push](value);
			}
		`,
		outdent`
			function foo() {
				return array[unshift](value);
			}
		`,
		outdent`
			function foo() {
				return push(value);
			}
		`,
		outdent`
			function foo() {
				return unshift(value);
			}
		`,
		outdent`
			function foo() {
				array?.push(value);
			}
		`,
		outdent`
			function foo() {
				array?.unshift(value);
			}
		`,
	],
	invalid: [
		'const length = array.push(value);',
		'const length = array.unshift(value);',
		'const length = stream.unshift(chunk);',
		'console.log(array.push(value));',
		'console.log(array.unshift(value));',
		'void array.push(value);',
		'void array.unshift(value);',
		'const length = await array.push(value);',
		'const length = await array.unshift(value);',
		'async function foo() { await array.push(value); }',
		'async function foo() { await array.unshift(value); }',
		'(array.push(value), sideEffect());',
		'(array.unshift(value), sideEffect());',
		'(sideEffect(), array.push(value));',
		'(sideEffect(), array.unshift(value));',
		'condition && array.push(value);',
		'condition && array.unshift(value);',
		'array.push(value) && sideEffect();',
		'array.unshift(value) && sideEffect();',
		'condition || array.push(value);',
		'condition || array.unshift(value);',
		'array.push(value) || sideEffect();',
		'array.unshift(value) || sideEffect();',
		'condition ?? array.push(value);',
		'condition ?? array.unshift(value);',
		'array.push(value) ?? sideEffect();',
		'array.unshift(value) ?? sideEffect();',
		'condition ? array.push(value) : sideEffect();',
		'condition ? array.unshift(value) : sideEffect();',
		'condition ? sideEffect() : array.push(value);',
		'condition ? sideEffect() : array.unshift(value);',
		'array.push(value) ? sideEffect() : other();',
		'array.unshift(value) ? sideEffect() : other();',
		'for (array.push(value); condition; ) {}',
		'for (; array.push(value); ) {}',
		'for (; condition; array.unshift(value)) {}',
		'for (; array.unshift(value); ) {}',
		outdent`
			function foo() {
				return array.push(value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return (array.push(value));
			}
		`,
		outdent`
			function foo() {
				return (array.unshift(value));
			}
		`,
		outdent`
			function foo() {
				return array?.push(value);
			}
		`,
		outdent`
			function foo() {
				return array?.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push?.(value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift?.(value);
			}
		`,
		outdent`
			async function foo() {
				return await array.push(value);
			}
		`,
		outdent`
			async function foo() {
				return await array.unshift(value);
			}
		`,
		'const foo = value => array.push(value);',
		'const foo = value => array.unshift(value);',
		outdent`
			const foo = async value => array.push(await value);
		`,
		outdent`
			const foo = async value => array.unshift(await value);
		`,
		outdent`
			function foo() {
				return /* comment */ array.push(value);
			}
		`,
		outdent`
			function foo() {
				return /* comment */ array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(/* comment */ value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift(/* comment */ value);
			}
		`,
		outdent`
			function foo() {
				if (condition) return array.push(value);
			}
		`,
		outdent`
			function foo() {
				if (condition) return array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return condition && array.push(value);
			}
		`,
		outdent`
			function foo() {
				return condition && array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return condition ? array.push(value) : value;
			}
		`,
		outdent`
			function foo() {
				return condition ? array.unshift(value) : value;
			}
		`,
		outdent`
			function foo() {
				return condition ? value : array.push(value);
			}
		`,
		outdent`
			function foo() {
				return condition ? value : array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return (sideEffect(), array.push(value));
			}
		`,
		outdent`
			function foo() {
				return (sideEffect(), array.unshift(value));
			}
		`,
		outdent`
			function foo() {
				foo()
				return [array].push(value);
			}
		`,
		outdent`
			function foo() {
				foo()
				return [array].unshift(value);
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.push(value) as number;',
		'array.unshift(value) as number;',
		'<number>array.push(value);',
		'<number>array.unshift(value);',
		'array.push(value)!;',
		'array.unshift(value)!;',
		'array.push(value) satisfies number;',
		'array.unshift(value) satisfies number;',
	],
	invalid: [
		'const foo = (value: string) => array.push(value);',
		'const foo = (value: string) => array.unshift(value);',
		outdent`
			function foo() {
				return array.push(value) as number;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value) as number;
			}
		`,
		outdent`
			function foo() {
				return <number>array.push(value);
			}
		`,
		outdent`
			function foo() {
				return <number>array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(value)!;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value)!;
			}
		`,
		outdent`
			function foo() {
				return array.push(value) satisfies number;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value) satisfies number;
			}
		`,
		'const foo = (value: string) => array.push(value) satisfies number;',
		'const foo = (value: string) => array.unshift(value) satisfies number;',
	],
});
