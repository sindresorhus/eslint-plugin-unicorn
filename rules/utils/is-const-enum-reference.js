import {isAliasSymbol, isConstEnumSymbol} from './types.js';

/*
Best-effort check whether a node references a TypeScript `const enum`. A `const enum` may appear only in a direct property or index access (TS2475), so moving its reference into another expression (like a ternary) would not compile.

Needs type information: without a type-aware config, const enums are indistinguishable from normal objects and this returns `false`.
*/
export default function isConstEnumReference(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		let symbol = checker.getSymbolAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));
		if (symbol && isAliasSymbol(symbol)) {
			symbol = checker.getAliasedSymbol(symbol);
		}

		return symbol ? isConstEnumSymbol(symbol) : false;
	} catch {
		return false;
	}
}
