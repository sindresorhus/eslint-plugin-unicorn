import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'test ? object?.method(a) : object?.method(b);',
		'test ? object.method?.(a) : object.method?.(b);',
		'test ? object[key](a) : object[key](b);',
		'test ? getObject().method(a) : getObject().method(b);',
		'test ? object.nested.method(a) : object.nested.method(b);',
		'test ? (object).method(a) : object.method(b);',
	],
	invalid: [
		{
			code: 'var let = {method(value) {}}; test ? let["method"](a) : let["method"](b);',
			languageOptions: {sourceType: 'script'},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			['test ? object.method(a) : object.method(b);', 'object.method(test ? a : b);'],
			['test ? object["method"](a) : object["method"](b);', 'object["method"](test ? a : b);'],
			['test ? (object).method((a)) : (object) . method(b);', '(object).method((test ? (a) : b));'],
			['test ? this.method(a) : this.method(b);', 'this.method(test ? a : b);'],
			['test ? 16 .toString(a) : 16 .toString(b);', '16 .toString(test ? a : b);'],
			['test ? object.method(a(), later()) : object.method(b(), later());', 'object.method(test ? a() : b(), later());'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		{
			code: 'class Foo extends Bar { method() { return test ? super.method(a) : super.method(b); } }',
			output: 'class Foo extends Bar { method() { return super.method(test ? a : b); } }',
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'class Foo { #method(value) {} method() { return test ? this.#method(a) : this.#method(b); } }',
			output: 'class Foo { #method(value) {} method() { return this.#method(test ? a : b); } }',
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			'change() ? object.method(a) : object.method(b);',
			'test ? object.method(shared(), a) : object.method(shared(), b);',
			'test ? object./* keep */method(a) : object.method(b);',
			'test ? object.method(a) : object.method(/* keep */ b);',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		{
			code: 'test ? object.method<Result < string >>(a) : object.method<Result<string>>(b);',
			output: 'object.method<Result < string >>(test ? a : b);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'test ? object.method<A>(a) : object.method<B>(b);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
	],
});

test({
	valid: [
		'test ? call(a, `name suffix`) : call(b, `name  suffix`);',
		'test ? call(a, /name suffix/) : call(b, /name  suffix/);',
		{
			code: 'test ? call(a, <div>name suffix</div>) : call(b, <div>name  suffix</div>);',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'test ? call(a, <p>foo&#10;bar</p>) : call(b, <p>foo\nbar</p>);',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
	invalid: [
		{
			code: 'test ? call(a, <p className="shared">foo&#10;bar</p>) : call(b, <p className = "shared">foo&#10;bar</p>);',
			output: 'call(test ? a : b, <p className="shared">foo&#10;bar</p>);',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'test ? call(a, other?first:second) : call(b, other ? first : second);',
			output: 'call(test ? a : b, other?first:second);',
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'function run() {\r\n  return test\r\n    ? [first, {value: 1,\r\n      enabled: true}]\r\n    : [second, {value: 1, enabled: true}];\r\n}',
			output: 'function run() {\r\n  return [test ? first : second, {value: 1,\r\n      enabled: true}];\r\n}',
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			['test ? call<Result < string >>(a) : call<Result<string>>(b);', 'call<Result < string >>(test ? a : b);'],
			['test ? new Box<Result < string >>(a) : new Box<Result<string>>(b);', 'new Box<Result < string >>(test ? a : b);'],
		].map(([code, output]) => ({
			code, output, errors: [{messageId: 'prefer-minimal-ternary'}], languageOptions: {parser: parsers.typescript},
		})),
		...[
			'test ? call<Result /* keep */>(a) : call<Result>(b);',
			'test ? new Box<Result>(a) : new Box<Result /* keep */>(b);',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}], languageOptions: {parser: parsers.typescript}})),
	],
});

