import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const syntaxTypeScript = code => ({
	code,
	languageOptions: {parser: typescriptEslintParser},
});

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
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			if ((abortController.signal as AbortSignal).reason) {
				handleAbort();
			}
		`),
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			abortController.signal!.throwIfAborted();
		`),
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
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			for (const signal of getSignals() as AbortSignal[]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
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
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			function compose(signals: EventTarget[]) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}

				return abortController.signal;
			}
		`),
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
		// Not in a statement list
		'for (const abortController = new AbortController(); ;) {}',
		// A TypeScript-wrapped write to the signal
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			(abortController.signal as AbortSignal) = value;
		`),
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			abortController = undefined;
		`,
		// The signal is never used
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
		`,
		// Unsupported `Array.from()` sources
		...[
			'Array.from(signals, getSignal)',
			'Array.from(...signalLists)',
			'Array.from(signals)',
		].map(source => outdent`
			const abortController = new AbortController();
			AbortSignal.any(${source}).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`),
		outdent`
			const signals = new Set([firstSignal]);
			const abortController = new AbortController();
			AbortSignal.any(Array.from(signals)).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		// A call argument can have side effects
		outdent`
			const signals = [firstSignal, secondSignal];
			const abortController = new AbortController();
			AbortSignal.any(Array.from(signals)).addEventListener('abort', () => abortController.abort());
			thirdSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = [firstSignal];
			signals.push(AbortSignal.abort());
			const abortController = new AbortController();
			AbortSignal.any(Array.from(signals)).addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of Array.from(...signalLists)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = new Set([firstSignal, secondSignal]);
			const abortController = new AbortController();
			for (const signal of Array.from(signals)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const signals = [firstSignal, secondSignal];
			signals.push(AbortSignal.abort());
			const abortController = new AbortController();
			for (const signal of Array.from(signals)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		// Circular references
		outdent`
			const secondSignals = firstSignals;
			const firstSignals = secondSignals;
			const abortController = new AbortController();
			for (const signal of firstSignals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const secondSignals = Array.from(firstSignals);
			const firstSignals = Array.from(secondSignals);
			const abortController = new AbortController();
			for (const signal of Array.from(firstSignals)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		// Listener options
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort(), {once: 1});
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		// The reason of another signal
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort(secondSignal.reason));
			secondSignal.addEventListener('abort', () => abortController.abort(secondSignal.reason));
			fetch(url, {signal: abortController.signal});
		`,
		// Unsupported `for…of` loops
		...[
			'let signal',
			'signal',
			'const {signal}',
		].map(left => outdent`
			const abortController = new AbortController();
			for (${left} of [firstSignal, secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		outdent`
			const abortController = new AbortController();
			for (const target of [firstSignal, secondSignal]) {
				target.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal]) {
				thirdSignal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal]) {
				signal.addEventListener('abort', () => otherController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		// The callback name shadows the controller
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', function abortController() {
				abortController.abort();
			});
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		// Type annotations that are not `AbortSignal` arrays
		...[
			'signals as Foo.Signal[]',
			'signals as LoopingSignal[]',
			'signals as LoopingSignals',
			'signals as Foo.Signals',
			'signals as MySignal[]',
			'signals as Array',
			'signals as keyof Signals',
			'signals as AbortSignal[] | Signals',
			'signals as string[]',
		].map(source => syntaxTypeScript(outdent`
			type LoopingSignal = OtherLoopingSignal;
			type OtherLoopingSignal = LoopingSignal;
			type LoopingSignals = OtherLoopingSignals;
			type OtherLoopingSignals = LoopingSignals;
			interface MySignal {}
			const abortController = new AbortController();
			for (const signal of ${source}) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`)),
		// Unknown types
		...[
			'any',
			'null',
			'EventTarget | Event',
			'AbortSignal | EventTarget',
			'null | undefined',
			'EventTarget & {extra: true}',
			'EventTarget & Event',
			'MyTarget',
			'Plain',
		].map(type => typeAware(outdent`
			interface MyTarget extends EventTarget {}
			interface Plain {}
			declare const firstSignal: ${type};
			declare const secondSignal: ${type};
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`)),
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
		syntaxTypeScript(outdent`
			const abortController: AbortController = new AbortController();
			for (const signal of signals as AbortSignal[]) {
				signal.addEventListener('abort', () => abortController.abort(signal.reason));
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			function compose(signals: readonly AbortSignal[]) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				return abortController.signal;
			}
		`),
		syntaxTypeScript(outdent`
			const signals: [AbortSignal, AbortSignal] = [firstSignal, secondSignal];
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			const signals = [firstSignal, secondSignal] as const;
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal] as const) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			const abortController = new AbortController();
			for (const signal of signals as readonly AbortSignal[]) {
				signal.addEventListener('abort', () => abortController.abort(signal.reason));
			}
			fetch(url, {signal: abortController.signal});
		`),
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
		outdent`
			switch (value) {
				case 1:
					const abortController = new AbortController();
					firstSignal.addEventListener('abort', () => abortController.abort());
					secondSignal.addEventListener('abort', () => abortController.abort());
					fetch(url, {signal: abortController.signal});
			}
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			for (const key in abortController.signal) {}
		`,
		outdent`
			const signals = [firstSignal, secondSignal];
			const abortController = new AbortController();
			for (const signal of Array.from(signals)) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort(), {'once': true});
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, secondSignal]) signal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`,
		outdent`
			const myController = new AbortController();
			firstSignal.addEventListener('abort', () => myController.abort());
			secondSignal.addEventListener('abort', () => myController.abort());
			fetch(url, {signal: myController.signal});
		`,
		// Type annotations
		...[
			'signals as globalThis.AbortSignal[]',
			'signals as Array<AbortSignal>',
			'signals as globalThis.Array<AbortSignal>',
			'signals as ReadonlyArray<AbortSignal>',
			'signals as readonly [AbortSignal, AbortSignal]',
		].map(source => syntaxTypeScript(outdent`
			const abortController = new AbortController();
			for (const signal of ${source}) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`)),
		syntaxTypeScript(outdent`
			type LoopingSignals = OtherLoopingSignals;
			type OtherLoopingSignals = LoopingSignals;
			declare const signals: LoopingSignals;
			const abortController = new AbortController();
			for (const signal of signals as AbortSignal[]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		syntaxTypeScript(outdent`
			const signals: [first: AbortSignal, second: AbortSignal] = [firstSignal, secondSignal];
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		// Types
		...[
			'MySignal | AbortSignal',
			'AbortSignal & {extra: true}',
			'MySignal',
		].map(type => typeAware(outdent`
			interface MySignal extends AbortSignal {}
			declare const firstSignal: ${type};
			declare const secondSignal: ${type};
			const abortController = new AbortController();
			firstSignal.addEventListener('abort', () => abortController.abort());
			secondSignal.addEventListener('abort', () => abortController.abort());
			fetch(url, {signal: abortController.signal});
		`)),
		typeAware(outdent`
			function compose<T extends AbortSignal>(firstSignal: T, secondSignal: T) {
				const abortController = new AbortController();
				firstSignal.addEventListener('abort', () => abortController.abort());
				secondSignal.addEventListener('abort', () => abortController.abort());
				return abortController.signal;
			}
		`),
		// Readonly array types
		...[
			'readonly AbortSignal[] | AbortSignal[]',
			'readonly AbortSignal[] & {extra: true}',
			'readonly [AbortSignal, AbortSignal]',
		].map(type => typeAware(outdent`
			declare function getSignals(): ${type};
			const signals = getSignals();
			const abortController = new AbortController();
			for (const signal of signals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`)),
		typeAware(outdent`
			function compose<T extends readonly AbortSignal[]>(signals: T) {
				const abortController = new AbortController();
				for (const signal of signals) {
					signal.addEventListener('abort', () => abortController.abort());
				}
				return abortController.signal;
			}
		`),
		typeAware(outdent`
			declare const signals: any;
			const abortController = new AbortController();
			for (const signal of signals as AbortSignal[]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`),
		[
			'const abortController = new AbortController();',
			'firstSignal.addEventListener(\'abort\', () => abortController.abort());',
			'secondSignal.addEventListener(\'abort\', () => abortController.abort());',
			'fetch(url, {signal: abortController.signal});',
		].join('\r'),
		// Circular `Array.from()` sources
		outdent`
			const secondSignals = Array.from(firstSignals);
			const firstSignals = Array.from(secondSignals);
			const abortController = new AbortController();
			for (const signal of firstSignals) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
		// A hole in the array
		outdent`
			const abortController = new AbortController();
			for (const signal of [firstSignal, , secondSignal]) {
				signal.addEventListener('abort', () => abortController.abort());
			}
			fetch(url, {signal: abortController.signal});
		`,
	],
});
