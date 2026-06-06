import outdent from 'outdent';
import {getTester, avoidTestTitleConflict} from './utils/test.js';

const {test} = getTester(import.meta);

const valid = [
	outdent`
		class Foo {
			constructor() {
				this.value = 1;
			}

			method() {
				return this.value;
			}

			static method() {
				return this.value;
			}

			get value() {
				return this._value;
			}

			set value(value) {
				this._value = value;
			}

			#method() {
				return this.value;
			}
		}
	`,
	outdent`
		const Foo = class {
			value = this.defaultValue;
			static value = this.defaultValue;
		};
	`,
	outdent`
		class Foo {
			static {
				this.value = 1;
			}
		}
	`,
	outdent`
		class Foo {
			method() {
				const getValue = () => this.value;
				return getValue();
			}
		}
	`,
	outdent`
		class Foo {
			value = () => this.defaultValue;

			static {
				const update = () => this.value = 1;
				update();
			}
		}
	`,
	outdent`
		class Foo {
			method() {
				class Bar {
					method() {
						return this.value;
					}
				}

				return Bar;
			}
		}
	`,
	outdent`
		class Foo {
			method() {
				class Bar extends this.Base {
					[this.key]() {}
				}

				return Bar;
			}
		}
	`,
	outdent`
		class Foo {
			method() {
				class Bar {
					[this.key] = 1;
				}

				return Bar;
			}
		}
	`,
];

const invalid = [
	'this.value;',
	'const getValue = () => this.value;',
	outdent`
		function foo() {
			return this.value;
		}
	`,
	outdent`
		function Foo(value) {
			this.value = value;
		}
	`,
	outdent`
		const foo = function () {
			return this.value;
		};
	`,
	outdent`
		(function () {
			this.value = 1;
		})();
	`,
	outdent`
		function foo() {
			const getValue = () => this.value;
			return getValue();
		}
	`,
	outdent`
		class Foo {
			method() {
				function getValue() {
					return this.value;
				}

				return getValue();
			}
		}
	`,
	outdent`
		class Foo {
			value = function () {
				return this.value;
			};
		}
	`,
	outdent`
		class Foo {
			static {
				function update() {
					this.value = 1;
				}

				update();
			}
		}
	`,
	outdent`
		const foo = {
			method() {
				return this.value;
			}
		};
	`,
	outdent`
		const foo = {
			get value() {
				return this._value;
			},
			set value(value) {
				this._value = value;
			}
		};
	`,
	outdent`
		const foo = {
			method: function () {
				return this.value;
			}
		};
	`,
	outdent`
		Foo.prototype.method = function () {
			this.value();
		};
	`,
	outdent`
		new SDK({
			onReady: function () {
				this.value;
			}
		});
	`,
	outdent`
		(function (root, factory) {
			root.MyModule = factory();
		}(typeof self !== 'undefined' ? self : this, function () {
			return {};
		}));
	`,
	outdent`
		export default {
			methods: {
				refresh() {
					this.list = getList();
				}
			}
		};
	`,
	outdent`
		class Foo {
			[this.key]() {}
		}
	`,
	outdent`
		class Foo {
			[this.key] = 1;
		}
	`,
	outdent`
		class Foo extends this.Base {}
	`,
];

test.snapshot({
	valid,
	invalid,
});

test.snapshot(avoidTestTitleConflict({
	testerOptions: {
		languageOptions: {
			sourceType: 'commonjs',
		},
	},
	valid: [],
	invalid: ['this.value;'],
}, 'commonjs'));

test.snapshot(avoidTestTitleConflict({
	testerOptions: {
		languageOptions: {
			sourceType: 'script',
		},
	},
	valid: [],
	invalid: ['this.value;'],
}, 'script'));

test.vue({
	valid: [],
	invalid: [
		{
			code: outdent`
				<script>
				export default {
					methods: {
						refresh() {
							this.list = getList();
						}
					}
				}
				</script>
			`,
			errors: 1,
		},
	],
});

test.typescript({
	valid: [
		outdent`
			class Foo {
				accessor value = this.defaultValue;
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				class Foo {
					accessor [this.key] = 1;
				}
			`,
			errors: 1,
		},
	],
});
