import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'no-impossible-length-comparison';
const error = {messageId: MESSAGE_ID};
const lengthAlwaysFalseError = {message: 'This comparison is always false because `.length` is always a non-negative integer.'};
const lengthAlwaysTrueError = {message: 'This comparison is always true because `.length` is always a non-negative integer.'};
const sizeAlwaysTrueError = {message: 'This comparison is always true because `.size` is always a non-negative integer.'};

test({
	valid: [
		'if (array.length === 0) {}',
		'if (array.length <= 0) {}',
		'if (array.length > 0) {}',
		'if (array.length >= 1) {}',
		'if (array.length < minimumLength) {}',
		'if (array.length < Number.POSITIVE_INFINITY) {}',
		'if (array?.length >= 0) {}',
		'if ((array?.items).length >= 0) {}',
		'if ((array?.items).metadata.length >= 0) {}',
		'if (array["length"] < 0) {}',
		'if (this.length < 0) {}',
		'if (this.size < 0) {}',
		{
			code: 'if ((this as Foo).length < 0) {}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if ((<Foo>this).size === -1) {}',
			languageOptions: {parser: parsers.typescript},
		},
		'const value = {length: -1}; if (value.length < 0) {}',
		'const value = {size: "small"}; if (value.size < 0) {}',
		'const value = {length: NaN}; if (value.length < 0) {}',
		'const value = {length: Infinity}; if (value.length < 0) {}',
		'if (dimensions.width && dimensions.length < 0) {}',
		'if ((dimensions.width && dimensions.length < 0) || fallback) {}',
		'if (dimensions.height && dimensions.size === -1) {}',
		'if (dimensions.depth && -1 < dimensions.length) {}',
		'if (array.length !== 0) {}',
	],
	invalid: [
		{
			code: 'if (array.length < 0) {}',
			errors: [lengthAlwaysFalseError],
		},
		{
			code: 'if (array.length <= -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length === -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length == -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length !== -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length != -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length > -1) {}',
			errors: [error],
		},
		{
			code: 'if (array.length >= 0) {}',
			errors: [lengthAlwaysTrueError],
		},
		{
			code: 'if ((array.length) >= 0) {}',
			errors: [error],
		},
		{
			code: 'if (array.length < -Number.EPSILON) {}',
			errors: [error],
		},
		{
			code: 'if (0 > array.length) {}',
			errors: [error],
		},
		{
			code: 'if (0 <= array.length) {}',
			errors: [error],
		},
		{
			code: 'if (-1 >= array.length) {}',
			errors: [error],
		},
		{
			code: 'if (-1 !== array.length) {}',
			errors: [error],
		},
		{
			code: 'if (string.length === -1) {}',
			errors: [error],
		},
		{
			code: 'if (set.size <= -1) {}',
			errors: [error],
		},
		{
			code: 'if (set.size >= 0) {}',
			errors: [sizeAlwaysTrueError],
		},
		{
			code: 'if (-1 === set.size) {}',
			errors: [error],
		},
		{
			code: 'const negativeOne = -1; if (array.length === negativeOne) {}',
			errors: [error],
		},
		{
			code: 'if (array.length! < 0) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: 'if ((array.length as number) < 0) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: 'if (<number>array.length < 0) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: 'if ((array.length satisfies number) === -1) {}',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: outdent`
				if (
					array.length >= 0
					&& isArray(array)
				) {}
			`,
			errors: [error],
		},
		{
			code: 'if (dimensions.width && (dimensions.length < 0 || fallback)) {}',
			errors: [error],
		},
	],
});
