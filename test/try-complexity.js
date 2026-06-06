import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'try {} catch {}',
		outdent`
			function isAvailable() {
				try {
					doSomething();
					doSomethingElse();
					return true;
				} catch {
					return false;
				}
			}
		`,
		outdent`
			try {
				doSomething();
			} catch {
				if (error) {
					handleError(error);
				}
			} finally {
				if (cleanup) {
					cleanup();
				}
			}
		`,
		outdent`
			try {
				function doSomething() {
					if (condition) {
						return a;
					}

					return b;
				}

				doSomething();
			} catch {}
		`,
		outdent`
			try {
				const doSomething = () => condition ? a : b;
				doSomething();
			} catch {}
		`,
		{
			code: outdent`
				try {
					if (condition) {
						doSomething();
					}
				} catch {}
			`,
			options: [{max: 2}],
		},
	],
	invalid: [
		outdent`
			try {
				if (condition) {
					doSomething();
				}
			} catch {}
		`,
		outdent`
			try {
				while (condition) {
					doSomething();
				}
			} catch {}
		`,
		outdent`
			try {
				for (const item of items) {
					doSomething(item);
				}
			} catch {}
		`,
		outdent`
			try {
				const value = condition ? a : b;
			} catch {}
		`,
		outdent`
			try {
				const value = a || b;
			} catch {}
		`,
		outdent`
			try {
				value ||= fallback;
			} catch {}
		`,
		outdent`
			try {
				switch (value) {
					case 1:
						doSomething();
						break;
					default:
						doSomethingElse();
				}
			} catch {}
		`,
		outdent`
			try {
				try {
					doSomething();
				} catch {
					doSomethingElse();
				}
			} catch {}
		`,
		outdent`
			try {
				object?.method?.();
			} catch {}
		`,
		outdent`
			try {
				const doSomething = () => {
					try {
						if (condition) {
							doSomethingElse();
						}
					} catch {}
				};

				doSomething();
			} catch {}
		`,
		outdent`
			try {
				const {value = fallback} = object;
			} catch {}
		`,
		{
			code: outdent`
				try {
					if (condition) {
						doSomething();
					} else if (otherCondition) {
						doSomethingElse();
					}
				} catch {}
			`,
			options: [{max: 2}],
		},
	],
});
