import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-split-limit';
const errors = [
	{
		messageId: MESSAGE_ID,
	},
];

test({
	valid: [
		'string.split("/", 1)[0]',
		'string.split("/", 1).at(0)',
		'string.split("/").at(-1)',
		'string.split("/").at(numberVariable)',
		'string.split("/")[numberVariable]',
		'string.split(separator)[0]',
		'string.split(customSplitter)[0]',
		'string.split("")[0]',
		'string.split("/")[1.5]',
		'string.split("/")[0] = value',
		'string.split("/")[0]++',
		'delete string.split("/")[0]',
		'string.split("/", limit)[0]',
		'string.split(...separator)[0]',
		'string.split("/", ...limit)[0]',
		'string.split()[0]',
		'string.notSplit("/")[0]',
	],
	invalid: [
		{
			code: 'string.split("/")[0]',
			output: 'string.split("/", 1)[0]',
			errors,
		},
		{
			code: 'string.split("/")[1]',
			output: 'string.split("/", 2)[1]',
			errors,
		},
		{
			code: 'string.split("/")[2]',
			output: 'string.split("/", 3)[2]',
			errors,
		},
		{
			code: 'string.split("/").at(0)',
			output: 'string.split("/", 1).at(0)',
			errors,
		},
		{
			code: 'string.split("/").at(2)',
			output: 'string.split("/", 3).at(2)',
			errors,
		},
		{
			code: 'string.split(/,/)[1]',
			output: 'string.split(/,/, 2)[1]',
			errors,
		},
		{
			code: 'string.split(/* separator */ "/")[1]',
			output: 'string.split(/* separator */ "/", 2)[1]',
			errors,
		},
		{
			code: 'string.split("/" /* separator */)[1]',
			output: 'string.split("/" /* separator */, 2)[1]',
			errors,
		},
		{
			code: 'string.split("/",)[1]',
			output: 'string.split("/", 2,)[1]',
			errors,
		},
		{
			code: 'const index = 2;\nstring.split("/")[index]',
			output: 'const index = 2;\nstring.split("/", 3)[index]',
			errors,
		},
		{
			code: 'string?.split?.("/")[1]',
			output: 'string?.split?.("/", 2)[1]',
			errors,
		},
		{
			code: 'string.split("/")?.[1]',
			output: 'string.split("/", 2)?.[1]',
			errors,
		},
		{
			code: 'string?.split?.("/").at(1)',
			output: 'string?.split?.("/", 2).at(1)',
			errors,
		},
		{
			code: 'string.split("/")?.at(1)',
			output: 'string.split("/", 2)?.at(1)',
			errors,
		},
	],
});
