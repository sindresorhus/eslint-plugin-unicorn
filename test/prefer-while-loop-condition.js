import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			while (hasMore()) {
				processNext();
			}
		`,
		outdent`
			while (false) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			while (1) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			while (/* keep */ true) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (; false;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (let index = 0;;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (;; update()) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			do {
				if (!hasMore()) {
					break;
				}
			} while (false);
		`,
		outdent`
			let done = false;

			while (true) {
				if (done) {
					break;
				}

				let done = true;
				work();
			}
		`,
		outdent`
			let done = false;

			for (;;) {
				if (done) {
					break;
				}

				const done = true;
				work();
			}
		`,
		outdent`
			let done = false;

			do {
				if (done) {
					break;
				}

				class done {}
				work();
			} while (true);
		`,
		outdent`
			let done = false;

			while (true) {
				if (done) {
					break;
				}

				function done() {}
				work();
			}
		`,
		outdent`
			for (;;) {
				if (
					// Check before processing.
					!hasMore()
				) {
					break;
				}
			}
		`,
		outdent`
			for /* keep */ (;;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (; /* keep */ true;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			do {
				if (!hasMore()) {
					break;
				}
			} /* keep */ while (true);
		`,
		outdent`
			loop: for (;;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			loop: do {
				if (!hasMore()) {
					break;
				}
			} while (true);
		`,
		outdent`
			while (true) {
				setup();
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				} else {
					processNext();
				}
			}
		`,
		outdent`
			function process() {
				while (true) {
					if (!hasMore()) {
						return;
					}
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
					processNext();
				}
			}
		`,
		outdent`
			loop: while (true) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			loop: {
				while (true) {
					if (!hasMore()) {
						break loop;
					}
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				if (done) {
					break;
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				{
					if (done) {
						break;
					}
				}
			}
		`,
		outdent`
			while (true) {
				if (
					// Check before processing.
					!hasMore()
				) {
					break;
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					// Preserve this comment.
					break;
				}
			}
		`,
		outdent`
			while (true) {
				// Preserve this comment.
				if (!hasMore()) {
					break;
				}

				processNext();
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) break; // Preserve this comment.
				processNext();
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				} // Preserve this comment.
				processNext();
			}
		`,
	],
	invalid: [
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				for (const item of items) {
					if (done(item)) {
						break;
					}
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				switch (value) {
					case 1:
						break;
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				function stop() {
					while (done) {
						break;
					}
				}
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}

				processNext();
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) break;
				processNext();
			}
		`,
		outdent`
			while (true) {
				if (done) {
					break;
				}

				processNext();
			}
		`,
		outdent`
			while (true) {
				if (done || cancelled) {
					break;
				}

				processNext();
			}
		`,
		outdent`
			for (;;) {
				if (!hasMore()) {
					break;
				}

				processNext();
			}
		`,
		outdent`
			for (; true;) {
				if (!hasMore()) break;
				processNext();
			}
		`,
		outdent`
			do {
				if (!hasMore()) {
					break;
				}

				processNext();
			} while (true);
		`,
		outdent`
			do {
				if (!hasMore()) break;
				processNext();
			} while (true);
		`,
		outdent`
			do {
				if (done || cancelled) {
					break;
				}

				processNext();
			} while (true);
		`,
		outdent`
			while (true) {
				if (done) {
					break;
				}

				var done = true;
				work();
			}
		`,
		outdent`
			while (true) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (;;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			for (; true;) {
				if (!hasMore()) {
					break;
				}
			}
		`,
		outdent`
			do {
				if (!hasMore()) {
					break;
				}
			} while (true);
		`,
		{
			code: outdent`
				while (true) {
					if (!value!) {
						break;
					}

					process(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				while (true) {
					if (value!) {
						break;
					}

					process(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
