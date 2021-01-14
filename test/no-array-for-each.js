import {outdent} from 'outdent';
import {test} from './utils/test';

test.visualize([
	valid: [
		'new foo.forEach(element => bar())',
		'forEach(element => bar())',
		'foo.notForEach(element => bar())'
	],
	invalid: [
		// Not fixable
		'foo.forEach?.(element => bar(element))',
		'(foo.forEach(element => bar(element)))',
		'foo.forEach(element => bar(element), thisArgument)',
		'foo.forEach()',
		'const baz = foo.forEach(element => bar(element))',
		'foo?.forEach(element => bar(element))',
		'foo.forEach(bar)',
		'foo.forEach(async function(element) {})',
		'foo.forEach(function * (element) {})',
		'foo.forEach(() => bar())',
		'foo.forEach((element, index, array) => bar())',
		// Ideally this should be fixable, but hard to know variable conflicts
		'foo.forEach(({property}) => bar(property))',
		// TODO: check parameters conflicts
		// 'foo.forEach(foo => bar())',
		outdent`
			foo.forEach(element => {
				do {
					return
				} while (element)
			});
		`,
		outdent`
			foo.forEach(element => {
				while (element) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i = 0; i < 2; i++) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i in element) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				for (let i of element) {
					return;
				}
			});
		`,
		outdent`
			foo.forEach(element => {
				switch (element) {
					default:
						return;
				}
			});
		`,
		// TODO: check parameters conflicts
		// 'foo.forEach(function a(element) {bar(a)})',
		// 'foo.forEach(function a(element) {bar(this)})',
		// 'foo.forEach(function a(element) {bar(arguments)})',

		// Auto-fix
		outdent`
			foo.forEach(function (element) {
				bar(element);
			});
		`,
		outdent`
			foo.forEach(function withName(element) {
				bar(element);
			});
		`,
		outdent`
			foo.forEach((element) => {
				bar(element);
			});
		`,
		'foo.forEach((element) => bar(element));',
		outdent`
			foo.forEach(function (element, index) {
				bar(element, index);
			});
		`,
		outdent`
			foo.forEach(function withName(element, index) {
				bar(element, index);
			});
		`,
		outdent`
			foo.forEach((element, index) => {
				bar(element, index);
			});
		`,
		'foo.forEach((element, index) => bar(element, index));',
		// Trailing comma
		outdent`
			foo.forEach(function (element) {
				bar(element);
			},);
		`,
		outdent`
			foo.forEach(function withName(element) {
				bar(element);
			},);
		`,
		outdent`
			foo.forEach((element) => {
				bar(element);
			},);
		`,
		'foo.forEach((element) => bar(element),);',
		// Can't remove semi
		outdent`
			foo.forEach((element) => bar(element))
			;[foo].pop();
		`
	]
]);
