import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `Math.log10()` and `Math.log2()`
test.snapshot({
	valid: [
		'Math.log(x) * Math.LOG10E',
		'Math.LOG10E * Math.LOG10E',
		'Math.log(x) * Math[LOG10E]',
		'Math.log(x) * LOG10E',
		'Math[log](x) * Math.LOG10E',
		'foo.Math.log(x) * Math.LOG10E',
		'Math.log(x) * foo.Math.LOG10E',
		'Math.log(x) * Math.log(x)',
		'Math.log(x) * Math.NOT_LOG10E',
		'Math.log(x) * Math?.LOG10E',
		'Math?.log(x) * Math.LOG10E',
		'log(x) * Math.LOG10E',
		'new Math.log(x) * Math.LOG10E',
		'Math.not_log(x) + Math.LOG10E',
		'Math.log(x)[Math.LOG10E]',
		'Math.log() * Math.LOG10E',
		'Math.log(x, extraArgument) * Math.LOG10E',
		'Math.log(...x) * Math.LOG10E',

		'Math.log(x) / Math.LN10',
		'Math.log(x) / LN10',
		'Math.log(x) /Math[LN10]',
		'Math.log(x) / LN10',
		'Math[log](x) / Math.LN10',
		'foo.Math.log(x) / Math.LN10',
		'Math.log(x) / foo.Math.LN10',
		'Math.LN10 / Math.LN10',
		'Math.log(x) / Math.log(x)',
		'Math.log(x) / Math.NOT_LN10',
		'Math.log(x) / Math?.LN10',
		'Math?.log(x) / Math.LN10',
		'log(x) / Math.LN10',
		'new Math.log(x) / Math.LN10',
		'Math.not_log(x) + Math.LN10',
		'Math.log(x)[Math.LN10]',
		'Math.log() / Math.LN10',
		'Math.log(x, extraArgument) / Math.LN10',
		'Math.log(...x) / Math.LN10',
	].flatMap(code => [code, code.replaceAll('Math.LOG10E', 'Math.LOG2E').replaceAll('Math.LN10', 'Math.LN2')]),
	invalid: [
		'Math.log(x) * Math.LOG10E',
		'Math.LOG10E * Math.log(x)',
		'Math.log(x) / Math.LN10',
		'Math.log((( 0,x ))) * Math.LOG10E',
		'Math.LOG10E * Math.log((( 0,x )))',
		'Math.log((( 0,x ))) / Math.LN10',
	].flatMap(code => [code, code.replaceAll('Math.LOG10E', 'Math.LOG2E').replaceAll('Math.LN10', 'Math.LN2')]),
});
