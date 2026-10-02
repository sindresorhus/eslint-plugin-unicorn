import test from 'ava';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const instant = 'Temporal.Instant.fromEpochMilliseconds(0)';
const duration = 'Temporal.Duration.from({hours: 1})';
const yearMonthForbiddenFields = ['weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'];
const receivers = {
	Instant: instant,
	Duration: duration,
	PlainTime: 'new Temporal.PlainTime()',
	PlainDate: 'Temporal.PlainDate.from("2024-01-01")',
	PlainYearMonth: 'Temporal.PlainYearMonth.from("2024-01")',
	PlainDateTime: 'Temporal.PlainDateTime.from("2024-01-01T00:00")',
	ZonedDateTime: 'Temporal.ZonedDateTime.from("2024-01-01T00:00+00:00[UTC]")',
};

ruleTest({
	valid: [`${instant}.add({hours: 24})`],
	invalid: [
		{code: `${instant}.add({days: 1, hours: 1})`, errors: [{messageId: 'instant-calendar-unit', suggestions: []}]},
		{code: 'Temporal.Duration.from({months: 1}).total("days")', errors: [{messageId: 'relative-to'}]},
		{code: `${duration}.add({months: 1})`, errors: [{messageId: 'duration-calendar-unit'}]},
		{code: `${instant}.round("day")`, errors: [{messageId: 'invalid-option'}]},
	],
});

ruleTest({
	valid: [`const value = condition ? ${instant} : ${receivers.PlainDate}; value.add({days: 1, hours: 1});`],
	invalid: [{
		code: `const value = condition ? ${instant} : new Temporal.Instant(0n); value.add({days: 1, hours: 1});`,
		errors: [{messageId: 'instant-calendar-unit', suggestions: []}],
	}],
});

