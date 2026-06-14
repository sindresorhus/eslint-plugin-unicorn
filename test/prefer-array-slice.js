import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.splice(index)',
		'array.splice(index, 1)[0]',
		'array.splice(index, deleteCount)[0]',
		'array.splice(index).shift()',
		'array.splice(index).length',
		'array.splice(index).at()',
		'array.splice(index).at(0, extra)',
		'array.splice(index)[0] = value',
		'array.splice(index)["length"] = value',
		'delete array.splice(index)[0]',
		'array["splice"](index)[0]',
		'array[splice](index)[0]',
		'array?.splice(index)[0]',
		'array.splice?.(index)[0]',
		'splice(index)[0]',
	],
	invalid: [
		'process.argv.splice(2)[0]',
		'array.splice(index)[0]',
		'array.splice(index)[offset]',
		'array.splice(index).at(0)',
		'object.array.splice(index)[0]',
		'array.splice(/* comment */ index)[0]',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.splice(index, 1 as const)[0]',
		'(array as string[])?.splice(index)[0]',
	],
	invalid: [
		'array.splice(index as number)[0]',
		'array.splice(<number>index)[0]',
		'array.splice(index!)[0]',
		'array.splice(index satisfies number)[0]',
		'(array as string[]).splice(index)[0]',
	],
});
