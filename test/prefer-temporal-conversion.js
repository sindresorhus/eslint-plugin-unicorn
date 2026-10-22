import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		[
			'function f() {return(Temporal.PlainDate).from(new Temporal.PlainDateTime(2026, /* keep */ 1, 1));}',
			'function f() {return new Temporal.PlainDateTime(2026, /* keep */ 1, 1).toPlainDate();}',
		],
		[
			'function f() {throw(Temporal.PlainDate).from(new Temporal.PlainDateTime(2026, /* keep */ 1, 1));}',
			'function f() {throw new Temporal.PlainDateTime(2026, /* keep */ 1, 1).toPlainDate();}',
		],
		[
			'function* f() {yield(Temporal.PlainDate).from(new Temporal.PlainDateTime(2026, /* keep */ 1, 1));}',
			'function* f() {yield new Temporal.PlainDateTime(2026, /* keep */ 1, 1).toPlainDate();}',
		],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		...[
			['Temporal.PlainDate.from(new Temporal.PlainDateTime(2026, /* keep */ 10, 21));', 'new Temporal.PlainDateTime(2026, /* keep */ 10, 21).toPlainDate();'],
			['Temporal.PlainTime.from((/* keep */ new Temporal.PlainDateTime(2026, 10, 21)));', '(/* keep */ new Temporal.PlainDateTime(2026, 10, 21)).toPlainTime();'],
			['Temporal.Instant.fromEpochNanoseconds(new Temporal.ZonedDateTime(0n, /* keep */ "UTC").epochNanoseconds);', 'new Temporal.ZonedDateTime(0n, /* keep */ "UTC").toInstant();'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-temporal-conversion'}]})),
		{
			code: 'Temporal.Instant.from(new Temporal.ZonedDateTime(0n, /* keep */ "UTC").toString());',
			errors: [{
				messageId: 'prefer-temporal-conversion',
				suggestions: [{messageId: 'prefer-temporal-conversion/suggestion', output: 'new Temporal.ZonedDateTime(0n, /* keep */ "UTC").toInstant();'}],
			}],
		},
	],
});

const zoned = 'const source = Temporal.ZonedDateTime.from("2024-01-02T03:04:05.123456789+00:00[UTC]");';
const dateTime = 'const source = Temporal.PlainDateTime.from("2024-01-02T03:04:05.123456789[u-ca=hebrew]");';
const dateFields = ['year', 'month', 'day'];
const timeFields = ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'];
const conversions = [
	[zoned, 'PlainDate', dateFields],
	[zoned, 'PlainTime', timeFields],
	[zoned, 'PlainDateTime', [...dateFields, ...timeFields]],
	[dateTime, 'PlainDate', dateFields],
	[dateTime, 'PlainTime', timeFields],
];

test({
	valid: [],
	invalid: [
		{
			code: 'Temporal.PlainDate.from((new Temporal.PlainDateTime(2026, 10, 21) as /* keep */ Temporal.PlainDateTime));',
			output: '(new Temporal.PlainDateTime(2026, 10, 21) as /* keep */ Temporal.PlainDateTime).toPlainDate();',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'Temporal.PlainTime.from(new Temporal.PlainDateTime(2026, // keep\r\n  10, 21));',
			output: 'new Temporal.PlainDateTime(2026, // keep\r\n  10, 21).toPlainTime();',
			errors: 1,
		},
		...[
			`${dateTime} Temporal.PlainDate.from(source.toString(/* keep */));`,
			`${dateTime} Temporal.PlainDate.from({year: source.year, month: (/* keep */ source).month, day: source.day, calendar: source.calendarId});`,
		].map(code => ({code, errors: [{messageId: 'prefer-temporal-conversion', suggestions: []}]})),
		{
			code: `${dateTime} Temporal.PlainDate.from(source.toString() as /* keep */ string);`,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-temporal-conversion', suggestions: []}],
		},
	],
});

