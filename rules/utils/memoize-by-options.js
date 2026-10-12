/**
Memoize a function that prepares a rule's options, for example by building maps and regexes from them.

A rule's `create` runs once per linted file, but ESLint passes the same options object to every file that shares a config, so the prepared result can be cached on that object. The prepared result must only be read, never mutated.

@template {object} Options
@template Prepared
@param {(options: Options) => Prepared} prepare
@returns {(options: Options) => Prepared}
*/
export default function memoizeByOptions(prepare) {
	const cache = new WeakMap();

	return options => {
		if (!cache.has(options)) {
			cache.set(options, prepare(options));
		}

		return cache.get(options);
	};
}
