import nodeTest from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'!a && b ? x : y',
		'!a || b ? x : y',
		'!a && (!b || !c) ? x : y',
		'!a || (!b && !c) ? x : y',
		'!a && !b || !c ? x : y',
		'!a ?? !b ? x : y',
		'if (!a && !b) {x();}',
		'if (!a || !b) {x();} else if (c) {y();}',
	],
	invalid: [
		['!a && !b ? x : y', 'a || b ? y : x'],
		['!a || !b ? x : y', 'a && b ? y : x'],
		['a != null && b != null ? x : y', 'a == null || b == null ? y : x'],
		['a !== b || c !== d ? x : y', 'a === b && c === d ? y : x'],
		['!a && b !== c && d != e ? x : y', 'a || b === c || d == e ? y : x'],
		['!a || !b || !c ? x : y', 'a && b && c ? y : x'],
		['!({}) && !b ? x : y', '({}) || b ? y : x'],
		['const f = () => !({}) && !b ? x : y', 'const f = () => ({}) || b ? y : x'],
		['!a && (!b && !c) ? x : y', 'a || (b || c) ? y : x'],
		['(!a || !b) || !c ? x : y', '(a && b) && c ? y : x'],
		['if (!a || !b) {x();} else {y();}', 'if (a && b) {y();} else {x();}'],
		['if (!a && !b) x(); else y();', 'if (a || b) {y();} else {x();}'],
		['if (a) {x();} else if (!b && !c) {y();} else {z();}', 'if (a) {x();} else if (b || c) {z();} else {y();}'],
		['!(a || b) && !c ? x : y', '(a || b) || c ? y : x'],
		['! /* first */ a && /* operator */ !b ? /* then */ x : /* else */ y', ' /* first */ a || /* operator */ b ? /* else */ y : /* then */ x'],
		['function f() {return!a && !b ? x : y;}', 'function f() {return a || b ? y : x;}'],
		['function f() {return !\n a && !b ? x : y;}', 'function f() {return ( \n a || b ? y : x);}'],
		['function f() {throw !\n a || !b ? x : y;}', 'function f() {throw ( \n a && b ? y : x);}'],
		['function* f() {yield!a && !b ? x : y;}', 'function* f() {yield a || b ? y : x;}'],
		['function* f() {yield (!\n a && !b ? x : y);}', 'function* f() {yield (\n a || b ? y : x);}'],
		['function* f() {yield (!\n a) && !b ? x : y;}', 'function* f() {yield (\n a) || b ? y : x;}'],
		['function* f() {yield* !\n a && !b ? x : y;}', 'function* f() {yield* \n a || b ? y : x;}'],
		['foo()\n![] && !b ? x : y', 'foo()\n;[] || b ? y : x'],
		['foo()\n!(a) || !b ? x : y', 'foo()\n;(a) && b ? y : x'],
		['if (!(a || b) && !c) {x();} else {y();}', 'if ((a || b) || c) {y();} else {x();}'],
		['if (!a\r\n    && !b) {\r\n    x();\r\n} else {\r\n    y();\r\n}', 'if (a\r\n    || b) {\r\n    y();\r\n} else {\r\n    x();\r\n}'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-negated-condition'}]})),
});

