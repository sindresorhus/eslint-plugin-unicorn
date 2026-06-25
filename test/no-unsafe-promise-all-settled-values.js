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
		'const values = (await Promise.all(promises)).map(result => result.value);',
		'const values = results.map(result => result.value);',
		'const values = await Promise.allSettled(promises);',
		'const reasons = (await Promise.allSettled(promises)).map(result => result.reason);',
		'const values = (await Promise.allSettled(promises)).filter(result => result.status === "fulfilled").map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(result => "fulfilled" === result.status).map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(result => result.status === "fulfilled").filter(() => true).map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(result => result.status !== "rejected").map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(result => result.status === "fulfilled" && result.value !== undefined).map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(result => result.value !== undefined && result.status === "fulfilled").map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).filter(({status}) => status === "fulfilled").map(({value}) => value);',
		'const values = (await Promise.allSettled(promises)).filter(({status: state}) => state === "fulfilled").map(({value}) => value);',
		'const values = (await Promise.allSettled(promises)).filter(function (result) { return result.status === "fulfilled"; }).map(function (result) { return result.value; });',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" ? result.value : undefined);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "fulfilled" ? undefined : result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" && result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" && condition && result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "fulfilled" || result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "fulfilled" || condition || result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "rejected" || result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "rejected" && result.value);',
		'const values = (await Promise.allSettled(promises)).map(({status, value}) => status === "fulfilled" ? value : undefined);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" && condition ? result.value : undefined);',
		'const values = (await Promise.allSettled(promises)).map(({status: state, value}) => state === "fulfilled" ? value : undefined);',
		'const values = (await Promise.allSettled(promises)).map(({status, value}) => status === "fulfilled" && value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" ? transform(result.value) : undefined);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" && transform(result.value));',
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status === "fulfilled") { return result.value; } });',
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status === "fulfilled" && condition) { return result.value; } });',
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status !== "fulfilled") { return undefined; } else { return result.value; } });',
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status !== "fulfilled") { return undefined; } return result.value; });',
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status !== "fulfilled" || condition) { return undefined; } return result.value; });',
		outdent`
			const values = (await Promise.allSettled(promises)).map(result => {
				if (result.status !== "fulfilled") {
					console.warn(result.reason);
					return undefined;
				}

				return result.value;
			});
		`,
		'const values = (await Promise.allSettled(promises)).map(result => { if (result.status === "rejected") { throw result.reason; } return result.value; });',
		'const values = Promise.allSettled(promises).then(results => results.filter(result => result.status === "fulfilled").map(result => result.value));',
		'const values = Promise.allSettled(promises).then(results => results.map(result => result.status === "fulfilled" ? result.value : undefined));',
		'const fulfilled = (await Promise.allSettled(promises)).filter(result => result.status === "fulfilled"); const values = fulfilled.map(result => result.value);',
		'const values = Promise.allSettled?.(promises).then(results => results.map(result => result.value));',
		'const values = Promise["allSettled"](promises).then(results => results.map(result => result.value));',
		'const values = NotPromise.allSettled(promises).then(results => results.map(result => result.value));',
		'const values = Promise.allSettled(promises).then((results = []) => results.map(result => result.value));',
		'const values = Promise.allSettled(promises).then(({results}) => results.map(result => result.value));',
		'const values = Promise.allSettled(promises).then(results => { { const results = [{value: 1}]; return results.map(result => result.value); } });',
		'const values = (await Promise.allSettled(promises)).map(result => { { const result = {value: 1}; return result.value; } });',
		'const values = Promise.allSettled(promises).then(results => results.flatMap(result => result.value));',
		'const values = (await Promise.allSettled(promises)).map(getValue);',
		'const values = (await Promise.allSettled(promises)).map(({value}) => ((value) => value)(fallback));',
		'const values = (await Promise.allSettled(promises)).map(({value}) => other.value);',
		'const values = (await Promise.allSettled(promises)).map(({value}) => ({value: fallback}));',
	],
	invalid: [
		'const values = (await Promise.allSettled(promises)).map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => (result.value));',
		'const values = (await Promise.allSettled(promises)).map(result => result["value"]);',
		'const values = (await Promise.allSettled(promises)).map(result => result?.value);',
		'const values = await Promise.allSettled(promises).then(results => results.map(result => result.value));',
		'const values = Promise.allSettled(promises).then(results => results.map(result => result.value));',
		'const values = Promise.allSettled(promises).then(function (results) { return results.map(function (result) { return result.value; }); });',
		'const results = await Promise.allSettled(promises); const values = results.map(result => result.value);',
		'const results = (await Promise.allSettled(promises)); const values = results.map(result => result.value);',
		'const first = await Promise.allSettled(promises); const results = first; const values = results.map(result => result.value);',
		'const values = (await Promise.allSettled(promises)).map(({value}) => value);',
		'const values = (await Promise.allSettled(promises)).map(({value: settledValue}) => settledValue);',
		'const values = (await Promise.allSettled(promises)).map(({value = fallback}) => value);',
		'const values = (await Promise.allSettled(promises)).map(({value: {name}}) => name);',
		'const values = (await Promise.allSettled(promises)).map(({status, value = fallback}) => status === "fulfilled" ? value : undefined);',
		'const values = (await Promise.allSettled(promises)).map(({status, value: {name}}) => status === "fulfilled" ? name : undefined);',
		'const values = (await Promise.allSettled(promises)).map(({status, value}) => { { const status = "fulfilled"; return status === "fulfilled" ? value : undefined; } });',
		'const values = (await Promise.allSettled(promises)).filter(() => true).map(result => result.value);',
		'const values = Promise.allSettled(promises).then(results => results.filter(() => true).map(result => result.value));',
		'const values = (await Promise.allSettled(promises)).map(({value}) => ({value}));',
		'const values = (await Promise.allSettled(promises)).map(({value}) => ({[value]: fallback}));',
		'const values = (await Promise.allSettled(promises)).map(result => result.status === "fulfilled" || result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "rejected" || result.value);',
		'const values = (await Promise.allSettled(promises)).map(result => result.status !== "fulfilled" && result.value);',
		outdent`
			const values = (await Promise.allSettled(promises)).map(result => {
				console.log(result.status);
				return result.value;
			});
		`,
		outdent`
			const values = (await Promise.allSettled(promises)).map(result => {
				if (condition) {
					return result.value;
				}
			});
		`,
		outdent`
			const values = (await Promise.allSettled(promises)).map(result => {
				console.log(result.value);
				return result;
			});
		`,
		outdent`
			const values = Promise.allSettled(promises).then(results => {
				return results.map(result => {
					return result.value;
				});
			});
		`,
		outdent`
			const values = Promise.allSettled(promises).then(results => {
				if (condition) {
					return results.map(result => result.value);
				}

				return [];
			});
		`,
		outdent`
			const values = (await Promise.allSettled(promises)).map(result => {
				switch (result.status) {
					case "rejected":
						console.log(result.reason);
					case "fulfilled":
						return result.value;
				}
			});
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'const values = (results as PromiseFulfilledResult<string>[]).map(result => result.value);',
		'const values = (results as Array<PromiseFulfilledResult<string>>).map(result => result.value);',
		'const values = (results as PromiseFulfilledResult<{name: string}>[]).map(({value: {name}}) => name);',
		'const values = (results as PromiseSettledResult<string>[]).filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled").map(result => result.value);',
		outdent`
			const values = (results as PromiseSettledResult<{name: string}>[])
				.filter((result): result is PromiseFulfilledResult<{name: string}> => result.status === "fulfilled")
				.map(({value: {name}}) => name);
		`,
		'const values = (results as PromiseSettledResult<string>[]).filter(result => result.status === "fulfilled").map(result => result.value);',
		'const values = (results as PromiseSettledResult<string>[]).map(result => result.status === "fulfilled" ? result.value : undefined);',
	],
	invalid: [
		'const values = (results as PromiseSettledResult<string>[]).map(result => result.value);',
		'const values = (results as Array<PromiseSettledResult<string>>).map(result => result.value);',
		'const values = (results as ReadonlyArray<PromiseSettledResult<string>>).map(result => result.value);',
		'const values = (results as (PromiseFulfilledResult<string> | PromiseRejectedResult)[]).map(result => result.value);',
	],
});

test.snapshot({
	valid: [
		typeAware('declare const results: PromiseFulfilledResult<string>[]; const values = results.map(result => result.value);'),
		typeAware('type Job = {status: string; value: string; reason: string}; declare const jobs: Job[]; const values = jobs.map(job => job.value);'),
		typeAware(outdent`
			declare const results: PromiseSettledResult<string>[];
			const values = results
				.filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
				.map(result => result.value);
		`),
		typeAware(outdent`
			declare function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T>;
			declare const results: PromiseSettledResult<string>[];
			const values = results.filter(isFulfilled).map(result => result.value);
		`),
		typeAware('declare const results: PromiseSettledResult<string>[]; const values = results.filter(result => result.status === "fulfilled").map(result => result.value);'),
	],
	invalid: [
		typeAware('declare const results: PromiseSettledResult<string>[]; const values = results.map(result => result.value);'),
		typeAware('declare const results: Array<PromiseSettledResult<string>>; const values = results.map(result => result.value);'),
	],
});
