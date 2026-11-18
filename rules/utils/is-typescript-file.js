import path from 'node:path';

/**
Whether the filename has a TypeScript extension (`.ts`, `.mts`, `.cts`, `.tsx`).

@param {string} filename
@returns {boolean}
*/
export default function isTypeScriptFile(filename) {
	return /\.(?:ts|mts|cts|tsx)$/i.test(filename);
}

/**
Whether the path names a TypeScript declaration file, including asset declarations such as `styles.d.css.ts`.

@param {string} filename
@returns {boolean}
*/
export function isTypeScriptDeclarationFile(filename) {
	return filename.endsWith('.d.mts')
		|| filename.endsWith('.d.cts')
		|| (filename.endsWith('.ts') && path.win32.basename(filename).includes('.d.'));
}
