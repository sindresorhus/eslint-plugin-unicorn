import {testDisableDirectives} from './utils/test-disable-directives.js';

const cases = [
	['prefer-single-object-destructuring', 'const source = {}; const {@ a} = source; const {b} = source;'],
	['prefer-single-object-destructuring', 'const source = {}; const {a} = source; const {@ b} = source;'],
	['prefer-set-methods', 'const a = new Set(); const b = new Set(); new Set(@ [...a].filter(value => b.has(value)));'],
	['prefer-set-methods', 'const a = new Set(); const b = new Set(); a.intersection(b).size @ === 0;'],
	['prefer-short-arrow-method', 'const object = {first() { return 1; }, second() { @ return 2; }};', ['consistent-as-needed'], 2],
	['prefer-string-match-all', 'const string = "foo"; const regexp = /o/g; let @ match; while ((match = regexp.exec(string)) !== null) {}'],
	['prefer-string-match-all', 'const string = "foo"; const regexp = /o/g; let match; while ((match = @ regexp.exec(string)) !== null) {}'],
	['prefer-url-search-parameters', 'Object.fromEntries(query.split("&").map(@ part => part.split("=")));'],
	['prefer-url-search-parameters', 'new Map(query.split("&").map(@ part => part.split("=")));'],
	['prefer-url-search-parameters', 'new URLSearchParams(query.split("&").map(@ part => part.split("=")));'],
	['prefer-while-loop-condition', 'while (@ true) { if (done) { break; } work(); }'],
	['prefer-while-loop-condition', 'for (@;;) { if (done) { break; } work(); }'],
	['prefer-while-loop-condition', 'while (true) { if (@ done) { break; } work(); }'],
	['prefer-while-loop-condition', 'while (true) { if (done) { break; } @ work(); }'],
	['prefer-while-loop-condition', 'do { if (done) { break; } work(); } @ while (true);'],
	['prefer-while-loop-condition', 'do { if (done) { break; } work(); } while (true); @'],
];

for (const [ruleName, template, options, expectedReports] of cases) {
	testDisableDirectives(ruleName, template, {options, expectedReports});
}
