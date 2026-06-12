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
		typescript('function foo(items: string[]) { for (const item of items) {} }'),
	],
	invalid: [
		'for (const item of items.map(callback)) {}',
		'for (const item of items.filter(callback)) {}',
		'for (const item of items.map(callback, thisArgument)) {}',
		'for (const item of items.filter(callback, thisArgument)) {}',
		'for (const item of (items).map(callback)) {}',
		'for (const item of ((items)).filter(callback)) {}',
		'for await (const item of items.map(callback)) {}',
		'for (const item of items.map(/* comment */ callback)) {}',
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
	],
});