ruleTest.snapshot({
	valid: [
		'unknown.add({days: 1})',
		...['add', 'subtract'].flatMap(method => [
			`${instant}.${method}({days: 0, hours: 24})`,
			`${instant}.${method}("PT24H")`,
			`${instant}.${method}({days: unknown})`,
			`${instant}.${method}({...unknown, days: 1})`,
			`${instant}.${method}({["days"]: 1})`,
			`${instant}.${method}({get days() { return 1; }})`,
			`${instant}.${method}({__proto__: unknown, days: 1})`,
			`${instant}.${method}({days: 1, days: 0})`,
			`${instant}.${method}(...arguments_)`,
			`${duration}.${method}({days: 1})`,
			`${receivers.PlainTime}.${method}({years: 1})`,
		]),
		'const bag = {days: 1}; bag.days = 0; Temporal.Now.instant().add(bag)',
		'let value = Temporal.Now.instant(); value = unknown; value.add({days: 1})',
		'const value = Temporal.Now.instant().add({hours: 1}); value.add({days: 1})',
		'const constructor = Temporal.Instant; new constructor().add({days: 1})',
		...['P', 'P1DT', 'p1d', 'PT1.5H', 'P9007199254740992D'].map(value => `${instant}.add("${value}")`),
		'Temporal.Duration.from({days: 1}).total("hours")',
		'Temporal.Duration.from({months: 1}).total({unit: "day", relativeTo: "2024-01-01"})',
		`${duration}.total({unit: "month", relativeTo: unknown})`,
		`${duration}.total({unit: "month", ...unknown})`,
		`${duration}.total({unit: "hour", roundingIncrement: 0})`,
		'Temporal.Duration.compare({months: 1}, unknown)',
		'Temporal.Duration.compare({months: 1}, "P1M")',
		'Temporal.Duration.compare(new Temporal.Duration(0, "1"), {months: 1, days: undefined})',
		'Temporal.Duration.compare("P1MT0.123456789S", {months: 1, milliseconds: 123, microseconds: 456, nanoseconds: 789})',
		'Temporal.Duration.compare({days: 1}, {hours: 24})',
		'Temporal.Duration.compare({months: 1}, {months: 1, hours: unknown})',
		`${duration}.round({largestUnit: "auto"})`,
		`${duration}.round({largestUnit: "hour", unit: "invalid"})`,
		`${duration}.round({smallestUnit: "minute", roundingIncrement: 1.9})`,
		`${duration}.round({smallestUnit: "minute", roundingIncrement: "15"})`,
		`${duration}.round({smallestUnit: unknown, roundingIncrement: 7})`,
		'Temporal.Duration.from({days: 2}).round({smallestUnit: "day", roundingIncrement: 3})',
		'Temporal.Duration.from(unknown).round({smallestUnit: "day", roundingIncrement: 3})',
		'Temporal.Duration.from({months: 1}).round({smallestUnit: "month", relativeTo: "2024-01-01"})',
		`${instant}.round({smallestUnit: "hour", roundingIncrement: 24})`,
		`${instant}.round({smallestUnit: "minute", roundingIncrement: 90})`,
		`${instant}.round({smallestUnit: "minute", largestUnit: "invalid"})`,
		`${receivers.PlainDateTime}.round("day")`,
		`${receivers.PlainDate}.until(other, {smallestUnit: "day", roundingIncrement: 3})`,
		`${receivers.PlainYearMonth}.since(other, {smallestUnit: "month", roundingIncrement: 3})`,
		`${instant}.until(other, {smallestUnit: "hour", largestUnit: "auto"})`,
	],
	invalid: [
		...['add', 'subtract'].flatMap(method => [
			...['years', 'months', 'weeks', 'days'].flatMap(unit => [1, -1].map(value => `${instant}.${method}({${unit}: ${value}})`)),
			`${instant}.${method}({days: "1"})`,
			`${instant}.${method}({days: true})`,
			`${instant}.${method}({days: 0, days: 2})`,
			`${instant}.${method}({days: 1, minutes: 30})`,
			...['P1Y', '-P1M', '+P1W', 'P1DT2H', 'P1DT0.123456789S'].map(value => `${instant}.${method}("${value}")`),
			`${instant}.${method}(new Temporal.Duration(0, 0, 0, 1))`,
			`${instant}.${method}(Temporal.Duration.from({days: 1}))`,
			`${instant}.${method}({days: 1 /* keep */ + 1})`,
			...['years', 'months', 'weeks'].flatMap(unit => [
				`${duration}.${method}({${unit}: 1})`,
				`Temporal.Duration.from({${unit}: 1}).${method}({seconds: 0})`,
			]),
			`Temporal.Now.instant().${method}({days: 1})`,
			`new Temporal.Instant(0n).${method}({days: 1})`,
			`Temporal.Instant.fromEpochNanoseconds(0n).${method}({days: 1})`,
			...['PlainDate', 'PlainDateTime', 'PlainYearMonth', 'ZonedDateTime'].map(type => `${receivers[type]}.${method}({months: 1}, {overflow: "ignore"})`),
		]),
		`const value = ${instant}; const alias = value; alias["add"]({days: 1})`,
		`const value = ${instant}; value?.subtract?.({days: 1})`,
		'const value = new Temporal.Duration(0, 1); const alias = value; alias.total("days")',
		...['year', 'months', 'week'].map(unit => `${duration}.total("${unit}")`),
		...['years', 'months', 'weeks'].map(unit => `Temporal.Duration.from({${unit}: -1}).total("hour")`),
		'Temporal.Duration.from("P1MT0.123456789S").total("seconds")',
		`${duration}.total({unit: "months", relativeTo: undefined})`,
		`${duration}.total({unit: "month", relativeTo: void 0})`,
		`${duration}.total({unit: "auto"})`,
		`${duration}.total({unit: "fortnight"})`,
		`${duration}.total({unit: 1})`,
		`${duration}.total({})`,
		`${duration}.total()`,
		`${duration}.total({smallestUnit: "hour"})`,
		`${duration}.total({smallestUnit: "month"})`,
		'Temporal.Duration.compare({months: 1}, {days: 30})',
		'Temporal.Duration.compare("P1Y", new Temporal.Duration(0, 12))',
		'Temporal.Duration.compare({months: 1, hours: 1}, {months: 1, minutes: 60})',
		'Temporal.Duration.compare("P1MT0.123456789S", {months: 1, milliseconds: 123, microseconds: 456, nanoseconds: 788})',
		...['Instant', 'Duration', 'PlainTime', 'PlainDateTime', 'ZonedDateTime'].flatMap(type => [
			`${receivers[type]}.round({})`,
			`${receivers[type]}.round()`,
			`${receivers[type]}.round({unit: "minute"})`,
			`${receivers[type]}.round({smallestUnit: "auto"})`,
			`${receivers[type]}.round({smallestUnit: "minute", roundingMode: "nearest"})`,
			...[0, -1, 1_000_000_001, 'NaN', 'Infinity', '1n'].map(increment => `${receivers[type]}.round({smallestUnit: "minute", roundingIncrement: ${increment}})`),
		]),
		`${duration}.round({smallestUnit: "minute", roundingIncrement: 7})`,
		`${duration}.round({smallestUnit: "hour", roundingIncrement: 24})`,
		`${duration}.round({smallestUnit: "hour", largestUnit: "minute"})`,
		`${duration}.round({smallestUnit: "month"})`,
		`${duration}.round({largestUnit: "year"})`,
		'Temporal.Duration.from({months: 1}).round({largestUnit: "hour"})',
		'Temporal.Duration.from({months: 1}).round({smallestUnit: "day", roundingIncrement: 2, relativeTo: "2024-01-01"})',
		`${instant}.round("day")`,
		`${instant}.round({smallestUnit: "minute", roundingIncrement: 100})`,
		`${receivers.PlainTime}.round({smallestUnit: "hour", roundingIncrement: 24})`,
		`${receivers.PlainDateTime}.round("month")`,
		`${receivers.ZonedDateTime}.round({smallestUnit: "day", roundingIncrement: 2})`,
		...['since', 'until'].flatMap(method => [
			`${instant}.${method}(other, {largestUnit: "day"})`,
			`${receivers.PlainTime}.${method}(other, {smallestUnit: "day"})`,
			`${receivers.PlainDate}.${method}(other, {smallestUnit: "hour"})`,
			`${receivers.PlainYearMonth}.${method}(other, {smallestUnit: "week"})`,
			`${receivers.PlainDateTime}.${method}(other, {largestUnit: "minute", smallestUnit: "hour"})`,
			`${receivers.ZonedDateTime}.${method}(other, {smallestUnit: "minute", roundingIncrement: 60})`,
		]),
	],
});

