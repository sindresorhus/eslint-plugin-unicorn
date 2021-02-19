import {outdent} from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'this',
		'function a () {new this}',
		outdent`
			class A extends B {
				static a() {
					console.log(notThis);
					console.log(notSuper);
				}
			}
		`,
		outdent`
			class A extends B {
				notStatic() {
					console.log(this);
					console.log(super.a());
				}
			}
		`
	],
	invalid: [
		outdent`
			class A {
				static bar() {
					this.foo();
				}
			}
		`,
		outdent`
			class A extends B {
				static bar() {
					super.foo();
				}
			}
		`,
		outdent`
			const A = class A {
				static bar() {
					this.foo();
				}
			}
		`,
		outdent`
			const A = class A extends B {
				static bar() {
					super.foo();
				}
			}
		`,
		outdent`
			const A = class {
				static bar() {
					this.foo();
				}
			}
		`,
		outdent`
			const A = class extends B {
				static bar() {
					super.foo();
				}
			}
		`,
		outdent`
			class A extends B {
				static bar() {
					super.foo();
					alert(this);
				}
			}
		`,
		outdent`
			class B {}
			class A extends B {
				static a() {
					alert(this);
				}
				static b() {
					alert(super.a);
				}
			}
		`,
		outdent`
			class A extends B {
				static A() {
					alert(this);
				}
				static B() {
					alert(super.a);
				}
			}
		`,
		// `class` name not available
		outdent`
			class A extends B {
				static a() {
					const A = 1;
					alert(this);
				}
				static b() {
					const B = 1;
					alert(super.a);
				}
			}
		`,
		outdent`
			class A extends B {
				static a() {
					alert(this);
					function A() {}
				}
				static b() {
					alert(super.a);
					function B() {}
				}
			}
		`,
		outdent`
			class A extends B {
				static a() {
					alert(this);
					class A {}
				}
				static b() {
					alert(super.a);
					class B {}
				}
			}
		`,
		// Not `Identifier`
		outdent`
			class A extends B() {
				static b() {
					alert(super.a);
				}
			}
		`,
		outdent`
			class A extends window.Array {
				static b() {
					alert(super.a);
				}
			}
		`,
		outdent`
			export default class A extends B {
				static a() {
					alert(this);
				}
				static b() {
					alert(super.a);
				}
			}
		`,
		outdent`
			export class A extends B {
				static a() {
					alert(this);
				}
				static b() {
					alert(super.a);
				}
			}
		`,
		outdent`
			export const A = class A extends B {
				static a() {
					alert(this);
				}
				static b() {
					alert(super.a);
				}
			}
		`
	]
});
