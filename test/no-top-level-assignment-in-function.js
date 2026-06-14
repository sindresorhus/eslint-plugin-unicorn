import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			let cache;
			cache = new Map();
		`,
		outdent`
			let cache;
			function build() {
				return cache;
			}
		`,
		outdent`
			const state = {};
			function build() {
				state.cache = new Map();
			}
		`,
		outdent`
			function build() {
				let cache;
				cache = new Map();
			}
		`,
		outdent`
			function build() {
				let cache;
				function reset() {
					cache = new Map();
				}
				reset();
			}
		`,
		outdent`
			if (enabled) {
				let cache;
				function build() {
					cache = new Map();
				}
				build();
			}
		`,
		outdent`
			let cache;
			function build(cache) {
				cache = new Map();
			}
		`,
		outdent`
			import cache from 'cache';
			function build() {
				return cache;
			}
		`,
		outdent`
			let cache;
			class Cache {
				static {
					cache = new Map();
				}
			}
		`,
		outdent`
			let cache;
			class Cache {
				field = (cache = new Map());
			}
		`,
		outdent`
			/* global cache:readonly */
			function build() {
				return cache;
			}
		`,
		outdent`
			/* global cache:writable */
			function build() {
				cache = new Map();
			}
		`,
		{
			code: outdent`
				let cache;
				type Cache = typeof cache;
				function build(value: Cache) {
					return value;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		outdent`
			let cache;
			function build() {
				cache = new Map();
			}
		`,
		outdent`
			let cache;
			const build = function () {
				cache = new Map();
			};
		`,
		outdent`
			let cache;
			const build = () => {
				cache = new Map();
			};
		`,
		outdent`
			let cache;
			function build() {
				function reset() {
					cache = new Map();
				}
				reset();
			}
		`,
		outdent`
			let cache;
			class Builder {
				build() {
					cache = new Map();
				}
			}
		`,
		outdent`
			let index = 0;
			function next() {
				index++;
			}
		`,
		outdent`
			let index = 0;
			function next() {
				--index;
			}
		`,
		outdent`
			let count = 0;
			function increment() {
				count += 1;
			}
		`,
		outdent`
			let cache;
			function build(value) {
				cache ||= value;
			}
		`,
		outdent`
			let cache;
			function build(value) {
				cache ??= value;
			}
		`,
		outdent`
			function cache() {}
			function build() {
				cache = undefined;
			}
		`,
		outdent`
			import cache from 'cache';
			function build() {
				cache = new Map();
			}
		`,
		outdent`
			if (enabled) {
				var cache;
			}
			function build() {
				cache = new Map();
			}
		`,
		outdent`
			let cache;
			class Cache {
				field = () => {
					cache = new Map();
				};
			}
		`,
		outdent`
			let cache;
			function build(object) {
				({cache} = object);
			}
		`,
		outdent`
			let cache;
			function build(array) {
				[cache] = array;
			}
		`,
		outdent`
			let key;
			function build(object) {
				for (key in object) {
					console.log(key);
				}
			}
		`,
		outdent`
			let value;
			function build(values) {
				for (value of values) {
					console.log(value);
				}
			}
		`,
		{
			code: outdent`
				let cache;
				function build(value: typeof cache) {
					cache = value;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
