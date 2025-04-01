import fs from 'node:fs';
import {findUpSync} from 'find-up-simple';

const directoryCache = new Map();
const dataCache = new Map();

/**
Finds the closest package.json file to the given directory and returns its path and contents.

Caches the result for future lookups.

@param dirname {string}
@return {{ path: string, packageJson: Record<string, unknown> } | undefined}
*/
export function readPackageJson(dirname) {
	if (directoryCache.has(dirname)) {
		const packageJsonPath = directoryCache.get(dirname);

		if (dataCache.has(packageJsonPath)) {
			return {
				path: packageJsonPath,
				packageJson: dataCache.get(packageJsonPath),
			};
		}
	}

	const packageJsonPath = findUpSync('package.json', {cwd: dirname, type: 'file'});
	if (!packageJsonPath) {
		return;
	}

	if (dataCache.has(packageJsonPath)) {
		return {
			path: packageJsonPath,
			packageJson: dataCache.get(packageJsonPath),
		};
	}

	let packageJson;
	try {
		const contents = fs.readFileSync(packageJsonPath);
		packageJson = JSON.parse(contents);
	} catch {
		// This can happen if package.json files have comments in them etc.
		return;
	}

	directoryCache.set(dirname, packageJsonPath);
	dataCache.set(packageJsonPath, packageJson);

	return {path: packageJsonPath, packageJson};
}