test({
	valid: [
		'(!a as boolean) && !b ? x : y',
		'(!a && !b) satisfies boolean ? x : y',
		'(!a)! || !b ? x : y',
		'!a && (<boolean>!b) ? x : y',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	invalid: [
		'!{} ? x : y',
		'!{} && !b ? x : y',
		'!{}.value || !b ? x : y',
		'!function () {} || !b ? x : y',
		'!class {} && !b ? x : y',
		'!async function () {} && !b ? x : y',
		'const value = !{} && !b ? x : y',
		'(!{} && !b) ? x : y',
		'const f = () => !{} ? x : y',
		'const f = () => !{} && !b ? x : y',
		'function* f() {yield !\n a ? x : y;}',
		'function* f() {yield !\n a && !b ? x : y;}',
		'function* f() {yield ! /* first\n operand */ a || !b ? x : y;}',
	].map(code => ({code, errors: [{messageId: 'no-negated-condition'}]})),
});

nodeTest('double-negated chains converge without swapping the final branches', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-negated-condition': 'error'},
	};
	for (const operator of ['&&', '||']) {
		const {output, messages} = linter.verifyAndFix(`!!a ${operator} !!b ? x : y`, config);
		t.assert.strictEqual(output, `a ${operator} b ? x : y`);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

nodeTest('boolean comparison cleanup composes with chain fixes when types are available', t => {
	const linter = new Linter();
	const code = 'type Options = {a: boolean; b: boolean}; function f(options: Options) { return options.a === false && options.b === false ? 1 : 2; }';
	const config = {
		files: ['**/*.ts'],
		plugins: {unicorn: plugin},
		languageOptions: {parser: typescriptEslintParser},
		rules: {
			'unicorn/no-negated-condition': 'error',
			'unicorn/no-unnecessary-boolean-comparison': 'error',
		},
	};
	t.assert.strictEqual(linter.verifyAndFix(code, config, {filename: 'file.ts'}).output, code);
	config.languageOptions.parserOptions = {projectService: {allowDefaultProject: ['*.ts']}};
	const {output, messages} = linter.verifyAndFix(code, config, {filename: 'file.ts'});
	t.assert.strictEqual(output, 'type Options = {a: boolean; b: boolean}; function f(options: Options) { return options.a || options.b ? 2 : 1; }');
	t.assert.deepStrictEqual(messages, []);
	t.assert.strictEqual(linter.verifyAndFix(output, config, {filename: 'file.ts'}).fixed, false);
});

nodeTest('chain fixes preserve branch results and evaluation order', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/no-negated-condition': 'error'},
	};
	const values = [undefined, false, true, 0, 1, NaN, '', 'text'];

	for (const condition of [
		'!a() && !b() && !a()',
		'!a() || !b() || !a()',
		'a() != null && b() !== false',
		'!a() || b() !== a()',
	]) {
		for (const code of [
			`${condition} ? "then" : "else";`,
			`let result; if (${condition}) { result = "then"; } else { result = "else"; } result;`,
			`function* f() {yield ${condition} ? "then" : "else";} f().next().value;`,
		]) {
			const {output, fixed, messages} = linter.verifyAndFix(code, config);
			t.assert.strictEqual(fixed, true);
			t.assert.deepStrictEqual(messages, []);
			t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);

			for (const left of values) {
				for (const right of values) {
					const originalCalls = [];
					const fixedCalls = [];
					const getContext = calls => ({
						a() {
							calls.push('a');
							return left;
						},
						b() {
							calls.push('b');
							return right;
						},
					});

					t.assert.strictEqual(runInNewContext(output, getContext(fixedCalls)), runInNewContext(code, getContext(originalCalls)));
					t.assert.deepStrictEqual(fixedCalls, originalCalls);
				}
			}
		}
	}
});

test({
	valid: [],
	invalid: [
		{
			code: '!(a as boolean) && !b! ? x : y',
			output: '(a as boolean) || b! ? y : x',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-negated-condition'}],
		},
		{
			code: 'foo()\n!<boolean>a && !b ? x : y',
			output: 'foo()\n;<boolean>a || b ? y : x',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-negated-condition'}],
		},
		{
			code: 'const element = <div>{!a?.b || !c ? x : y}</div>;',
			output: 'const element = <div>{a?.b && c ? y : x}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: [{messageId: 'no-negated-condition'}],
		},
		{
			code: '!a && !b ? x /* trailing */ : y',
			errors: [{messageId: 'no-negated-condition'}],
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '!x ? /* one */ 1 : /* two */ 2',
			output: 'x ? /* two */ 2 : /* one */ 1',
			errors: [{messageId: 'no-negated-condition'}],
		},
		...[
			'!x ? 1 /* one */ : 2',
			'!x ? 1 : 2 /* two */',
			'!x ? (1) /* one */ : (2)',
			'!x ? 1 : (2) /* two */',
			'!x ? 1 // one\n : 2',
			'x != y ? 1 /* one */ : 2',
			'x !== y ? 1 : 2 /* two */',
			'if (!x) {one();} /* one */ else {two();}',
			'if (!x) {one();} else {two();} /* two */',
			'if (!x) one(); /* one */ else two();',
			'if (!x) one(); else two(); // two',
		].map(code => ({code, errors: [{messageId: 'no-negated-condition'}]})),
	],
});