test.vue({
	valid: [
		'<template>{{ test ? call(a, first+second) : call(b, first-second) }}</template>',
	],
	invalid: [
		{
			code: '<script setup lang="ts"></script><template>{{ test ? object.method<Result < string >>(a) : object.method<Result<string>>(b) }}</template>',
			output: '<script setup lang="ts"></script><template>{{ object.method<Result < string >>(test ? a : b) }}</template>',
			languageOptions: {parserOptions: {parser: typescriptEslintParser}},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: '<template>{{ test ? object.first : object.second }}</template>',
			output: '<template>{{ object[test ? "first" : "second"] }}</template>',
			options: [{checkComputedMemberAccess: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			['<template>{{ test ? object.method(a) : object.method(b) }}</template>', '<template>{{ object.method(test ? a : b) }}</template>'],
			['<template>{{ test ? call(a, first+second) : call(b, first + second) }}</template>', '<template>{{ call(test ? a : b, first+second) }}</template>'],
			['<template>{{ test ? call(a, {value: 1,}) : call(b, {value: 1}) }}</template>', '<template>{{ call(test ? a : b, {value: 1,}) }}</template>'],
			['<template>{{ test ? [((a))] : [(b)] }}</template>', '<template>{{ [((test ? ((a)) : (b)))] }}</template>'],
			['<template>{{ test ? {value: a} : {value: b} }}</template>', '<template>{{ ({value: test ? a : b}) }}</template>'],
			['<script>test ? call(a) : call(b);</script><template>{{ test ? call(c) : call(d) }}</template>', '<script>call(test ? a : b);</script><template>{{ call(test ? c : d) }}</template>'],
		].map(([code, output]) => ({code, output, errors: code.startsWith('<script>') ? 2 : 1})),
		...[
			'<template><div :value="test ? call((a, b)) : call(c)" /></template>',
			'<template><button @click="previous()\ntest ? [a] : [b];"></button></template>',
			'<template><button @click="previous()\ntest ? a + 1 : b + 1;"></button></template>',
			'<template>{{ (() => { previous()\ntest ? [a] : [b]; })() }}</template>',
			'<template>{{ (() => { previous()\ntest ? a + 1 : b + 1; })() }}</template>',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		...[
			'<template>{{ test ? call(a, first + /* keep */ second) : call(b, first + second) }}</template>',
			'<template>{{ test ? call(a, first + second) : call(b, first + /* keep */ second) }}</template>',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		...[
			'<template><div :value="test ? object.first : object.second" /></template>',
			'<template><div :value="test ? object.first() : object.second()" /></template>',
		].map(code => ({code, options: [{checkComputedMemberAccess: true}], errors: [{messageId: 'prefer-minimal-ternary'}]})),
	],
});

test.svelte({
	valid: [],
	invalid: [{
		code: '<script>test ? call(a) : call(b);</script>{test ? call(c, first+second) : call(d, first + second)}',
		output: '<script>call(test ? a : b);</script>{call(test ? c : d, first+second)}',
		errors: 2,
	}],
});

test({
	valid: [
		'test ? call(a, name + suffix) : call(b, name - suffix);',
		'test ? call(a, "name suffix") : call(b, "name  suffix");',
		'test ? call(a, {retry: true, delay: 1000}) : call(b, {retry: true, delay: 2000,});',
		'test ? call(a, [1,,]) : call(b, [1,]);',
		'test ? call(a, {value: [1,,],}) : call(b, {value: [1,]});',
		'test ? call(name+suffix) : call(name + suffix);',
		'test ? object[first+second] : object[first + second];',
		// Shared functions and classes require identical source text because line breaks can change statement behavior.
		'test ? call(a, () => { return value; }) : call(b, () => { return\nvalue; });',
		'test ? call(a, function() { value\n++other; }) : call(b, function() { value++\nother; });',
		'test ? call(a, {method() { return value; }}) : call(b, {method() { return\nvalue; }});',
		'test ? call(a, class { method() { return value; } }) : call(b, class { method() { return\nvalue; } });',
		'test ? call(a, () => value) : call(b, () =>  value);',
	],
	invalid: [
		{
			code: outdent`
				const result = isUrgent
					? notifyRecipients("urgent", {
						retry: true,
						delay: 1000,
					})
					: notifyRecipients("normal", {retry: true, delay: 1000});
			`,
			output: outdent`
				const result = notifyRecipients(isUrgent ? "urgent" : "normal", {
						retry: true,
						delay: 1000,
					});
			`,
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			'test ? call(a, {retry: true, /* keep */}) : call(b, {retry: true});',
			'test ? call(a, {retry: true}) : call(b, {retry: true, /* keep */});',
			'test ? call(name+suffix, a) : call(name + suffix, b);',
			'test ? call(a, name + /* keep */ suffix) : call(b, name + suffix);',
			'test ? call(a, name + suffix) : call(b, name + /* keep */ suffix);',
			'test ? call(a, name + /* keep */ suffix) : call(b, name + /* keep */ suffix);',
			'test ? call(a, name + // keep\n suffix) : call(b, name + suffix);',
			'test ? [a, name + /* keep */ suffix] : [b, name + suffix];',
			'test ? {value: a, shared: name + /* keep */ suffix} : {value: b, shared: name + suffix};',
			'test ? new Foo(a, name + /* keep */ suffix) : new Foo(b, name + suffix);',
			'test ? a + object./* keep */ value : b + object.value;',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		...[
			['test ? call(a, {retry: true, delay: 1000,}) : call(b, {retry: true, delay: 1000});', 'call(test ? a : b, {retry: true, delay: 1000,});'],
			['test ? call(a, {retry: true, delay: 1000}) : call(b, {retry: true, delay: 1000,});', 'call(test ? a : b, {retry: true, delay: 1000});'],
			['test ? [a, {value: 1,}] : [b, {value: 1}];', '[test ? a : b, {value: 1,}];'],
			['test ? call(a, name+suffix) : call(b, name + suffix);', 'call(test ? a : b, name+suffix);'],
			['test ? call(name===suffix, a) : call(name === suffix, b);', 'call(name===suffix, test ? a : b);'],
			['test ? call(a, {retry: true,\n delay: 1000}) : call(b, {retry: true, delay: 1000});', 'call(test ? a : b, {retry: true,\n delay: 1000});'],
			['test ? [a, name+suffix] : [b, name + suffix];', '[test ? a : b, name+suffix];'],
			['test ? {value: a, shared: name+suffix} : {value: b, shared: name + suffix};', '({value: test ? a : b, shared: name+suffix});'],
			['test ? new Foo(a, name+suffix) : new Foo(b, name + suffix);', 'new Foo(test ? a : b, name+suffix);'],
			['test ? a + object . value : b + object.value;', '(test ? a : b) + object . value;'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		{
			code: 'test ? first.method(name+suffix) : second.method(name + suffix);',
			output: '(test ? first : second).method(name+suffix);',
			options: [{checkVaryingBase: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'test ? object.first(name + /* keep */ suffix) : object.second(name + suffix);',
			options: [{checkComputedMemberAccess: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'test ? call(a, value as Result < string >) : call(b, value as Result<string>);',
			output: 'call(test ? a : b, value as Result < string >);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const result = test ? call(a) : call(b);',
			output: 'const result = call(test ? a : b);',
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			'ready && enabled',
			'ready ?? fallback',
			'ready === enabled',
			'ready !== enabled',
			'typeof value',
			'void value',
			'!true',
			'object.ready',
			'object?.ready',
			'object["ready"]',
			'(ready ? enabled : fallback)',
		].map(condition => ({
			code: `${condition} ? call(a) : call(b);`,
			output: `call(${condition} ? a : b);`,
			errors: [{messageId: 'prefer-minimal-ternary'}],
		})),
		{
			code: '(ready as boolean) && enabled! ? call(a) : call(b);',
			output: 'call((ready as boolean) && enabled! ? a : b);',
			errors: [{messageId: 'prefer-minimal-ternary'}],
			languageOptions: {parser: parsers.typescript},
		},
		...[
			['check() ? [a, later()] : [b, later()];', '[check() ? a : b, later()];'],
			['check() ? {value: a} : {value: b};', '({value: check() ? a : b});'],
			['check() ? a + later() : b + later();', '(check() ? a : b) + later();'],
			['check() ? [1, a] : [1, b];', '[1, check() ? a : b];'],
			['check() ? {fixed: true, value: a} : {fixed: true, value: b};', '({fixed: true, value: check() ? a : b});'],
			['check() ? 1 + a : 1 + b;', '1 + (check() ? a : b);'],
			['test ? call(ready ? a : b, c) : call(ready ? a : b, d);', 'call(ready ? a : b, test ? c : d);'],
			['test ? call(object?.ready, a) : call(object?.ready, b);', 'call(object?.ready, test ? a : b);'],
			['for (test ? (a in object) : (b in object); false;) {}', 'for (((test ? a : b) in object); false;) {}'],
			['for (let result = test ? (a in object) : (b in object); false;) {}', 'for (let result = ((test ? a : b) in object); false;) {}'],
			['for (test ? (key in first) : (key in second); false;) {}', 'for ((key in (test ? first : second)); false;) {}'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		{
			code: 'check() ? first(value) : second(value);',
			output: '(check() ? first : second)(value);',
			options: [{checkVaryingBase: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'check() ? first.method(value) : second.method(value);',
			output: '(check() ? first : second).method(value);',
			options: [{checkVaryingBase: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'const result = test ? object[(change(), "a")] : object[(change(), "b")];',
			output: 'const result = object[test ? (change(), "a") : (change(), "b")];',
			options: [{checkComputedMemberAccess: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		...[
			['test ? object[first(), a] : object[second(), b];', 'object[test ? (first(), a) : (second(), b)];'],
			['test ? object[first(), a] : object[b];', 'object[test ? (first(), a) : b];'],
			['test ? object[a] : object[second(), b];', 'object[test ? a : (second(), b)];'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		{
			code: 'test ? object[change(), "a"] : object[change(), "b"];',
			output: 'object[test ? (change(), "a") : (change(), "b")];',
			options: [{checkComputedMemberAccess: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
		{
			code: 'test ? object[change(), "first"](value) : object[change(), "second"](value);',
			output: 'object[test ? (change(), "first") : (change(), "second")](value);',
			options: [{checkComputedMemberAccess: true}],
			errors: [{messageId: 'prefer-minimal-ternary'}],
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			'test ? {method: (() => 1) as Function} : {method: (() => 2) as Function};',
			'test ? {method: (() => 1)!} : {method: (() => 2)!};',
			'test ? {method: (() => 1) satisfies Function} : {method: (() => 2) satisfies Function};',
			'test ? {method: <Function>(() => 1)} : {method: <Function>(() => 2)};',
			'test ? {method: existing} : {method: (() => 2) as Function};',
			'test ? {method: (function() {}) as Function} : {method: existing};',
			'test ? {constructor: (class {}) satisfies Function} : {constructor: existing};',
			'test ? {method: (function<T>() {})<string>} : {method: (function<T>() {})<number>};',
			'test ? {method: (<T,>() => 1)<string>} : {method: (<T,>() => 2)<string>};',
			'test ? {constructor: (class<T> {})<string>} : {constructor: (class<T> {})<number>};',
			'test ? {method: existing} : {method: ((function<T>() {})<string>) as Function};',
		].map(code => ({
			code,
			errors: [{messageId: 'prefer-minimal-ternary'}],
			languageOptions: {parser: parsers.typescript},
		})),
		...[
			{code: 'var let = {a: 1, b: 2}; test ? let[first] : let[second];'},
			{code: 'var let = {a() {}, b() {}}; test ? let.a() : let.b();', options: [{checkComputedMemberAccess: true}]},
		].map(testCase => ({...testCase, errors: [{messageId: 'prefer-minimal-ternary'}], languageOptions: {sourceType: 'script'}})),
		...[
			'const first = {a: 1}, second = {a: 2}; const result = false ? first[key] : second.a; const key = "a";',
			'const first = {a: 1}, second = {a: 2}; const result = false ? first.a : second[key]; const key = "a";',
		].map(code => ({code, options: [{checkVaryingBase: true}], errors: [{messageId: 'prefer-minimal-ternary'}]})),
		...[
			'value ** 1 ? [shared, a] : [shared, b];',
			'value instanceof Constructor ? [shared, a] : [shared, b];',
			'[...iterable] ? [shared, a] : [shared, b];',
			'test ? call([shared, ...iterable], a) : call([shared, ...iterable], b);',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}]})),
		...[
			'(class { @decorator method() {} }) ? call(a) : call(b);',
			'test ? call((class { @decorator method() {} }), a) : call((class { @decorator method() {} }), b);',
		].map(code => ({code, errors: [{messageId: 'prefer-minimal-ternary'}], languageOptions: {parser: parsers.typescript}})),
		...[
			'(<div />) ? call(a) : call(b);',
			'(<></>) ? call(a) : call(b);',
			'test ? call(<div />, a) : call(<div />, b);',
			'test ? call(<></>, a) : call(<></>, b);',
			'(ready && <div />) ? call(a) : call(b);',
		].map(code => ({
			code,
			errors: [{messageId: 'prefer-minimal-ternary'}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		})),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		// Evaluating the condition must not mutate a shared value moved before it.
		'change() ? call(a) : call(b);',
		'(value = other) ? [value, a] : [value, b];',
		'value++ ? value + a : value + b;',
		// Implicit conversions can mutate a shared value just like a function call.
		'+value ? call(a) : call(b);',
		'value == 1 ? [shared, a] : [shared, b];',
		'test ? call(value ** 1, a) : call(value ** 1, b);',
		'test ? call(value instanceof Constructor, a) : call(value instanceof Constructor, b);',
		'check() ? new Foo(a) : new Foo(b);',
		'check() ? {shared, value: a} : {shared, value: b};',
		'check() ? object[a] : object[b];',
		'check() ? [1, shared, a] : [1, shared, b];',
		'check() ? [shared, 1, a] : [shared, 1, b];',
		'check() ? ["fixed", null, false, 1n, a] : ["fixed", null, false, 1n, b];',
		'check() ? [/pattern/, a] : [/pattern/, b];',
		// Calls, assignments, and suspension are safe when the condition still runs first.
		'(value = other) ? [value] : [fallback];',
		'tag`condition` ? a + 1 : b + 1;',
		'async function run() { return (await condition) ? [a] : [b]; }',
		'function* run() { return (yield condition) ? [a] : [b]; }',
		// Earlier shared arguments must not mutate values read by the condition.
		'test ? call(change(), a) : call(change(), b);',
		'test ? call(value++, a) : call(value++, b);',
		'test ? call(tag`value`, a) : call(tag`value`, b);',
		'tag`condition` ? call(a) : call(b);',
		'!tag`condition` ? call(a) : call(b);',
		'async function run() { return (await condition) ? call(a) : call(b); }',
		// Side effects in the varying part or later shared values keep their order.
		'test ? call(a(), later()) : call(b(), later());',
		'test ? a() + later() : b() + later();',
		'test ? call(shared, a()) : call(shared, b());',
		// Keep reports without removing or relocating comments.
		'test /* keep */ ? call(a) : call(b);',
		'test ? call(a) : call(/* keep */ b);',
		'test ? /* keep */ [a] : [b];',
		// Parentheses and automatic semicolon insertion.
		'(first ? second : third) ? call((a, b)) : call(c);',
		'previous()\ntest ? [a] : [b];',
		'previous()\ntest ? a + 1 : b + 1;',
		'() => test ? {a: 1} : {a: 2};',
		'function run() { return test ? {a: 1} : {a: 2}; }',
		'test ? call({a: 1}) : call({a: 2});',
		'test ? call(() => a) : call(() => b);',
		// Moving anonymous functions into a conditional would lose the property name inference.
		'test ? {method: () => a} : {method: () => b};',
		'test ? {method: function() { return a; }} : {method: function() { return b; }};',
		'test ? {constructor: class {}} : {constructor: other};',
		'test ? object[a?.key] : object[b?.key];',
		{
			code: 'test ? first.method(change()) : second.method(change());',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? object.first(change()) : object.second(change());',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? eval(code) : other(code);',
			options: [{checkVaryingBase: true}],
		},
		{
			code: '(test ? first.method : second.method)();',
			options: [{checkVaryingBase: true}],
		},
		{
			code: '(test ? object.first : object.second)`value`;',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: '(test ? object.first : object.second)?.();',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'previous()\ntest ? first(value) : second(value);',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'delete (test ? object.first : object.second);',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? object[(change(), "a")] : object[(change(), "b")];',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? first[(change(), "method")] : second.method;',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? first.method : second[(change(), "method")];',
			options: [{checkVaryingBase: true}],
		},
		...[
			'(test ? first.method : second.method)!();',
			'((test ? first.method : second.method) as Function)();',
		].map(code => ({code, options: [{checkVaryingBase: true}], languageOptions: {parser: parsers.typescript}})),
		{
			code: 'const element = <div>{test ? call(a) : call(b)}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		...[
			'(<div />) ? [a] : [b];',
			'(<></>) ? [a] : [b];',
		].map(code => ({code, languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}})),
		...[
			'(test as boolean) ? call(a) : call(b);',
			'test! ? call(a) : call(b);',
			'test ? call<A>(a) : call<B>(b);',
			'(test ? [a] : [b])!;',
			'(test ? a + 1 : b + 1)!;',
			'test ? {value: (1 as number)} : {value: (2 as number)};',
			'(class { @decorator method() {} }) ? [a] : [b];',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		'async function run() { return test ? [await a] : [await b]; }',
		'function* run() { return test ? [yield a] : [yield b]; }',
	],
});

// Runs with full type information and `checkVaryingBase` enabled, so `const enum` objects can be detected.
const typeAwareVaryingBase = code => ({
	code,
	options: [{checkVaryingBase: true}],
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const typeAwareComputedMemberAccess = code => ({
	...typeAwareVaryingBase(code),
	options: [{checkComputedMemberAccess: true}],
});

test.snapshot({
	valid: [
		'test ? a : b;',
		'test ? call(a) : call(b, c);',
		'test ? call(a, b) : call(c, d);',
		'test ? a + 1 : b - 1;',
		'test ? a + 1 : b + 2;',
		'test ? object.a : other.b;',
		'test ? getObject().a : getObject().b;',
		'test ? object?.a : object?.b;',
		// Dynamic computed-key swaps are only minimized when the object is the same and side-effect-free.
		'test ? a[x] : b[x];',
		'test ? c?.[x] : c?.[y];',
		'test ? getObject()[x] : getObject()[y];',
		// Different objects with optional chaining are not reported, even though the property is shared.
		'test ? a?.foo : b?.foo;',
		{
			code: 'test ? object.a?.() : object.b?.();',
			options: [{checkComputedMemberAccess: true}],
		},
		'test ? call(...a) : call(...b);',
		'test ? getFunction()(a) : getFunction()(b);',
		'test ? tag`a` : tag`b`;',
		'test ? (a, b) : (a, c);',
		'test ? a && b : a && c;',
		'test ? getValue() + a : getValue() + b;',
		'test ? a + b : a + b;',
		'test ? call(a ? b : c) : call(d ? e : f);',
		outdent`
			test
				? object.one(a, b)
				: other.two(a, b);
		`,
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super.foo : object.foo;
				}
			}
		`,
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super.foo(value) : object.foo(value);
				}
			}
		`,
		outdent`
			class Foo {
				#a;
				#b;

				method(test, object) {
					return test ? #a in object : #b in object;
				}
			}
		`,
		// Object swaps are off by default: moving the ternary into the base (`(test ? a : b).value`) wraps the receiver in a conditional and breaks TypeScript `const enum` access. Opt in with `checkVaryingBase`.
		'test ? a.value : b.value;',
		'test ? a["x"] : b["x"];',
		// Static property swaps are off by default: `object['a']` is the same logical access as `object.a`, so minimizing them forces or keeps computed access in place of clearer property access.
		'test ? object.a : object.b;',
		'test ? object["a"] : object["b"];',
		'isMac ? event.metaKey : event.ctrlKey;',
		// A statically known computed key is treated as a static property too, so it is not reported by default.
		'test ? c[0] : c[1];',
		// Same-object member swaps with a `this` receiver are not reported by default either.
		'test ? this.maxWidth : this.maxHeight;',
		// Private fields have no static name, but can't be made computed, so they are not reported.
		outdent`
			class Foo {
				#a;
				#b;

				method(test, object) {
					return test ? object.#a : object.#b;
				}
			}
		`,
		// `checkComputedMemberAccess` alone does not enable object-varying reads; that needs `checkVaryingBase`.
		{
			code: 'test ? a.value : b.value;',
			options: [{checkComputedMemberAccess: true}],
		},
		// Callee-varying call ternaries are off by default.
		'test ? a() : b();',
		'test ? a(value) : b(value);',
		'test ? first.method(value) : second.method(value);',
		// Method-name swaps are off by default.
		'test ? Promise.allSettled(values) : Promise.all(values);',
		'test ? Math.min(a, 100) : Math.max(a, 100);',
		// Zero-argument method-call swaps are off by default.
		'test ? c.a() : c.b();',
		// Optional chaining is never reported, even when the option is on.
		{
			code: 'test ? a?.() : b?.();',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a?.foo : b?.foo;',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? Promise?.allSettled(values) : Promise?.all(values);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Differing arguments are never minimal, even when only the method name would otherwise qualify.
		{
			code: 'test ? Promise.allSettled(a) : Promise.all(b);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Even with `checkVaryingBase`, a `const enum` object is not reported: `(test ? Email : Sms).MFA_CODE` is a TypeScript compile error (TS2475). Detected whether the const enum is the consequent, the alternate, or both.
		typeAwareVaryingBase('const enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('enum Email { MFA_CODE } const enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('const enum Email { MFA_CODE } const enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		// Computed access on a `const enum` is exempt too: `(test ? Email : Sms)["MFA_CODE"]` is also a TS2475 compile error.
		typeAwareVaryingBase('const enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email["MFA_CODE"] : Sms["MFA_CODE"];'),
		// A `const enum` reached through an alias is resolved and exempted too.
		typeAwareVaryingBase('const enum Original { MFA_CODE } import Email = Original; enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
	],
	invalid: [
		'test ? call(a) : call(b);',
		'test ? call(a, b) : call(a, c);',
		'test ? a + 1 : b + 1;',
		'test ? 1 + a : 1 + b;',
		// Same object with a dynamic computed key minimizes to `c[test ? x : y]` with no regression.
		'test ? c[x] : c[y];',
		'test ? object[method] : object[otherMethod];',
		'test ? c[f()] : c[g()];',
		// A `this` receiver with a dynamic key minimizes too.
		'test ? this[x] : this[y];',
		// A `super` receiver stays in place, so the dynamic key minimizes.
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super[x] : super[y];
				}
			}
		`,
		// A TypeScript non-null assertion on the key is still a dynamic key.
		{
			code: 'test ? c[x!] : c[y!];',
			languageOptions: {parser: parsers.typescript},
		},
		// `checkVaryingBase` enables ternaries that differ only by the base of a call or member access.
		{
			code: 'test ? a() : b();',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a(value) : b(value);',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? first.method(value) : second.method(value);',
			options: [{checkVaryingBase: true}],
		},
		// A plain member read where only the object differs.
		{
			code: 'test ? a.value : b.value;',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a["x"] : b["x"];',
			options: [{checkVaryingBase: true}],
		},
		// `checkComputedMemberAccess` enables method-call ternaries that differ only by the method name.
		{
			code: 'test ? Promise.allSettled(values) : Promise.all(values);',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? Math.min(a, 100) : Math.max(a, 100);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Opt-in still reports zero-argument method-call swaps.
		{
			code: 'test ? c.a() : c.b();',
			options: [{checkComputedMemberAccess: true}],
		},
		// The object is already accessed with a computed string, so minimizing is a clear improvement.
		{
			code: 'test ? Promise["allSettled"](values) : Promise["all"](values);',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: outdent`
				await (
					delayRejection
						? Promise.allSettled([
							promise,
							delay(minimumDelay),
						])
						: Promise.all([
							promise,
							delay(minimumDelay),
						])
				);
			`,
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? Promise.allSettled<T>(values) : Promise.all<T>(values);',
			options: [{checkComputedMemberAccess: true}],
			languageOptions: {parser: parsers.typescript},
		},
		// The `const enum` exemption is specific: regular enums and plain objects are still reported.
		typeAwareVaryingBase('enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('declare const a: {value: number}, b: {value: number}, test: boolean; test ? a.value : b.value;'),
		{
			code: 'test ? object.a : object.b;',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'isMac ? event.metaKey : event.ctrlKey;',
			options: [{checkComputedMemberAccess: true}],
		},
	],
});

test.snapshot({
	valid: [
		...[
			'test ? object.a : object.b;',
			'const first = 1, second = 2; test ? object[first] : object[second];',
		].map(code => ({code, options: [{checkComputedMemberAccess: false, checkVaryingBase: true}]})),
		...[
			'test ? object.a : other.b;',
			'test ? object.a : object.a;',
			'test ? object.a : object["a"];',
			'test ? object.a : object[`a`];',
			'test ? object[0] : object["0"];',
			'const first = "a", second = "a"; test ? object[first] : object[second];',
			'test ? target?.a : target?.b;',
			'test ? object.a : object?.b;',
			'test ? object?.["a"] : object?.["b"];',
			'test ? getObject().a : getObject().b;',
			'test ? object.value.a : object.value.b;',
			'test ? object.a : object[key];',
			outdent`
				class Foo {
					#a;
					#b;

					method(test) {
						return test ? this.#a : this.#b;
					}
				}
			`,
		].map(code => ({code, options: [{checkComputedMemberAccess: true}]})),
		{
			code: 'test ? object.a : other.b;',
			options: [{checkComputedMemberAccess: true, checkVaryingBase: true}],
		},
		{
			code: 'test ? object!.a : object!.b;',
			options: [{checkComputedMemberAccess: true}],
			languageOptions: {parser: parsers.typescript},
		},
		typeAwareComputedMemberAccess('const enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;'),
		typeAwareComputedMemberAccess('const enum Foo { A, B } declare const test: boolean; test ? Foo["A"] : Foo["B"];'),
		typeAwareComputedMemberAccess('const enum Original { A, B } import Foo = Original; declare const test: boolean; test ? Foo.A : Foo.B;'),
	],
	invalid: [
		...[
			'test ? object["a"] : object["b"];',
			'test ? object.a : object["b"];',
			'test ? object[0] : object[1];',
			'test ? object[`a`] : object[`b`];',
			'test ? "value".length : "value".constructor;',
			'test ? this.maxWidth : this.maxHeight;',
			'test ? ((object).a) : (object.b);',
			'test ? object./* first */ a : object./* second */ b;',
			'const first = "a", second = "b"; test ? object[first] : object[second];',
			outdent`
				class Foo extends Bar {
					method(test) {
						return test ? super.foo : super.bar;
					}
				}
			`,
		].map(code => ({code, options: [{checkComputedMemberAccess: true}]})),
		// Dynamic-key swaps remain enabled independently of the option.
		{
			code: 'test ? object[first] : object[second];',
			options: [{checkComputedMemberAccess: false}],
		},
		...[
			'declare const object: {a: number; b: number}, test: boolean; test ? object.a : object.b;',
			// Without type information, const enums retain the existing best-effort behavior.
			'const enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;',
		].map(code => ({code, options: [{checkComputedMemberAccess: true}], languageOptions: {parser: parsers.typescript}})),
		typeAwareComputedMemberAccess('enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;'),
		typeAwareComputedMemberAccess('declare const object: {a: number; b: number}, test: boolean; test ? object.a : object.b;'),
	],
});

test.snapshot({
	valid: [
		// Objects must have the same ordinary, non-computed properties in the same order.
		'test ? {} : {};',
		'test ? {a: 1} : {a: 1};',
		'test ? {a: 1} : {b: 2};',
		'test ? {a: 1, b: 2} : {a: 1};',
		'test ? {a: 1, b: 2} : {b: 3, a: 1};',
		'test ? {a: 1, b: 2} : {a: 3, b: 4};',
		'test ? {[key]: 1} : {[key]: 2};',
		'test ? {a: 1} : {["a"]: 2};',
		'test ? {...object, a: 1} : {...object, a: 2};',
		'test ? {a() {return 1;}} : {a() {return 2;}};',
		'test ? {get a() {return 1;}} : {get a() {return 2;}};',
		'test ? {set a(value) {}, b: 1} : {set a(value) {}, b: 2};',
		// Prototype setters and shorthand properties have different object semantics.
		'test ? {__proto__} : {__proto__: other};',
		'test ? {__proto__: other} : {__proto__};',
		'test ? {__proto__: a} : {__proto__: b};',
		'test ? {"__proto__": a} : {"__proto__": b};',
		'test ? {a: other ? 1 : 2} : {a: 3};',
		'test ? {a: 1} : {a: other ? 2 : 3};',
		// Shared expressions before the varying value must be safe to move before the condition.
		'test ? {a: call(), b: 1} : {a: call(), b: 2};',
		'test ? {a: object.value, b: 1} : {a: object.value, b: 2};',
		'test ? [call(), 1] : [call(), 2];',
		'test ? [other ? b : c, a] : [other ? b : c, d];',
		'test ? new Foo(call(), 1) : new Foo(call(), 2);',
		// Arrays must have the same length, with no spreads or holes.
		'test ? [] : [];',
		'test ? [1] : [1];',
		'test ? [1, 2] : [1];',
		'test ? [1, 2] : [3, 4];',
		'test ? [...items, 1] : [...items, 2];',
		'test ? [a] : [...b];',
		'test ? [, 1] : [, 2];',
		'test ? [1, 2] : [, 3];',
		'test ? [other ? 1 : 2] : [3];',
		'test ? [1] : [other ? 2 : 3];',
		// Constructor changes, member constructors, and spreads are not supported.
		'test ? new Foo() : new Foo();',
		'test ? new Foo(a) : new Foo(a);',
		'test ? new Foo(a) : new Bar(b);',
		'test ? new Foo(a) : new Foo(a, b);',
		'test ? new Foo(a, b) : new Foo(c, d);',
		'test ? new namespace.Foo(a) : new namespace.Foo(b);',
		'test ? new Foo(...a) : new Foo(...b);',
		'test ? new Foo(a) : new Foo(...b);',
		'test ? new Foo(other ? a : b) : new Foo(c);',
		'test ? new Foo(a) : new Foo(other ? b : c);',
		'test ? new Foo(a) : Foo(b);',
		...[
			'test ? new Foo<A>(a) : new Foo<B>(b);',
			'test ? new Foo<A>(a) : new Foo(b);',
			'test ? new Foo(a) : new Foo<A>(b);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		'test ? {a: 1} : {a: 2};',
		'test ? {a: 1, b: 2} : {a: 1, b: 3};',
		'test ? {a} : {a: b};',
		'test ? {a: b} : {a};',
		'test ? {a, b: 1} : {a, b: 2};',
		'test ? {"a": 1} : {a: 2};',
		'test ? {0: a} : {0: b};',
		'test ? {a: 1, b: call()} : {a: 2, b: call()};',
		'test ? ({a: (1)}) : ({a: (2)});',
		'test ? {a: /* first */ 1} : {a: /* second */ 2};',
		'test ? [1] : [2];',
		'test ? [1, 2] : [1, 3];',
		'test ? [a, 1, b] : [a, 2, b];',
		'test ? [1, call()] : [2, call()];',
		'test ? ([((a))]) : ([(b)]);',
		'test ? [/* first */ 1] : [/* second */ 2];',
		'consume(test ? [1] : [2]);',
		'test ? new Foo(a) : new Foo(b);',
		'test ? new Date(2026, 1) : new Date(2026, 2);',
		'test ? new Foo(a, call()) : new Foo(b, call());',
		'test ? new (Foo)((a)) : new (Foo)((b));',
		'test ? new Foo(/* first */ a) : new Foo(/* second */ b);',
		...[
			'test ? new Foo<Value>(a) : new Foo<Value>(b);',
			'test ? new Foo<A, B>(a) : new Foo<A, B>(b);',
			'test ? {a: value as A} : {a: other as A};',
			'test ? [value!] : [other!];',
			'test ? new Foo(value satisfies A) : new Foo(other satisfies A);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		'test ? {__proto__, a: 1} : {__proto__, a: 2};',
		'test ? [a, other ? b : c] : [d, other ? b : c];',
	],
});
