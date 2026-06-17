# prefer-type-literal-last

📝 Require type literals to be last in union types.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces putting inline object type literals after other members in TypeScript union types.

An inline object type literal often spans multiple lines, and when it sits first or in the middle of a union it splits the remaining members across the literal's body, so you have to read past the whole object to see what else the union contains. Keeping the compact, named members together up front lets you scan them at a glance, with the multi-line literal trailing at the end where it does not interrupt the list. A single consistent order also avoids re-deciding the layout for every union.

The rule only moves top-level type literals. It does not sort every type member, and it does not inspect nested type arguments.

`null` and `undefined` are kept at the very end, after the type literals, since a nullish "escape hatch" is conventionally placed last.

A union or intersection sibling is itself a composite type rather than a compact named member, so a literal next to one is left alone.

## Examples

```ts
// ❌
type ElementUnion = {
	foo: string;
} | Other;

// ✅
type ElementUnion = Other | {
	foo: string;
};
```

```ts
// ✅
type ElementUnion = Other | {
	foo: string;
};
```

```ts
// ✅
type ElementUnion = Other | {
	foo: string;
} | undefined;
```
