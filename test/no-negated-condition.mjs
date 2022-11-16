import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		"if (a) {}",
		"if (a) {} else {}",
		"if (!a) {}",
		"if (!a) {} else if (b) {}",
		"if (!a) {} else if (b) {} else {}",
		"if (a == b) {}",
		"if (a == b) {} else {}",
		"if (a != b) {}",
		"if (a != b) {} else if (b) {}",
		"if (a != b) {} else if (b) {} else {}",
		"if (a !== b) {}",
		"if (a === b) {} else {}",
		"a ? b : c",
	],
	invalid: [
		"if (!a) {;} else {;}",
		"if (a != b) {;} else {;}",
		"if (a !== b) {;} else {;}",
		"!a ? b : c",
		"a != b ? c : d",
		"a !== b ? c : d",
		"(( !a )) ? b : c",
		"!(( a )) ? b : c",
		"if(!(( a ))) b(); else c();",
		"if((( !a ))) b(); else c();",
		"function a() {return!a ? b : c}",
		"function a() {return!(( a )) ? b : c}",
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
		"if(!a) b(); else c()",
		outdent`
			function fn() {
				if(!a) b(); else return
			}
		`,
		"if(!a) {b()} else {c()}",
		"if(!!a) b(); else c();",
		"(!!a) ? b() : c();",
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
	],
});