test.snapshot({
	valid: [
		'if (a) {}',
		'if (a) {} else {}',
		'if (!a) {}',
		'if (!a) {} else if (b) {}',
		'if (!a) {} else if (b) {} else {}',
		'if (a == b) {}',
		'if (a == b) {} else {}',
		'if (a != b) {}',
		'if (a != b) {} else if (b) {}',
		'if (a != b) {} else if (b) {} else {}',
		'if (a !== b) {}',
		'if (a === b) {} else {}',
		'a ? b : c',
	],
	invalid: [
		'if (!a) {;} else {;}',
		'if (a != b) {;} else {;}',
		'if (a !== b) {;} else {;}',
		'!a ? b : c',
		'a != b ? c : d',
		'a !== b ? c : d',
		'(( !a )) ? b : c',
		'!(( a )) ? b : c',
		'if(!(( a ))) b(); else c();',
		'if((( !a ))) b(); else c();',
		'function a() {return!a ? b : c}',
		'function a() {return!(( a )) ? b : c}',
		outdent`
			function a() {
				return ! // comment
					a ? b : c;
			}
		`,
		outdent`
			function a() {
				return (! // ReturnStatement argument is parenthesized
					a ? b : c);
			}
		`,
		outdent`
			function a() {
				return (
					! // UnaryExpression argument is parenthesized
					a) ? b : c;
			}
		`,
		outdent`
			function a() {
				throw ! // comment
					a ? b : c;
			}
		`,
		'!a ? b : c ? d : e',
		'!a ? b : (( c ? d : e ))',
		outdent`
			a
			![] ? b : c
		`,
		outdent`
			a
			!+b ? c : d
		`,
		outdent`
			a
			!(b) ? c : d
		`,
		outdent`
			a
			!b ? c : d
		`,
		outdent`
			if (!a)
				b()
			else
				c()
		`,
		'if(!a) b(); else c()',
		outdent`
			function fn() {
				if(!a) b(); else return
			}
		`,
		'if(!a) {b()} else {c()}',
		'if(!!a) b(); else c();',
		'(!!a) ? b() : c();',
		outdent`
			function fn() {
				return!a !== b ? c : d
				return((!((a)) != b)) ? c : d
			}
		`,
		outdent`
			if (!a) {
				b();
			} else if (!c) {
				d();
			} else {
				e();
			}
		`,
		'!x ? /* one */ 1 : 2',
		'!x ? 1 : /* two */ 2',
		'!x ? /* one */ /* first */ 1 : /* two */ /* second */ 2',
		'!x ? /* one */ 1 : /* two */ 1',
		'!x ? /* one */ ((1)) : /* two */ ((2))',
		'!x ? (/* one */ 1) : (/* two */ 2)',
		'!x ? /* one */ (1 /* inside */) : /* two */ 2',
		'!x ? /* one */ first(/* inside */ 1) : /* two */ second(2)',
		'x != y ? /* one */ 1 : /* two */ 2',
		'x !== y ? /* one */ 1 : /* two */ 2',
		'!x ? // one\n 1 : // two\n 2',
		'!x ? /* one */ 1 : // two\n 2',
		'!x ? // one\r\n 1 : 2',
		'!x ? /* outer */ (!y ? /* one */ 1 : /* two */ 2) : /* three */ 3',
		'if (!x) /* one */ {one();} else /* two */ {two();}',
		'if (!x) /* one */ one(); else /* two */ two();',
		'if (!x) // one\n one(); else // two\n two();',
		'if (!x) { /* one */ one(); } else { /* two */ two(); }',
		'if (!x) /* one */ one(); else {two();}',
		'if (!x) {one();} else /* two */ two();',
		{
			code: '!x ? /* one */ (one as number) : /* two */ two!',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