ruleTest.snapshot({
	valid: ['Temporal.Instant | Temporal.PlainDate', 'Temporal.Instant | undefined', 'Custom'].map(type => ({
		code: `function run(value: ${type}) { value?.add({days: 1}); }`,
		languageOptions: {parser: parsers.typescript},
	})),
	invalid: [
		{code: 'function run(value: Temporal.Instant) { value.add({days: 1}); }', languageOptions: {parser: parsers.typescript}},
		{code: '(value as Temporal.Instant)!.subtract(({days: 1} satisfies Temporal.DurationLike))', languageOptions: {parser: parsers.typescript}},
		{code: '(<Temporal.Instant>value).add({days: 1})', languageOptions: {parser: parsers.typescript}},
		{code: `const value = ${instant}; (value satisfies Temporal.Instant).add({days: 1})`, languageOptions: {parser: parsers.typescript}},
		{code: 'function run(value: Temporal.Duration) { value.total("month"); }', languageOptions: {parser: parsers.typescript}},
		...['as', 'satisfies'].map(operator => ({
			code: `const value = Temporal.Duration.from({months: 1}) ${operator} Temporal.Duration; value.total("hours");`,
			languageOptions: {parser: parsers.typescript},
		})),
		{code: 'function run<Value extends Temporal.Instant>(value: Value) { value.add<Temporal.DurationLike>({days: 1}); }', languageOptions: {parser: parsers.typescript}},
		{code: '<div>{Temporal.Now.instant().add({days: 1})}</div>', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
	],
});

const typeAware = code => ({code, filename: 'file.ts', languageOptions: {parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}}});
const types = 'declare namespace Temporal { class Instant { private brand: unknown; add(value: object): Instant; } class Duration { private brand: unknown; total(value: string): number; } }';
ruleTest.snapshot({
	valid: [
		typeAware('class Instant { add(value: object): void; } declare function getValue(): Instant; getValue().add({days: 1})'),
		typeAware(`${types} declare function getValue(): Temporal.Instant | undefined; getValue()?.add({days: 1})`),
	],
	invalid: [
		typeAware(`${types} declare function getValue(): Temporal.Instant; getValue().add({days: 1})`),
		typeAware(`export ${types} declare const holder: {value: Temporal.Instant}; holder.value.add({days: 1})`),
		typeAware(`${types} declare function getValue(): Temporal.Duration; getValue().total("month")`),
	],
});

