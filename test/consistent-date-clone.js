import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new Date(date)',
		'date.getTime()',
		'new Date(...date.getTime())',
		'new Date(getTime())',
		'new Date(date.getTime(), extraArgument)',
		'new Date(date.not_getTime())',
		'new Date(date?.getTime())',
		'new NotDate(date.getTime())',
		'new Date(date[getTime]())',
		'new Date(date.getTime(extraArgument))',
		'Date(date.getTime())',
		// We may support these cases in future, https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2437
		outdent`
			new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds(),
				date.getMilliseconds(),
			);
		`,
		outdent`
			new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds(),
			);
		`,
	],
	invalid: [
		'new Date(date.getTime())',
		'new Date(date.getTime(),)',
		// Nested: both levels are flagged
		'new Date(new Date(date.getTime()).getTime())',
		'new Date((0, date).getTime())',
		'new Date(date.getTime(/* comment */))',
		'new Date(date./* comment */getTime())',
		// TypeScript type assertion on the date object is preserved
		{code: 'new Date((date as Date).getTime())', languageOptions: {parser: parsers.typescript}},
	],
});
