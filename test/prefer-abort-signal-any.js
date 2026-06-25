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
		'const signal = AbortSignal.any([firstSignal, secondSignal]);',
		outdent`
			const abortController = new AbortController();
			signal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('load', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal?.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener?.('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', async () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', function * () {
				abortController.abort();
			});
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', event => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => {
				abortController.abort();
				cleanup();
			});
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			let abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController(), other = value;
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			abortController.abort();
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const AbortController = getAbortController();
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const AbortSignal = {};
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort()); // Keep.
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			// Keep.
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new /* keep */ AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal]) {
				// Keep.
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort(), getOptions());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			getSignal().addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.timeout(getDelay()).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.any([getSignal(), firstSignal]).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.abort().addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const options = {signal: AbortSignal.abort()};
			const abortController = new AbortController();
			options.signal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		typeAware(outdent`
			const options = {signal: AbortSignal.abort()};
			const abortController = new AbortController();
			options.signal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`),
		typeAware(outdent`
			const options = {signal: AbortSignal.abort()};
			const abortController = new AbortController();
			for (const signal of [options.signal, secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		outdent`
			const abortController = new AbortController();
			AbortSignal.any([AbortSignal.abort(), firstSignal]).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.any([...[AbortSignal.abort()], firstSignal]).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', function firstSignal() {
				abortController.abort(firstSignal.reason);
			});
			secondSignal.addEventListener('abort', () => abortController.abort(secondSignal.reason));
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			this.firstSignal.addEventListener('abort', function () {
				abortController.abort(this.firstSignal.reason);
			});
			secondSignal.addEventListener('abort', () => abortController.abort(secondSignal.reason));
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const firstSignal = AbortSignal.abort();
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			abortController.signal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.any([abortController.signal, firstSignal]).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.any([...[abortController.signal], firstSignal]).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			const signal = abortController.signal;
			signal.throwIfAborted();
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			if (abortController.signal.reason) {
				handleAbort();
			}
		`,
		{
			code: outdent`
				const abortController = new AbortController();
				firstSignal.addEventListener('abort', () => abortController.abort());
				secondSignal.addEventListener('abort', () => abortController.abort());
				if ((abortController.signal as AbortSignal).reason) {
					handleAbort();
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const abortController = new AbortController();
				firstSignal.addEventListener('abort', () => abortController.abort());
				secondSignal.addEventListener('abort', () => abortController.abort());
				abortController.signal!.throwIfAborted();
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			const signal = abortController.signal;
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of new Set(signals)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [AbortSignal.abort(), secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of new Array(AbortSignal.abort(), secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array(AbortSignal.abort(), secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstTarget, secondTarget]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of new Array(firstTarget, secondTarget)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array(firstTarget, secondTarget)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const targets = [firstTarget, secondTarget];
			const abortController = new AbortController();
			for (const signal of targets) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [abortController.signal, secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array(abortController.signal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = [AbortSignal.abort(), secondSignal];
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.of(AbortSignal.abort(), secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.of(AbortSignal.timeout(getDelay()), secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = Array.of(AbortSignal.timeout(getDelay()), secondSignal);
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const Array = getArray();
			const abortController = new AbortController();
			for (const signal of Array.of(firstSignal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const Array = getArray();
			const abortController = new AbortController();
			for (const signal of Array.from([firstSignal, secondSignal])) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const Array = getArray();
			const abortController = new AbortController();
			for (const signal of Array(firstSignal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of []) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = Array.of(firstSignal);
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from([])) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from([firstSignal])) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from([firstTarget, secondTarget])) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from([firstSignal, secondSignal], () => AbortSignal.abort())) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		{
			code: outdent`
				const abortController = new AbortController();
				for (const signal of getSignals() as AbortSignal[]) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from(new Set([AbortSignal.abort(), secondSignal]))) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = [firstSignal, secondSignal];
			signals.push(AbortSignal.abort());
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = [firstSignal, secondSignal];
			signals.push(AbortSignal.abort());
			const abortController = new AbortController();
			AbortSignal.any(signals).addEventListener('abort', () => abortController.abort());
			thirdSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		{
			code: outdent`
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		typeAware(outdent`
			const abortController = new AbortController();
			for (const signal of new Set<AbortSignal>()) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		typeAware(outdent`
			const abortController = new AbortController();
			const firstSignal: EventTarget = new EventTarget();
			const secondSignal: EventTarget = new EventTarget();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`),
		typeAware(outdent`
			const abortController = new AbortController();
			const firstSignal: AbortSignal | EventTarget = getSignal();
			const secondSignal: AbortSignal | EventTarget = getSignal();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`),
	],
	invalid: [
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			AbortSignal.timeout(1000).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => {
				abortController.abort();
			});
			secondSignal.addEventListener('abort', function () {
				abortController.abort();
			});
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort(firstSignal.reason));
			secondSignal.addEventListener('abort', () => abortController.abort(secondSignal.reason), {once: true});
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const controller = new AbortController();
			firstSignal.addEventListener('abort', () => controller.abort());
			secondSignal.addEventListener('abort', () => controller.abort(), true);
			fetch(url, {signal: controller.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of new Array(firstSignal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.of(firstSignal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array(firstSignal, secondSignal)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from([firstSignal, secondSignal])) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		{
			code: outdent`
				const abortController: AbortController = new AbortController();
				for (const signal of signals as AbortSignal[]) {
					signal.addEventListener('abort', () => abortController.abort(signal.reason));
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function compose(signals: readonly AbortSignal[]) {
					const abortController = new AbortController();
					for (const signal of signals) {
						signal.addEventListener('abort', () => abortController.abort());
					}
					return abortController.signal;
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const signals: [AbortSignal, AbortSignal] = [firstSignal, secondSignal];
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const signals = [firstSignal, secondSignal] as const;
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const abortController = new AbortController();
				for (const signal of signals as readonly AbortSignal[]) {
					signal.addEventListener('abort', () => abortController.abort(signal.reason));
				}
				fetch(url, {signal: abortController.signal});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			function compose(signals: AbortSignal[]) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort(signal.reason));
				}
				return abortController.signal;
			}
		`),
		typeAware(outdent`
			declare const signals: AbortSignal[];
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		typeAware(outdent`
			type Signals = readonly AbortSignal[];
			function compose(signals: Signals) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}

				return abortController.signal;
			}
		`),
		typeAware(outdent`
			interface Signals extends ReadonlyArray<AbortSignal> {}
			function compose(signals: Signals) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}

				return abortController.signal;
			}
		`),
		typeAware(outdent`
			const signals = getSignals() as readonly AbortSignal[];
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}

			fetch(url, {signal: abortController.signal});
		`),
		outdent`
			const abortSignal = existingSignal;
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		[
			'const abortController = new AbortController();',
			'firstSignal.addEventListener(\'abort\', () => abortController.abort());',
			'secondSignal.addEventListener(\'abort\', () => abortController.abort());',
			'fetch(url, {signal: abortController.signal});',
		].join('\r\n'),
	],
});