ruleTest.snapshot({
	valid: [
		...['ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven'].map(mode => `${duration}.round({smallestUnit: "second", roundingMode: "${mode}"})`),
		...['true', '"1e0"', 'undefined', '15.9', '{valueOf() { throw new Error(); }}'].map(value => `${duration}.round({smallestUnit: "minute", roundingIncrement: ${value}})`),
		...['millisecond', 'microsecond', 'nanosecond'].map(unit => `${receivers.PlainTime}.round({smallestUnit: "${unit}", roundingIncrement: 500})`),
		`${instant}.round({smallestUnit: "minute", roundingIncrement: 1440})`,
		`${instant}.round({smallestUnit: "minutes", roundingIncrement: 90.9})`,
		`${instant}.round({smallestUnit: "second", roundingIncrement: 86400})`,
		`${instant}.round({smallestUnit: "millisecond", roundingIncrement: 86400000})`,
		`${instant}.round({smallestUnit: "microsecond", roundingIncrement: 864000000})`,
		`${instant}.round({smallestUnit: "nanosecond", roundingIncrement: 1000000000})`,
		'Temporal.Duration.from("PT0.123456789S").total("nanoseconds")',
		'Temporal.Duration.from("-P0Y0M0W1DT2H").round("hours")',
		'Temporal.Duration.from({years: 0, months: 0, weeks: 0}).total("days")',
		'new Temporal.Duration().round({smallestUnit: "day", roundingIncrement: 3})',
		'Temporal.Duration.from({years: unknown, days: 1}).round({smallestUnit: "day", roundingIncrement: 3})',
		'Temporal.Duration.compare("-P1M", {months: -1}, {relativeTo: undefined})',
		'Temporal.Duration.compare({weeks: 1}, {days: 7}, {relativeTo: context})',
		'const options = {smallestUnit: "invalid"}; Temporal.Now.instant().round(options)',
		'const amount = unknown; Temporal.Now.instant().round({smallestUnit: "minute", roundingIncrement: amount})',
		'const amount = {valueOf() { return 1; }}; Temporal.Now.instant().add({days: amount})',
		'const value = value; Temporal.Now.instant().add(value)',
		'Temporal.Now.instant()[method]({days: 1})',
		...Object.entries(receivers).map(([type, receiver]) => `${receiver}.add({${type === 'PlainYearMonth' ? 'months' : 'hours'}: 1}, {overflow: undefined})`),
		...['PlainDate', 'PlainDateTime', 'PlainYearMonth', 'ZonedDateTime'].flatMap(type => ['constrain', 'reject'].map(overflow => `${receivers[type]}.add({months: 1}, {overflow: "${overflow}"})`)),
		...['Instant', 'Duration', 'PlainTime'].map(type => `${receivers[type]}.add({hours: 1}, {overflow: "invalid"})`),
		...['Instant', 'PlainTime', 'PlainDate', 'PlainYearMonth', 'PlainDateTime', 'ZonedDateTime'].map(type => `${receivers[type]}.since(other, {largestUnit: "auto"})`),
		`${receivers.PlainDate}.until(other, {largestUnit: "month", roundingIncrement: 1000000000})`,
		`${receivers.PlainYearMonth}.until(other, {largestUnit: "month"})`,
		`${receivers.PlainDateTime}.until(other, {smallestUnit: "year"})`,
		`${receivers.ZonedDateTime}.since(other, {smallestUnit: "day", roundingIncrement: 3})`,
		`${instant}.until(other, {smallestUnit: "hour"})`,
		`${duration}.round({smallestUnit: "minute", largestUnit: unknown})`,
		{code: 'const bag = ({months: 1} as Temporal.DurationLike); bag.months = 0; Temporal.Duration.compare(bag, {days: 1})', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		...['false', 'null', '0.9', '14.9', '"not a number"', 'Symbol.iterator'].map(value => `${duration}.round({smallestUnit: "minute", roundingIncrement: ${value}})`),
		...['millisecond', 'microsecond', 'nanosecond'].map(unit => `${receivers.PlainTime}.round({smallestUnit: "${unit}", roundingIncrement: 1000})`),
		`${instant}.round({smallestUnit: "hour", roundingIncrement: 25})`,
		`${instant}.round({smallestUnit: "nanosecond", roundingIncrement: 1000000001})`,
		`${instant}.round({smallestUnit: "minute", roundingIncrement: 1439})`,
		`${instant}.round({smallestUnit: "microsecond", roundingIncrement: 864000001})`,
		`${receivers.PlainDateTime}.round({smallestUnit: "day", roundingIncrement: 2})`,
		...['years', 'months', 'weeks'].map(unit => `Temporal.Duration.from({${unit}: 1}).round({smallestUnit: "${unit}", roundingIncrement: 2, largestUnit: "day", relativeTo: "2024-01-01"})`),
		'Temporal.Duration.from({years: 1}).round({smallestUnit: "month", roundingIncrement: 2, relativeTo: "2024-01-01"})',
		'Temporal.Duration.compare("P1M", "P2M", {relativeTo: undefined})',
		'const text = "P1D"; const alias = text; Temporal.Now.instant().add(alias)',
		'const value = Temporal.Duration.from("P1M"); const alias = value; alias.add({hours: 1}, {relativeTo: "2024-01-01"})',
		'Temporal.Now.plainTimeISO().round("days")',
		'Temporal.Now.plainDateTimeISO().round("years")',
		'Temporal.Now.zonedDateTimeISO().round("weeks")',
		'Temporal.Now.plainDateISO().until(other, {smallestUnit: "nanosecond"})',
		'Temporal.Instant.from("1970-01-01T00:00Z")["round"]("days")',
		`${duration}.total({"unit": "hours", unit: "invalid"})`,
		`${duration}.round({smallestUnit: "hour", roundingMode: undefined, roundingIncrement: 24})`,
	],
});

const suggestions = [
	[`${instant}.add({days: -2})`, `${instant}.add({hours: -48})`],
	[`const days = 1 + 1; ${instant}.add({days})`, `const days = 1 + 1; ${instant}.add({hours: 48})`],
	[`const days = 2; ${instant}.add({days})`, `const days = 2; ${instant}.add({hours: 48})`],
	[`const days = 2; ${instant}.add({days /* keep */})`, `const days = 2; ${instant}.add({hours: 48 /* keep */})`],
	[`${instant}.subtract({/* before */ "days": (/* keep */ 2) /* after */})`, `${instant}.subtract({/* before */ hours: (/* keep */ 48) /* after */})`],
	[`${duration}.total({/* keep */ smallestUnit: "hours"})`, `${duration}.total({/* keep */ unit: "hours"})`],
	[`${duration}.round({unit: "minute", roundingIncrement: 15})`, `${duration}.round({smallestUnit: "minute", roundingIncrement: 15})`],
	[`${duration}.total({"smallestUnit" /* keep */: "hours"})`, `${duration}.total({unit /* keep */: "hours"})`],
	[`${duration}.total({smallestUnit: "invalid", smallestUnit: "hour"})`, `${duration}.total({smallestUnit: "invalid", unit: "hour"})`],
	[`const smallestUnit = "hours"; ${duration}.total({/* before */ smallestUnit /* after */})`, `const smallestUnit = "hours"; ${duration}.total({/* before */ unit: smallestUnit /* after */})`],
	[`const unit = "minutes"; ${duration}.round({unit, roundingIncrement: 15})`, `const unit = "minutes"; ${duration}.round({smallestUnit: unit, roundingIncrement: 15})`],
	[`const smallestUnit = "hours"; ${duration}.total({smallestUnit: "invalid", smallestUnit})`, `const smallestUnit = "hours"; ${duration}.total({smallestUnit: "invalid", unit: smallestUnit})`],
	[`${instant}.add({\r\n  days: 1\r\n})`, `${instant}.add({\r\n  hours: 24\r\n})`],
	[
		'const days = 2; (value as Temporal.Instant)!.add(({days} satisfies Temporal.DurationLike));',
		'const days = 2; (value as Temporal.Instant)!.add(({hours: 48} satisfies Temporal.DurationLike));',
		typescriptEslintParser,
	],
	[
		'const days = 2; (value as Temporal.Instant).add({days: days as number});',
		'const days = 2; (value as Temporal.Instant).add({hours: 48});',
		typescriptEslintParser,
	],
	[
		'function run(value: Temporal.Duration) { value.round({unit: "minutes"}); }',
		'function run(value: Temporal.Duration) { value.round({smallestUnit: "minutes"}); }',
		typescriptEslintParser,
	],
	[
		'const unit = "minutes" as const; (value as Temporal.Duration).round(({/* keep */ unit} satisfies Temporal.DurationRoundTo));',
		'const unit = "minutes" as const; (value as Temporal.Duration).round(({/* keep */ smallestUnit: unit} satisfies Temporal.DurationRoundTo));',
		typescriptEslintParser,
	],
	[
		'const smallestUnit: string = "hours"; (value as Temporal.Duration).total({smallestUnit});',
		'const smallestUnit: string = "hours"; (value as Temporal.Duration).total({unit: smallestUnit});',
		typescriptEslintParser,
	],
	[
		'const unit = "minute"; (value as Temporal.Instant)?.round?.({unit /* trailing */});',
		'const unit = "minute"; (value as Temporal.Instant)?.round?.({smallestUnit: unit /* trailing */});',
		typescriptEslintParser,
	],
];

for (const [code, output, parser] of suggestions) {
	test(`suggestion: ${code}`, t => {
		const linter = new Linter();
		const config = {files: ['**'], plugins: {unicorn: plugin}, rules: {'unicorn/no-invalid-temporal-arithmetic': 'error'}};
		if (parser) {
			config.languageOptions = {parser};
		}

		const filename = parser ? 'file.ts' : 'file.js';
		const problems = linter.verify(code, config, {filename});
		t.is(problems.length, 1);
		t.is(problems[0].fix, undefined);
		t.is(problems[0].suggestions?.length, 1);
		const {fix} = problems[0].suggestions[0];
		const result = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.is(result, output);
		t.deepEqual(linter.verify(result, config, {filename}), []);
	});
}

test('coexists with existing Temporal rules', t => {
	const ruleNames = ['no-invalid-temporal-arithmetic', 'no-unused-builtin-method-return', 'prefer-temporal', 'prefer-temporal-conversion', 'new-for-builtins', 'no-invalid-argument-count'];
	const rules = Object.fromEntries(ruleNames.map(name => [`unicorn/${name}`, 'error']));
	const linter = new Linter();
	for (const code of ['new Temporal.Instant(0n).add({days: 1});', `${duration}.round({unit: "minute"});`]) {
		const config = {plugins: {unicorn: plugin}, rules};
		const problems = linter.verify(code, config);
		t.deepEqual(problems.map(problem => problem.ruleId).toSorted((first, second) => first.localeCompare(second)), [
			'unicorn/no-invalid-temporal-arithmetic',
			'unicorn/no-unused-builtin-method-return',
		]);
		const {fix} = problems.find(problem => problem.ruleId === 'unicorn/no-invalid-temporal-arithmetic').suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.false(linter.verify(output, config).some(problem => problem.ruleId === 'unicorn/no-invalid-temporal-arithmetic'));
	}
});

test('reports without changing source or offering incomplete corrections', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-invalid-temporal-arithmetic': 'error'}};
	const cases = [
		`${instant}.add("P1D")`,
		`${instant}.add(Temporal.Duration.from({days: 1}))`,
		`${instant}.add({days: 1, hours: 1})`,
		`${instant}.add({days: 375299968947542})`,
		`${instant}.add({days: 1 /* preserve */ + 1})`,
		`${instant}.add({days: - /* preserve */ 1})`,
		`${duration}.total({smallestUnit: "month"})`,
		`${duration}.total({smallestUnit: "invalid"})`,
		`${duration}.round({unit: "minute", roundingIncrement: 7})`,
		`${duration}.round({smallestUnit: undefined, unit: "minute"})`,
		`const smallestUnit = "month"; ${duration}.total({smallestUnit})`,
		`const unit = "minute"; ${duration}.round({unit, roundingIncrement: 7})`,
		`let smallestUnit = "hours"; smallestUnit = "invalid"; ${duration}.total({smallestUnit})`,
		`${receivers.PlainYearMonth}.add({days: 1})`,
	];
	for (const code of cases) {
		const problems = linter.verify(code, config);
		t.is(problems.length, 1);
		t.is(problems[0].suggestions, undefined);
		const result = linter.verifyAndFix(code, config);
		t.false(result.fixed);
		t.is(result.output, code);
	}
});

