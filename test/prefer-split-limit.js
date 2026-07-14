import {getTester, parsers} from './utils/test.js';

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
		'string.split("/")[4_294_967_295]',
		'string.split("/")[Number.MAX_SAFE_INTEGER]',
		'string.split("/")[0] = value',
		'string.split("/")[0]++',
		'delete string.split("/")[0]',
		'const [first] = string.split("/", 1)',
		'[first] = string.split("/", 1)',
		'const [] = string.split("/")',
		'const [first, ...remaining] = string.split("/")',
		'[first, ...remaining] = string.split("/")',
		'const parts = ([first] = string.split("/"))',
		'const [first] = string.split(separator)',
		'const [first] = string.split("")',
		'const [first] = [...string.split("/")]',
		'const {0: first} = string.split("/")',
		'for (const [first] of string.split("/")) {}',
		'for ([first] of string.split("/")) {}',
		{
			code: 'const [first] = string.split("/") as string[]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const [first] = string.split("/")!',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const [first] = string.split("/") satisfies string[]',
			languageOptions: {parser: parsers.typescript},
		},
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
			code: 'string.split("/")[4_294_967_294]',
			output: 'string.split("/", 4294967295)[4_294_967_294]',
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
		{
			code: 'const [first] = string.split("/")',
			output: 'const [first] = string.split("/", 1)',
			errors,
		},
		{
			code: 'const [first,] = string.split("/")',
			output: 'const [first,] = string.split("/", 1)',
			errors,
		},
		{
			code: 'const [first,,] = string.split("/")',
			output: 'const [first,,] = string.split("/", 2)',
			errors,
		},
		{
			code: 'const [, second] = string.split(/-/)',
			output: 'const [, second] = string.split(/-/, 2)',
			errors,
		},
		{
			code: 'const [first, , third] = string.split("/")',
			output: 'const [first, , third] = string.split("/", 3)',
			errors,
		},
		{
			code: 'const [first = defaultValue, [nested]] = string.split("/")',
			output: 'const [first = defaultValue, [nested]] = string.split("/", 2)',
			errors,
		},
		{
			code: '[first, second] = string.split("/")',
			output: '[first, second] = string.split("/", 2)',
			errors,
		},
		{
			code: 'const [first] = string.split(/* separator */ "/",)',
			output: 'const [first] = string.split(/* separator */ "/", 1,)',
			errors,
		},
		{
			code: 'const [first] = string?.split?.("/")',
			output: 'const [first] = string?.split?.("/", 1)',
			errors,
		},
		{
			code: 'const [first]: string[] = string.split("/")',
			output: 'const [first]: string[] = string.split("/", 1)',
			languageOptions: {parser: parsers.typescript},
			errors,
		},
	],
});