// eslint-disable-next-line node-test/no-skip-test -- Temporal is unavailable on older supported Node.js versions.
nodeTest('commented Temporal conversions evaluate once and precision changes remain suggestions', {skip: globalThis.Temporal === undefined}, t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-temporal-conversion': rule}}},
		rules: {'unicorn/prefer-temporal-conversion': 'error'},
	};
	for (const [method, originalNanoseconds, autofix] of [['fromEpochNanoseconds', '123456789', true], ['fromEpochMilliseconds', '123000000', false]]) {
		const property = method === 'fromEpochNanoseconds' ? 'epochNanoseconds' : 'epochMilliseconds';
		const expression = `(Temporal.Instant).${method}(new Temporal.ZonedDateTime((evaluations++, /* keep */ 123456789n), "UTC").${property})`;
		const code = `let evaluations = 0; function convert() {return${expression};} const result = convert(); JSON.stringify({evaluations, nanoseconds: result.epochNanoseconds.toString()});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, autofix);
		let corrected = output;
		if (autofix) {
			t.assert.deepStrictEqual(messages, []);
		} else {
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(messages.length, 1);
			t.assert.strictEqual(messages[0].fix, undefined);
			t.assert.strictEqual(messages[0].suggestions?.length, 1);
			const {fix} = messages[0].suggestions[0];
			corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		}

		t.assert.ok(corrected.includes('/* keep */'));
		t.assert.strictEqual(runInNewContext(code, {Temporal}), JSON.stringify({evaluations: 1, nanoseconds: originalNanoseconds}));
		t.assert.strictEqual(runInNewContext(corrected, {Temporal}), '{"evaluations":1,"nanoseconds":"123456789"}');
	}
});

// Lock down the distinction between exact conversions and restoring discarded information.
test({
	valid: [],
	invalid: [
		{
			code: `${zoned} Temporal.Instant.fromEpochNanoseconds(source.epochNanoseconds);`,
			output: `${zoned} source.toInstant();`,
			errors: [{messageId: 'prefer-temporal-conversion'}],
		},
		{
			code: `${zoned} Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds);`,
			errors: [{messageId: 'prefer-temporal-conversion', suggestions: [{messageId: 'prefer-temporal-conversion/suggestion', output: `${zoned} source.toInstant();`}]}],
		},
		{
			code: `${dateTime} Temporal.PlainDate.from(({year: source.year, monthCode: source.monthCode, day: source.day} as Temporal.PlainDateLike));`,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-temporal-conversion', suggestions: [{messageId: 'prefer-temporal-conversion/suggestion', output: `${dateTime} source.toPlainDate();`}]}],
		},
	],
});

test.snapshot({
	valid: [
		'Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds)',
		'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day})',
		'const source = {epochNanoseconds: 1n}; new Temporal.Instant(source.epochNanoseconds)',
		'const source = new Other(); Temporal.PlainDate.from(source)',
		'const source = new Other(); Temporal.PlainDate.from(source.toString())',
		'let source = Temporal.Now.zonedDateTimeISO(); Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds)',
		'const source = Temporal["ZonedDateTime"].from(value); new Temporal.Instant(source.epochNanoseconds)',
		'const source = Temporal.ZonedDateTime.from?.(value); new Temporal.Instant(source.epochNanoseconds)',
		'const source = Temporal.Now.zonedDateTimeISO?.(); new Temporal.Instant(source.epochNanoseconds)',
		'const source = Temporal.ZonedDateTime.from(value, options, extra); new Temporal.Instant(source.epochNanoseconds)',
		'const source = Temporal.Now.zonedDateTimeISO("UTC", extra); new Temporal.Instant(source.epochNanoseconds)',
		'const source = Temporal.PlainDateTime.from(value); Temporal.PlainDateTime.from(source)',
		...[
			'Temporal.ZonedDateTime.from(source.toString())',
			'Temporal.PlainDate.from(source, options)',
			'Temporal.PlainYearMonth.from(source.toString())',
			'Temporal.Instant.fromEpochMilliseconds(source.epochNanoseconds)',
			'Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds + 1)',
			'Temporal.Instant.fromEpochMilliseconds(source?.epochMilliseconds)',
			'Temporal.Instant.fromEpochMilliseconds(source["epochMilliseconds"])',
			'Temporal.Instant["fromEpochMilliseconds"](source.epochMilliseconds)',
			'Temporal.Instant.fromEpochMilliseconds?.(source.epochMilliseconds)',
			'Temporal["Instant"].fromEpochMilliseconds(source.epochMilliseconds)',
			'Temporal.PlainDate.from(source.toString({calendarName: "never"}))',
			'Temporal.PlainDate.from(source.toString(), {})',
			'Temporal.PlainDate.from(source?.toString())',
			'Temporal.PlainDate.from(source.toString?.())',
			'Temporal.PlainDate.from(source.toString().slice(0, 10))',
			'Temporal.PlainDate.from({...source})',
			'Temporal.PlainDate.from({year: source.year, month: source.month})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: other.day})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day + 1})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day, extra: 1})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day, calendar: "iso8601"})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day, day: source.day})',
			'Temporal.PlainDate.from({["year"]: source.year, month: source.month, day: source.day})',
			'new Temporal.PlainDate(source.year, source.month, source.day, "iso8601")',
			'new Temporal.PlainTime(source.hour, source.minute)',
			'Temporal.Instant.fromEpochNanoseconds(...source.epochNanoseconds)',
			'Temporal.Instant.from(source.epochNanoseconds)',
			'new Temporal.Instant(source.epochMilliseconds)',
			'new Temporal.Instant(source.epochNanoseconds, extra)',
			'Temporal.PlainDate.fromEpochNanoseconds(source.epochNanoseconds)',
			'new Temporal.PlainDate(source.year, source.month)',
			'new Temporal.PlainDate(source.year, source.month, source.day, source.calendarId, extra)',
			'Temporal.PlainDate.from({year: source.year, month: source.month, monthCode: source.monthCode, day: source.day})',
			'Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day, calendar: source.calendarId, calendar: source.calendarId})',
			'Temporal.PlainDate.from({get year() { return source.year; }, month: source.month, day: source.day})',
			`Temporal.PlainTime.from({${timeFields.map(field => `${field}: source.${field}`).join(', ')}, calendar: source.calendarId})`,
			`new Temporal.PlainTime(${timeFields.map(field => `source.${field}`).join(', ')}, source.calendarId)`,
		].map(code => `${zoned} ${code}`),
		'new Temporal.PlainDate(Temporal.Now.plainDateTimeISO().year, Temporal.Now.plainDateTimeISO().month, Temporal.Now.plainDateTimeISO().day)',
		...['unknown', 'any', 'Temporal.PlainDate', 'Temporal.PlainDateTime | undefined', 'Temporal.PlainDateTime | string', 'PlainDateTime'].map(type => ({
			code: `function convert(source: ${type}) { return Temporal.PlainDate.from(source.toString()); }`,
			languageOptions: {parser: parsers.typescript},
		})),
		...['Instant', 'PlainDateTime'].map(target => ({
			code: `function convert(source: Temporal.ZonedDateTime | Temporal.PlainDateTime) { return Temporal.${target}.from(source.toString()); }`,
			languageOptions: {parser: parsers.typescript},
		})),
	],
	invalid: [
		...conversions.flatMap(([declaration, target, fields]) => {
			const monthCodeFields = fields.map(field => field === 'month' ? 'monthCode' : field);
			return [
				`${declaration} Temporal.${target}.from(source)`,
				`${declaration} Temporal.${target}.from(source.toString())`,
				`${declaration} Temporal.${target}.from(source.toJSON())`,
				`${declaration} new Temporal.${target}(${fields.map(field => `source.${field}`).join(', ')})`,
				`${declaration} Temporal.${target}.from({${fields.map(field => `${field}: source.${field}`).join(', ')}})`,
				...(target === 'PlainTime'
					? []
					: [
						`${declaration} Temporal.${target}.from({calendar: source.calendarId, ${fields.toReversed().map(field => `${field}: source.${field}`).join(', ')}})`,
						`${declaration} Temporal.${target}.from({${monthCodeFields.map(field => `${field}: source.${field}`).join(', ')}, calendar: source.calendarId})`,
						`${declaration} new Temporal.${target}(${fields.map(field => `source.${field}`).join(', ')}, source.calendarId)`,
					]),
			];
		}),
		`${zoned} new Temporal.Instant(source.epochNanoseconds)`,
		`${zoned} Temporal.Instant.from(source)`,
		`${zoned} Temporal.Instant.from(source.toJSON())`,
		'const source = Temporal.ZonedDateTime.from("1900-01-01T00:00[Europe/Paris]"); Temporal.Instant.from(source.toString())',
		'const source = Temporal.ZonedDateTime.from("1900-01-01T00:00[Europe/Paris]"); Temporal.Instant.from(source)',
		'const source = new Temporal.ZonedDateTime(-123456789n, "UTC"); Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds)',
		'const source = new Temporal.PlainDateTime(2024, 1, 2); Temporal.PlainDate.from(source.toString())',
		'Temporal.Instant.fromEpochNanoseconds(Temporal.Now.zonedDateTimeISO().epochNanoseconds)',
		'const source = Temporal.ZonedDateTime.from(value, options); Temporal.Instant.fromEpochNanoseconds(source.epochNanoseconds)',
		'Temporal.Instant.fromEpochNanoseconds(Temporal.Now.zonedDateTimeISO("UTC").epochNanoseconds)',
		'Temporal.PlainDate.from(Temporal.Now.plainDateTimeISO().toString())',
		'Temporal.PlainDate.from(Temporal.Now.plainDateTimeISO("UTC"))',
		`${zoned} const alias = source; Temporal.Instant.fromEpochNanoseconds(alias.epochNanoseconds)`,
		`${zoned} const other = Temporal.Now.zonedDateTimeISO(); Temporal.Instant.fromEpochNanoseconds((condition ? source : other).epochNanoseconds)`,
		`${zoned} Temporal.Instant.fromEpochNanoseconds((log(), source).epochNanoseconds)`,
		`${zoned} Temporal.PlainDate.from((log(), source).toString())`,
		`import {Temporal} from "@js-temporal/polyfill"; ${zoned} Temporal.Instant.fromEpochNanoseconds(source.epochNanoseconds)`,
		`${zoned} Temporal.Instant.fromEpochNanoseconds(/* retain */ source.epochNanoseconds)`,
		`${dateTime} Temporal.PlainDate.from(/* retain */ source)`,
		`${zoned} Temporal.Instant.fromEpochMilliseconds(source.epochMilliseconds /* retain */)`,
		`${zoned} Temporal.PlainDate.from({year: source.year, month: source.month, /* retain */ day: source.day})`,
		`${zoned} Temporal.Instant.fromEpochNanoseconds((source).epochNanoseconds).toString()`,
		`${zoned} function convert() { return Temporal.PlainDate.from(source.toString()); }`,
		{code: `${zoned} <div>{Temporal.PlainDate.from(source.toString())}</div>`, languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		...['source', '(source as Temporal.ZonedDateTime)', '(source satisfies Temporal.ZonedDateTime)', 'source!', '(<Temporal.ZonedDateTime>source)'].map(receiver => ({
			code: `function convert(source: Temporal.ZonedDateTime) { return Temporal.Instant.fromEpochNanoseconds(${receiver}.epochNanoseconds); }`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'const source = Temporal.Now.zonedDateTimeISO();\nfoo()\nTemporal.Instant.fromEpochNanoseconds((source as Temporal.ZonedDateTime).epochNanoseconds)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function convert(source: Temporal.PlainDateTime) { return Temporal.PlainDate.from({year: source.year, month: source.month, day: source.day, calendar: source.calendarId}); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function convert(source: Temporal.PlainDateTime) { return Temporal.PlainDate.from(source as Temporal.PlainDateTime); }',
			languageOptions: {parser: parsers.typescript},
		},
		`${zoned} Temporal.PlainDate.from({"year": source.year, "month": source.month, "day": source.day})`,
	],
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});
const types = 'declare namespace Temporal { class ZonedDateTime { epochNanoseconds: bigint; year: number; month: number; day: number; calendarId: string; } }';
test.snapshot({
	valid: [
		typeAware('class ZonedDateTime { epochNanoseconds: bigint; } declare function getSource(): ZonedDateTime; new Temporal.Instant(getSource().epochNanoseconds)'),
		...['undefined', 'string'].map(type => typeAware(`${types} declare function getSource(): Temporal.ZonedDateTime | ${type}; new Temporal.Instant(getSource().epochNanoseconds)`)),
		typeAware(`${types}
			declare function getSource(): Temporal.ZonedDateTime;
			Temporal.PlainDate.from({year: getSource().year, month: getSource().month, day: getSource().day, calendar: getSource().calendarId})
		`),
		typeAware(`${types}
			declare const holder: {source: Temporal.ZonedDateTime; other: Temporal.ZonedDateTime};
			Temporal.PlainDate.from({year: holder.source.year, month: holder.other.month, day: holder.source.day, calendar: holder.source.calendarId})
		`),
	],
	invalid: [
		typeAware(`${types} declare function getSource(): Temporal.ZonedDateTime; new Temporal.Instant(getSource().epochNanoseconds)`),
		typeAware(`${types} declare function getSource(): Temporal.ZonedDateTime; Temporal.Instant.from(getSource())`),
		typeAware(`export ${types} declare function getSource(): Temporal.ZonedDateTime; new Temporal.Instant(getSource().epochNanoseconds)`),
		typeAware(`${types}
			declare const holder: {source: Temporal.ZonedDateTime};
			Temporal.PlainDate.from({year: holder.source.year, month: holder.source.month, day: holder.source.day, calendar: holder.source.calendarId})
		`),
		// A namespaced `Temporal`, like from a polyfill
		typeAware(`
			declare namespace Polyfill { namespace Temporal { class ZonedDateTime { epochNanoseconds: bigint; } } }
			declare function getSource(): Polyfill.Temporal.ZonedDateTime;
			new Temporal.Instant(getSource().epochNanoseconds)
		`),
	],
});

const dateBag = '{year: source.year, month: source.month, day: source.day, calendar: source.calendarId}';
test.snapshot({
	valid: [],
	invalid: [
		...[
			`(${dateBag} as Temporal.PlainDateLike)`,
			`(${dateBag} satisfies Temporal.PlainDateLike)`,
			`(<Temporal.PlainDateLike>${dateBag})`,
			`(${dateBag})!`,
			`(${dateBag} as /* keep */ Temporal.PlainDateLike)`,
		].map(argument => ({
			code: `${dateTime} Temporal.PlainDate.from(${argument});`,
			languageOptions: {parser: parsers.typescript},
		})),
		...[
			'{year: source.year as number, month: (source.month satisfies number), day: source.day!, calendar: source.calendarId as string}',
			'source.toString() as string',
			'source.toJSON() satisfies string',
		].map(argument => ({
			code: `${dateTime} Temporal.PlainDate.from(${argument});`,
			languageOptions: {parser: parsers.typescript},
		})),
		...['PlainDate', 'PlainTime'].map(target => ({
			code: `function convert(source: Temporal.ZonedDateTime | Temporal.PlainDateTime) { return Temporal.${target}.from(source.toString()); }`,
			languageOptions: {parser: parsers.typescript},
		})),
	],
});

test({
	valid: [],
	invalid: [
		['new new Temporal.Instant(source.epochNanoseconds).constructor(0n);', 'new (source.toInstant()).constructor(0n);'],
		['new (new Temporal.Instant(source.epochNanoseconds)).constructor(0n);', 'new (source.toInstant()).constructor(0n);'],
		['const instant = new Temporal.Instant(source.epochNanoseconds);', 'const instant = source.toInstant();'],
	].map(([expression, output]) => ({code: `${zoned} ${expression}`, output: `${zoned} ${output}`, errors: 1})),
});

test({
	valid: [],
	invalid: [
		['new new Temporal.Instant(source.epochNanoseconds)!.constructor(0n);', 'new (source.toInstant())!.constructor(0n);'],
		['new (new Temporal.Instant(source.epochNanoseconds) as Temporal.Instant).constructor(0n);', 'new (source.toInstant() as Temporal.Instant).constructor(0n);'],
	].map(([expression, output]) => ({
		code: `${zoned} ${expression}`,
		output: `${zoned} ${output}`,
		errors: 1,
		languageOptions: {parser: parsers.typescript},
	})),
});

test({
	valid: [],
	invalid: [{
		code: `${zoned} new new Temporal.Instant(/* keep */ source.epochNanoseconds).constructor(0n);`,
		errors: 1,
	}],
});

test({
	valid: [],
	invalid: [{
		code: `${zoned} new new Temporal.PlainDate(source.year, source.month, source.day).constructor(2024, 1, 2);`,
		errors: [{
			messageId: 'prefer-temporal-conversion', suggestions: [{
				messageId: 'prefer-temporal-conversion/suggestion',
				output: `${zoned} new (source.toPlainDate()).constructor(2024, 1, 2);`,
			}],
		}],
	}],
});
