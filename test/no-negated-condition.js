import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
