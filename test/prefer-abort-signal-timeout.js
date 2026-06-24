import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'const signal = AbortSignal.timeout(delay);',
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			abortController.abort();
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(reason), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const AbortController = getAbortController();
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const AbortSignal = {};
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const setTimeout = callback => callback();
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(function abortController() {
				abortController.abort();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(async () => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(function * () {
				abortController.abort();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(argument => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			prepare();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			const timeout = setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			const timeout = setTimeout(() => abortController.abort(), delay);
			clearTimeout(timeout);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout?.(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController?.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController?.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay, value);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController(), other = value;
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			let abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			let abortController = new AbortController();
			abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		{
			code: outdent`
				const abortController: AbortController = getAbortController();
				setTimeout(() => abortController.abort(), delay);
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(`
			const abortController: AbortController = getAbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`),
		{
			code: outdent`
				const abortController: /* keep */ AbortController = new AbortController();
				setTimeout(() => abortController.abort(), delay);
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), getDelay(abortController.signal));
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), (first(), second));
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => {
				abortController.abort();
				cleanup();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), /* delay */ delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			delete abortController.signal;
		`,
		outdent`
			const abortController = new /* keep */ AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => {
				/* keep */
				abortController.abort();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay); // Keep.
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController /* keep */ .signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			({signal: abortController.signal} = options);
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			for (abortController.signal of signals) {}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			for (abortController.signal in signals) {}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			if (abortController.signal.reason) {
				handleAbort();
			}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			abortController.signal.throwIfAborted();
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			if (abortController.signal?.reason) {
				handleAbort();
			}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			abortController.signal?.throwIfAborted();
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			if (abortController.signal['reason']) {
				handleAbort();
			}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			const {reason} = abortController.signal;
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			({throwIfAborted} = abortController.signal);
		`,
		outdent`
			const abortController = new AbortController();
			// Keep.
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), -1);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), 1.5);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), '100');
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const delay = '100';
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
	],
	invalid: [
		outdent`
			const abortController = new AbortController;
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			switch (value) {
				case 'fetch': {
					const abortController = new AbortController();
					setTimeout(() => abortController.abort(), delay);
					fetch(url, {signal: abortController.signal});
					break;
				}
			}
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => {
				abortController.abort();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(function () {
				abortController.abort();
			}, delay);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: abortController.signal});
			read(abortController.signal);
		`,
		outdent`
			function foo() {
				const abortController = new AbortController();
				setTimeout(() => abortController.abort(), delay);
				if (abortController.signal.aborted) {
					return;
				}
			}
		`,
		{
			code: outdent`
				const abortController: AbortController = new AbortController();
				setTimeout(() => abortController.abort(), delay);
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), 1000);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), options.timeout);
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			fetch(url, {signal: (abortController).signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), (timeout + extraDelay));
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const controller = new AbortController();
			setTimeout(() => controller.abort(), delay);
			fetch(url, {signal: controller.signal});
		`,
		outdent`
			const abortController = new AbortController();
			setTimeout(() => abortController.abort(), delay);
			{
				const abortSignal = getSignal();
				fetch(url, {signal: abortController.signal});
			}
		`,
		outdent`
			const signal = getSignal();
			const controller = new AbortController();
			setTimeout(() => controller.abort(), delay);
			fetch(url, {signal: controller.signal});
		`,
	],
});
