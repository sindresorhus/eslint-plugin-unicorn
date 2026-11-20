const DIRECTIVE_PATTERNS = [
	/^\s*[#@]\s*source(?:Mapping)?URL=/v,
	/^\s*#(?:end)?region\b/v,
	/-\*-.*-\*-/v,
	/^\s*(?:vim?:|Vim:|ex:)/v,
	// A parser can miss an ESLint directive when it reports a shortened comment range.
	/^\s*eslint(?:-env|-enable|-disable(?:-(?:next-)?line)?)?(?:\s|:|$)/v,
	/^\s*(?:jshint|[jt]slint|jscs|globals?|exported|no default|noinspection)(?:\s|:|$)/v,
	/^\s*(?:\*\s*)?flowlint(?:-(?:line|next-line))?(?:\s|:|$)/v,
	/^\s*:/v,
	/^\s*flow-include(?:\s|$)/v,
	/^\s*(?:c8|istanbul|nyc|v8)\s+ignore(?:\s|$)/v,
	/^\s*node:coverage\s+(?:ignore\s+next|disable|enable)(?:\s|$)/v,
	/^\s*(?:biome|deno|dprint|oxlint|prettier)-(?:ignore|lint-ignore|disable|enable)(?:-(?:line|next-line|start|end|file|all))?(?:\s|$)/v,
	/^\s*(?:cspell|spell-checker):/v,
	// TypeScript accepts extra slashes and asterisks before these directives.
	/^\s*(?:[*\/]+\s*)?@ts-(?:ignore|expect-error)/v,
	// TypeScript can recognize JSX pragmas anywhere in a leading block comment.
	/@jsx(?:frag|importsource|runtime|factory)?(?:\s|:|$)/iv,
	/^\s*@(?:ts-(?:check|nocheck)|(?:no)?flow|(?:jest|vitest)-environment|noformat|noprettier)(?:\s|:|$)/v,
	/^\s*\$Flow(?:FixMe|ExpectedError)\[[^\]]+\](?:\s|:|$)/v,
	/^\s*[#@]__(?:INLINE|NOINLINE|PURE|KEY|MANGLE_PROP|NO_SIDE_EFFECTS)__\s*$/v,
];

export default function isToolingDirective(text) {
	return DIRECTIVE_PATTERNS.some(pattern => pattern.test(text));
}
