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
				return array[push](value);
			}
		`,
		outdent`
			function foo() {
				return push(value);
			}
		`,
		outdent`
			function foo() {
				return condition && array.push(value);
			}
		`,
		outdent`
			function foo() {
				return condition ? array.push(value) : value;
			}
		`,
		outdent`
			function foo() {
				return (sideEffect(), array.push(value));
			}
		`,
	],
	invalid: [
		outdent`
			function foo() {
				return array.push(value);
			}
		`,
		outdent`
			function foo() {
				return (array.push(value));
			}
		`,
		outdent`
			function foo() {
				return array?.push(value);
			}
		`,
		outdent`
			function foo() {
				return array.push?.(value);
			}
		`,
		'const foo = value => array.push(value);',
		outdent`
			const foo = async value => array.push(await value);
		`,
		outdent`
			function foo() {
				return /* comment */ array.push(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(/* comment */ value);
			}
		`,
		outdent`
			function foo() {
				if (condition) return array.push(value);
			}
		`,
		outdent`
			function foo() {
				foo()
				return [array].push(value);
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
	valid: [],
	invalid: [
		'const foo = (value: string) => array.push(value);',
		outdent`
			function foo() {
				return array.push(value) as number;
			}
		`,
		outdent`
			function foo() {
				return <number>array.push(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(value)!;
			}
		`,
		'const foo = (value: string) => array.push(value) satisfies number;',
	],
});