ruleTest.snapshot({
	valid: [
		`let days = 1; days = 0; ${instant}.add({days})`,
		...['add', 'subtract'].flatMap(method => [
			...yearMonthForbiddenFields.map(field => `${receivers.PlainYearMonth}.${method}({months: 1, ${field}: 0})`),
			`${receivers.PlainYearMonth}.${method}("P1Y2M")`,
			`${receivers.PlainYearMonth}.${method}("PT0S")`,
			`${receivers.PlainYearMonth}.${method}({days: unknown})`,
			`${receivers.PlainYearMonth}.${method}({days: 1, days: 0})`,
			`${receivers.PlainYearMonth}.${method}({...unknown, days: 1})`,
			`${receivers.PlainYearMonth}.${method}({["days"]: 1})`,
			`${receivers.PlainYearMonth}.${method}(new Temporal.Duration(...fields))`,
		]),
		`const amount = {days: 1}; amount.days = 0; ${receivers.PlainYearMonth}.add(amount)`,
	],
	invalid: [
		...['add', 'subtract'].flatMap(method => [
			...yearMonthForbiddenFields.flatMap(field => [1, -1].map(value => `${receivers.PlainYearMonth}.${method}({${field}: ${value}})`)),
			...['P1W', '-P1D', 'PT1H', 'PT0.000000001S'].map(value => `${receivers.PlainYearMonth}.${method}("${value}")`),
			`${receivers.PlainYearMonth}.${method}(new Temporal.Duration(0, 0, 0, 1))`,
			`${receivers.PlainYearMonth}.${method}(Temporal.Duration.from({hours: 1}))`,
			`${receivers.PlainYearMonth}.${method}({days: 0, days: 1})`,
			`${receivers.PlainYearMonth}.${method}({days: unknown, hours: 1})`,
		]),
		`const amount = Temporal.Duration.from({days: 1}); ${receivers.PlainYearMonth}.add(amount)`,
		`const value = ${receivers.PlainYearMonth}; value?.["subtract"]?.({"days": 1})`,
		{code: 'function run(value: Temporal.PlainYearMonth) { value.add(({days: 1} satisfies Temporal.DurationLike)); }', languageOptions: {parser: parsers.typescript}},
	],
});

