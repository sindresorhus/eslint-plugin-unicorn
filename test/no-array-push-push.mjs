import {outdent} from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			foo.forEach(fn);
			foo.forEach(fn);
		`,
		'foo.push(1);',
		outdent`
			foo.push(1);
			foo.unshift(2);
		`,
		outdent`
			foo.push(1);; // <- there is a "EmptyStatement" between
			foo.push(2);
		`,
		// Not same array
		outdent`
			foo.push(1);
			bar.push(2);
		`,
		// `.push` selector
		'foo.push(1);push(2)',
		'push(1);foo.push(2)',
		'new foo.push(1);foo.push(2)',
		'foo.push(1);new foo.push(2)',
		'foo[push](1);foo.push(2)',
		'foo.push(1);foo[push](2)',
		'foo.push(foo.push(1));',
		// Not `ExpressionStatement`
		outdent`
			const length = foo.push(1);
			foo.push(2);
		`,
		outdent`
			foo.push(1);
			const length = foo.push(2);
		`,
		// Not considered same array
		outdent`
			foo().push(1);
			foo().push(2);
		`,
		outdent`
			foo().bar.push(1);
			foo().bar.push(2);
		`
	],
	invalid: [
		outdent`
			foo.push(1);
			foo.push(2);
		`,
		outdent`
			(foo.push)(1);
			(foo.push)(2);
		`,
		outdent`
			foo.bar.push(1);
			foo.bar.push(2);
		`,
		outdent`
			foo.push(1);
			(foo).push(2);
		`,
		outdent`
			foo.push();
			foo.push();
		`,
		outdent`
			foo.push(1);
			foo.push();
		`,
		outdent`
			foo.push();
			foo.push(2);
		`,
		outdent`
			foo.push(1, 2);
			foo.push((3), (4));
		`,
		outdent`
			foo.push(1, 2,);
			foo.push(3, 4);
		`,
		outdent`
			foo.push(1, 2);
			foo.push(3, 4,);
		`,
		outdent`
			foo.push(1, 2,);
			foo.push(3, 4,);
		`,
		outdent`
			foo.push(1, 2, ...a,);
			foo.push(...b,);
		`,
		outdent`
			foo.push(bar());
			foo.push(1);
		`,
		// `arguments` in second push has side effect
		outdent`
			foo.push(1);
			foo.push(bar());
		`,
		// Multiple
		outdent`
			foo.push(1,);
			foo.push(2,);
			foo.push(3,);
		`,
		// Should be able to find the previous expression
		outdent`
			if (a) {
				foo.push(1);
				foo.push(2);
			}
		`,
		outdent`
			switch (a) {
				default:
					foo.push(1);
					foo.push(2);
			}
		`,
		outdent`
			function a() {
				foo.push(1);
				foo.push(2);
			}
		`,
		// ASI
		outdent`
			foo.push(1)
			foo.push(2)
			;[foo].forEach(bar)
		`,
		// Still same array
		outdent`
			foo.bar.push(1);
			(foo)['bar'].push(2);
		`
	]
});

// `isSameReference` coverage
test.snapshot({
	valid: [
		outdent`
			a[x].push(1);
			a[x].push(2);
			'1'.someMagicPropertyReturnsAnArray.push(1);
			(1).someMagicPropertyReturnsAnArray.push(2);
			/a/i.someMagicPropertyReturnsAnArray.push(1);
			/b/g.someMagicPropertyReturnsAnArray.push(2);
			1n.someMagicPropertyReturnsAnArray.push(1);
			2n.someMagicPropertyReturnsAnArray.push(2);
			(true).someMagicPropertyReturnsAnArray.push(1);
			(false).someMagicPropertyReturnsAnArray.push(2);
		`
	],
	invalid: [
		outdent`
			class A extends B {
				foo() {
					this.push(1);
					this.push(2);
					super.x.push(1);
					super.x.push(2);
					((a?.x).y).push(1);
					(a.x?.y).push(1);
					'1'.someMagicPropertyReturnsAnArray.push(1);
					'1'.someMagicPropertyReturnsAnArray.push(2);
					/a/i.someMagicPropertyReturnsAnArray.push(1);
					/a/i.someMagicPropertyReturnsAnArray.push(2);
					1n.someMagicPropertyReturnsAnArray.push(1);
					1n.someMagicPropertyReturnsAnArray.push(2);
					(true).someMagicPropertyReturnsAnArray.push(1);
					(true).someMagicPropertyReturnsAnArray.push(2);
				}
			}
		`
	]
});
