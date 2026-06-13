import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo();',
		'foo(bar(baz()));',
		'foo(bar(), baz(), qux());',
		'query().filter().map().toArray();',
		'foo()[bar()]().baz();',
		'foo(() => bar(baz(qux())));',
		'foo(bar(class {field = baz(qux());}));',
		'foo(bar(class {static {baz(qux());}}));',
		'new Foo(new Bar(new Baz()));',
		'await foo(await bar(await baz()));',
		'foo?.(bar?.(baz?.()));',
		'foo(...bar(baz()));',
		'foo(condition ? bar(baz()) : qux());',
		{
			code: outdent`
				nativeDiffButtons.parentElement.after(
					tooltipped(
						{},
						<a className={cx('btn', isHidingWhitespace() && 'color-fg-subtle')} />,
					),
				);
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		{
			code: outdent`
				nativeDiffButtons.parentElement.after(
					tooltipped(
						{},
						<>{cx('btn', isHidingWhitespace() && 'color-fg-subtle')}</>,
					),
				);
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		{
			code: 'foo(bar(baz(qux())));',
			options: [{max: 4}],
		},
	],
	invalid: [
		'foo(bar(baz(qux())));',
		{
			code: 'foo(bar(baz()));',
			options: [{max: 2}],
		},
		'new Foo(new Bar(new Baz(new Qux())));',
		'await foo(await bar(await baz(await qux())));',
		'foo?.(bar?.(baz?.(qux?.())));',
		'foo(...bar(baz(qux())));',
		'foo(condition ? bar(baz(qux())) : zed());',
		'foo(class {field = bar(baz(qux(zed())));});',
		{
			code: '<Component value={foo(bar(baz(qux())))} />;',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			mergeReports(await pMap(
				await mergeWithFileConfigs(uniq(paths), inputOptions, configFiles),
				async ({files, options, prettierOptions}) => runEslint(files, buildConfig(options, prettierOptions), {isQuiet: options.quiet}),
			));
		`,
	],
});