ruleTest({
	valid: [],
	invalid: [{code: `${receivers.PlainYearMonth}.add({days: 1}, {overflow: "invalid"})`, errors: [{messageId: 'invalid-option', suggestions: []}]}],
});

ruleTest({
	valid: [
		...['year', 'month', 'week'].map(unit => `${duration}.round({smallestUnit: "${unit}", largestUnit: "${unit}", roundingIncrement: 2, relativeTo: "2024-01-01"})`),
		...['PlainDateTime', 'ZonedDateTime'].map(type => `${receivers[type]}.round({smallestUnit: "day", roundingIncrement: 1})`),
		`${receivers.PlainDate}.until(other, {smallestUnit: "week", largestUnit: "month", roundingIncrement: 2})`,
	],
	invalid: [{
		code: 'Temporal.Duration.from({months: 1}).round({smallestUnit: "week", roundingIncrement: 2, relativeTo: "2024-01-01"})',
		errors: [{messageId: 'invalid-increment', suggestions: []}],
	}],
});

test('reports one problem in contract validation order', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-invalid-temporal-arithmetic': 'error'}};
	const receiver = 'Temporal.Duration.from({months: 1})';
	const cases = [
		['{smallestUnit: "invalid", roundingIncrement: 0}', 'invalid-option', '"invalid"'],
		['{unit: "month", roundingIncrement: 0}', 'invalid-increment', '0'],
		['{}', 'missing-unit', 'round'],
		['{largestUnit: "hour", smallestUnit: "day"}', 'unit-order', '"hour"'],
		['{smallestUnit: "hour", roundingIncrement: 24}', 'invalid-increment', '24'],
	];
	for (const [options, messageId, location] of cases) {
		const code = `${receiver}.round(${options});`;
		const problems = linter.verify(code, config);
		t.is(problems.length, 1);
		t.is(problems[0].messageId, messageId);
		t.is(problems[0].column, code.indexOf(location) + 1);
		t.is(problems[0].endColumn, code.indexOf(location) + location.length + 1);
		t.is(problems[0].fix, undefined);
		t.is(problems[0].suggestions, undefined);
	}
});
