import test from 'ava';
import path from 'node:path';
import url from 'node:url';
import {execFileSync} from 'node:child_process';

test('No unnecessary polyfills avoids scanning every pattern for unrelated imports', t => {
	const cwd = path.dirname(path.dirname(path.dirname(url.fileURLToPath(import.meta.url))));
	const script = `
		import {ESLint} from 'eslint';
		import plugin from './index.js';

		const lintAndCountChecks = async moduleName => {
			let testCount = 0;
			const originalTest = RegExp.prototype.test;
			RegExp.prototype.test = function (...arguments_) {
				if (typeof this.source === 'string' && this.source.includes('mdn-polyfills') && this.source.includes('polyfill-')) {
					testCount++;
				}

				return Reflect.apply(originalTest, this, arguments_);
			};

			const eslint = new ESLint({
				overrideConfig: {
					plugins: {unicorn: plugin},
					languageOptions: {ecmaVersion: 'latest', sourceType: 'module'},
					rules: {'unicorn/no-unnecessary-polyfills': ['error', {targets: {node: '20'}}]},
				},
				overrideConfigFile: true,
				ignore: false,
			});

			try {
				const [result] = await eslint.lintText(\`import value from "\${moduleName}";\`, {filePath: 'fixture.js'});
				if (result.messages.length > 0) {
					throw new Error('Unexpected lint errors');
				}
			} finally {
				RegExp.prototype.test = originalTest;
			}

			return testCount;
		};

		const testCounts = {
			normalImport: await lintAndCountChecks('eslint-package'),
			polyfillPrefixImport: await lintAndCountChecks('polyfill-not-a-real-module'),
		};

		console.log(JSON.stringify(testCounts));
	`;
	const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {cwd, encoding: 'utf8'});
	const testCounts = JSON.parse(output.trim());

	t.true(Number.isFinite(testCounts.normalImport), `Expected numeric count output, got ${output}.`);
	t.true(Number.isFinite(testCounts.polyfillPrefixImport), `Expected numeric count output, got ${output}.`);
	t.true(testCounts.normalImport < 10, `Expected fewer than 10 polyfill regex checks for normal import, got ${testCounts.normalImport}.`);
	t.true(testCounts.polyfillPrefixImport < 20, `Expected fewer than 20 polyfill regex checks for polyfill-prefix import, got ${testCounts.polyfillPrefixImport}.`);
});
