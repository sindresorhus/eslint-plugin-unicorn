import {fork} from '@eslint/css-tree';

/**
Parse CSS like `parse()` from `@eslint/css-tree`. Use this for all CSS parsing in rules.

The default parser reuses one token buffer and zero-fills all of it on every call. `@eslint/css` parses each CSS file with the default parser, so the buffer grows to the size of the largest file, and each small parse in a rule then zero-fills megabytes. This separate parser only grows to the size of the largest text that rules parse.
*/
export const {parse} = fork({});
