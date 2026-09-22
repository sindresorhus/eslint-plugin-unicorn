import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class Base { get value() { return 1; } } class Child extends Base { get value() { return 2; } }',
		'class Base { set value(value) {} } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { get value() { return 2; } set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { set other(value) {} }',
		'class Base { static get value() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { static set value(value) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { value() {} } class Child extends Middle { set value(value) {} }',
		'class Base { get value() { return 1; } value() {} } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { value = 1; } class Child extends Middle { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { set value(value) {} value = 1; }',
		'class Base { static value = 1; static get value() { return 2; } } class Child extends Base { static set value(value) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { get value() { return 2; } } class Child extends Middle { get value() { return 3; } }',
		'class Base { get value() { return 1; } } class Child extends unknownBase { set value(value) {} }',
		'class Base { get value() { return 1; } } { class Base {} class Child extends Base { set value(value) {} } }',
		'class Base { get value() { return 1; } } Base = Other; class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } const alias = Base; class Child extends getBase(alias) { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { get [key]() { return 2; } set value(value) {} }',
		'class Base { get [key]() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } get [key]() { return 2; } } class Child extends Base { set value(value) {} }',
		'class Base { static get name() { return 1; } } class Child extends Base { static set name(value) {} }',
		'class Base { static get length() { return 1; } } class Child extends Base { static set length(value) {} }',
		'class Base { get ["constructor"]() { return 1; } } class Child extends Base { set ["constructor"](value) {} }',
		'class Base { get [Symbol.iterator]() { return 1; } } class Child extends Base { set ["Symbol(Symbol.iterator)"](value) {} }',
		'class Base { get ["Symbol(Symbol.iterator)"]() { return 1; } } class Child extends Base { set [Symbol.iterator](value) {} }',
		'class Base { get #value() { return 1; } } class Child extends Base { set #value(value) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { get [key]() { return 2; } } class Child extends Middle { set value(value) {} }',
	],
	invalid: [
		'class Base { get value() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { set value(value) {} } class Child extends Base { get value() { return 1; } }',
		'class Base { get value() { return 1; } set value(value) {} } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } set value(value) {} } class Child extends Base { get value() { return 2; } }',
		'class Base { get value() { return 1; } } class Middle extends Base {} class Child extends Middle { set value(value) {} }',
		'class Base { [Symbol.iterator]() {} get value() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { [Symbol.iterator]() {} set value(value) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { get value() { return 2; } set value(value) {} } class Child extends Middle { get value() { return 3; } }',
		'class Base { value() {} get value() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get value() { return 1; } } class Child extends Base { value() {} set value(value) {} }',
		'class Base { get value() { return 1; } } { class Base { set value(value) {} } class Child extends Base { get value() { return 2; } } }',
		'class Base { get value() { return 1; } } class Middle extends Base { set value(value) {} } class Child extends Middle { get value() { return 2; } }',
		'class Base { get value() { return 1; } } class Middle extends Base { set value(value) {} } class Child extends Middle { set value(value) {} }',
		'class Base { static get value() { return 1; } } class Child extends Base { static set value(value) {} }',
		'class Base { static get constructor() { return 1; } } class Child extends Base { static set constructor(value) {} }',
		'const Base = class { get value() { return 1; } }; class Child extends Base { set value(value) {} }',
		'const Base = class { get value() { return 1; } }; const alias = Base; class Child extends alias { set value(value) {} }',
		'const Base = class { get value() { return 1; } }; const first = Base; const second = first; class Child extends second { set value(value) {} }',
		'class Child extends (class { get value() { return 1; } }) { set value(value) {} }',
		'class Base { get first() { return 1; } get second() { return 2; } } class Child extends Base { set first(value) {} set second(value) {} }',
		'const name = "value"; class Base { get [name]() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get ["value"]() { return 1; } } class Child extends Base { set value(value) {} }',
		'class Base { get 1() { return 1; } } class Child extends Base { set [1](value) {} }',
		'class Base { get [null]() { return 1; } } class Child extends Base { set null(value) {} }',
		outdent`
			class Base {
				get value() {
					return 1;
				}
			}

			class Child extends Base {
				set value(value) {}
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
		'declare class Base { get value(): number; } class Child extends Base { set value(value: number) {} }',
		'abstract class Base { abstract get value(): number; } class Child extends Base { set value(value: number) {} }',
		'class Base { @decorate get value() { return 1; } } class Child extends Base { set value(value: number) {} }',
		'class Base { accessor other = 1; get value() { return 1; } } class Child extends Base { get value() { return 2; } }',
		'class Base { accessor value = 1; value() {} } class Child extends Base { set value(value: number) {} }',
		'class Base { declare accessor value: number; } class Child extends Base { set value(value: number) {} }',
	],
	invalid: [
		'class Base { get value(): number { return 1; } } class Child extends Base { override set value(value: number) {} }',
		'class Base { get value(): number { return 1; } } class Child extends Base { set value(value: number) {} }',
		'class Base { [key: string]: unknown; get value() { return 1; } } class Child extends Base { set value(value: number) {} }',
		'class Base { accessor value = 1; } class Child extends Base { get value() { return 2; } }',
		'class Base { static accessor value = 1; } class Child extends Base { static set value(value: number) {} }',
		'class Base { get value() { return 1; } } class Middle extends Base { declare value: number; } class Child extends Middle { set value(value: number) {} }',
	],
});
