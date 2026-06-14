import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [
		'for (const item of items) {}',
		'for await (const item of items) {}',
		'for (const key in items.map(callback)) {}',
		'items.map(callback);',
		'items.filter(callback);',
		'const mapped = items.map(callback); for (const item of mapped) {}',
		'for (const item of items.map()) {}',
		'for (const item of items.filter()) {}',
		'for (const item of items?.map(callback)) {}',
		'for (const item of items.map?.(callback)) {}',
		'for (const item of items["map"](callback)) {}',
		'for (const item of items[method](callback)) {}',
		'for (const [index, item] of items.entries()) {}',
		'for (const [index, item] of items.map(callback).entries()) {}',
		'for (const [index, item] of items.filter(callback).entries()) {}',
		'for (const item of Array.from(items)) {}',
		'for (const item of [...items]) {}',
		'for (const item of Array.prototype.map.call(items, callback)) {}',
		'for (const item of Iterator.from(items).map(callback)) {}',
		'for (const item of Iterator.from(items).filter(callback)) {}',
		'for (const item of Iterator.from(items).map(callback).filter(callback)) {}',
		'for (const item of (Iterator).from(items).map(callback)) {}',
		'for (const item of Iterator.concat(first, second).filter(callback)) {}',
		'for (const item of Iterator.zip(iterables).map(callback)) {}',
		'for (const item of Iterator.zipKeyed(iterables).filter(callback)) {}',
		'for (const item of globalThis.Iterator.from(items).map(callback)) {}',
		'for (const item of (globalThis).Iterator.from(items).map(callback)) {}',
		'for (const item of globalThis.Iterator.zip(iterables).filter(callback)) {}',
		'for (const item of items.values().map(callback)) {}',
		'for (const item of items.keys().map(callback)) {}',
		'for (const item of items.entries().filter(callback)) {}',
		'for (const item of items.matchAll(pattern).map(callback)) {}',
		'for (const item of Iterator.from(items).take(1).map(callback)) {}',
		'for (const item of Iterator.from(items).flatMap(callback).drop(1).filter(callback)) {}',
		typescript('function foo(items: string[]) { for (const item of items) {} }'),
		typescript('for (const item of (Iterator as typeof Iterator).from(items).map(callback)) {}'),
		typescript('for (const item of (Iterator.from(items) as Iterator<string>).map(callback)) {}'),
	],
	invalid: [
		'for (const item of items.map(callback)) {}',
		'for (const item of items.filter(callback)) {}',
		'for (const item of items.map(callback, thisArgument)) {}',
		'for (const item of items.filter(callback, thisArgument)) {}',
		'for (const item of (items).map(callback)) {}',
		'for (const item of ((items)).filter(callback)) {}',
		'for (const item of (items.map(callback))) {}',
		'for await (const item of items.map(callback)) {}',
		'for await (const item of items.filter(async item => item.isEnabled)) {}',
		'for (const item of items.map(/* comment */ callback)) {}',
		'const Iterator = {from: items => items}; for (const item of Iterator.from(items).map(callback)) {}',
		'const Iterator = {zip: iterables => iterables}; for (const item of Iterator.zip(iterables).filter(callback)) {}',
		'const globalThis = {Iterator: {from: items => items}}; for (const item of globalThis.Iterator.from(items).map(callback)) {}',
		outdent`
			for (const item of items
				.map(item => item.value)
			) {}
		`,
		outdent`
			for (
				const item of items.filter(item => item.isEnabled)
			) {}
		`,
		typescript('function foo(items: string[]) { for (const item of (items as string[]).map(item => item.trim())) {} }'),
		typescript('for (const item of items.map(callback) as string[]) {}'),
	],
});
