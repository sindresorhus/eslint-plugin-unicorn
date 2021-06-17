'use strict';

function createRule({create, meta, ...restOptions}) {
	const rule = {
		create(context) {
			const listeners = create(context);
			return Object.entries(listeners).map(([selector, listener]) => [
				selector,
				function (node) {
					const result = listener(node);
					if (!result) {
						return;
					}

					if (result[Symbol.iterator]) {
						for (const problem of result) {
							context.report(problem);
						}

						return;
					}

					context.report(result);
				}

			]);
		}
	};
}
