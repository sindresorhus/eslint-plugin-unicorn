import typedArray from '../shared/typed-array.js';
import builtinErrors from '../shared/builtin-errors.js';

const intlConstructors = [
	'Collator',
	'DateTimeFormat',
	'DisplayNames',
	'DurationFormat',
	'ListFormat',
	'Locale',
	'NumberFormat',
	'PluralRules',
	'RelativeTimeFormat',
	'Segmenter',
];

const temporalConstructors = [
	'Duration',
	'Instant',
	'PlainDate',
	'PlainDateTime',
	'PlainMonthDay',
	'PlainTime',
	'PlainYearMonth',
	'ZonedDateTime',
];

const webAssemblyConstructors = [
	'Module',
	'Instance',
	'Memory',
	'Table',
	'Global',
	'Tag',
	'Exception',
	'CompileError',
	'LinkError',
	'RuntimeError',
];

export const enforceNew = [
	'Object',
	'Array',
	'ArrayBuffer',
	'DataView',
	'Date',
	'Function',
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
	'Promise',
	'RegExp',
	'SharedArrayBuffer',
	'Proxy',
	'WeakRef',
	'FinalizationRegistry',
	'DisposableStack',
	'AsyncDisposableStack',
	...builtinErrors,
	...intlConstructors.map(name => `Intl.${name}`),
	...temporalConstructors.map(name => `Temporal.${name}`),
	...webAssemblyConstructors.map(name => `WebAssembly.${name}`),
	...typedArray,
];

export const disallowNew = [
	'BigInt',
	'Boolean',
	'Number',
	'String',
	'Symbol',
];

export const disallowCallOrNew = [
	'Temporal.Now',
	'WebAssembly',
	'WebAssembly.JSTag',
];
