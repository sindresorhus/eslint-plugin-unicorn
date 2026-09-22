import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'// This is a single comment.',
		outdent`
			// This is a long comment.
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment!
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment?
			// I don't like long lines.
		`,
		outdent`
			// ⚠ Warning callout ⚠
			// This is some extra information
		`,
		outdent`
			// ⚠️ Warning callout ⚠️
			// This is some extra information
		`,
		outdent`
			// ⚠︎ Warning callout ⚠︎
			// This is some extra information
		`,
		outdent`
			// Finished ✅
			// This is some extra information
		`,
		outdent`
			// Launch 🚀
			// This is some extra information
		`,
		outdent`
			// Ready 👍🏽
			// This is some extra information
		`,
		outdent`
			// Deployed 🇺🇸
			// This is some extra information
		`,
		outdent`
			// Step 1️⃣
			// This is some extra information
		`,
		outdent`
			// Family 👨‍👩‍👧
			// This is some extra information
		`,
		outdent`
			// This comment is intentionally separate.
			// This one is separate too!
			// This one is also separate?
		`,
		outdent`
			// This is a long comment but

			// I don't like long lines.
		`,
		outdent`
			// This is a long comment but
			//
			// I don't like long lines.
		`,
		outdent`
			// ----------
			// Section
			// ----------
		`,
		outdent`
			// \`array.reduce(callback)\`
			// \`Array.prototype.reduce.call(array, callback)\`
		`,
		outdent`
			// - \`promise.then(onFulfilled, onRejected)\`
			// - \`promise.catch(onRejected)\`
		`,
		outdent`
			// https://example.com/reference
			// Only meta characters which can't be deciphered from \`String.fromCharCode()\`
		`,
		outdent`
			// {then() {}}
			// {get then() {}}
		`,
		outdent`
			// This is a long comment but
				// I don't like long lines.
		`,
		outdent`
			console.log("unicorn"); // This is a long comment but
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment but
			console.log("unicorn"); // I don't like long lines.
		`,
		outdent`
			// This is a local explanation but
			// it is attached to the statement below
			console.log("unicorn");
		`,
		outdent`
			console.log("unicorn");
			// This is a local explanation but
			// it is attached to the statement above
		`,
		outdent`
			/* This is a long comment but
			I don't like long lines. */
		`,
		outdent`
			#!/usr/bin/env node
			// This is a single comment.
		`,
		outdent`
			/// <reference types="node" />
			/// <reference types="mocha" />
		`,
		outdent`
			// Type checked JavaScript
			// @ts-check
			const value = 1;
		`,
		outdent`
			// Coverage setup
			// c8 ignore next
			const value = 1;
		`,
		outdent`
			// Formatting setup
			// prettier-ignore
			const value = 1;
		`,
		outdent`
			// eslint-disable-next-line no-console
			// This is a single comment
			console.log("unicorn");
		`,
		outdent`
			// This is a single comment
			// eslint-disable-next-line no-console
			console.log("unicorn");
		`,
		outdent`
			// Environment setup
			// eslint-env node
			console.log(process);
		`,
		outdent`
			// Rule setup
			// eslint no-console: off
			console.log("unicorn");
		`,
		outdent`
			// Global setup
			// global process
			console.log(process);
		`,
		outdent`
			// Export setup
			// exported value
			const value = 1;
		`,
		outdent`
			switch (value) {
				case 1:
					break;
				// Switch setup
				// no default
			}
		`,
		outdent`
			// SPDX-License-Identifier: MIT
			// Copyright 2026 Beslogic Inc.
		`,
		outdent`
			// Copyright 2026 Beslogic Inc.
			// SPDX-License-Identifier: MIT
		`,
		outdent`
			// SPDX-FileCopyrightText: 2026 Beslogic Inc.
			// I don't like long lines
		`,
		outdent`
			// noinspection JSUnusedGlobalSymbols
			// I don't like long lines
		`,
		outdent`
			// deno-lint-ignore no-explicit-any
			// I don't like long lines
		`,
		outdent`
			// dprint-ignore
			// I don't like long lines
		`,
		outdent`
			// cspell:disable-next-line
			// I don't like long lines
		`,
		outdent`
			// spell-checker: disable
			// I don't like long lines
		`,
		outdent`
			// vim: set ft=javascript:
			// I don't like long lines
		`,
		outdent`
			// -*- mode: javascript -*-
			// I don't like long lines
		`,
		outdent`
			// © 2026 Beslogic Inc
			// All rights reserved
		`,
		outdent`
			// Copyright 2026 Beslogic Inc
			// All rights reserved
		`,
		outdent`
			// Options:
			// red
		`,
		outdent`
			// Supported values:
			// I don't like long lines
		`,
		outdent`
			// MARK: - Networking
			// Handles requests, retries, and caching
		`,
		outdent`
			// TODO: Add retry handling
			// FIXME: Cache invalidation is not implemented
			// NOTE: Keep this behavior in sync with the server
		`,
		outdent`
			// TODO(alice): Add retry handling
			// FIXME(issue-123): Cache invalidation is not implemented
		`,
		outdent`
			// language=HTML
			// Template used by the fixture
		`,
		outdent`
			// language=RegExp prefix=^ suffix=$
			// Pattern used by the fixture
		`,
		outdent`
			// region Networking
			// Handles requests, retries, and caching
		`,
		outdent`
			// endregion
			// Handles requests, retries, and caching
		`,
		outdent`
			//<editor-fold desc="Networking">
			// Handles requests, retries, and caching
		`,
		outdent`
			//</editor-fold>
			// Handles requests, retries, and caching
		`,
	],
	invalid: [
		outdent`
			// This is a long comment but
			// I don't like long lines
		`,
		outdent`
			// This is a long comment but
			// I don't like long lines and
			// I still don't want to use long lines
		`,
		outdent`
			if (unicorn) {

				// This is a long comment but
				// I don't like long lines

			}
		`,
		outdent`
			// First sentence.
			// This is wrapped but
			// continued
		`,
		outdent`
			// Global state is initialized but
			// the next step runs later
		`,
		outdent`
			// Region-specific behavior is initialized but
			// the next step runs later
		`,
		outdent`
			//This is a long comment but
			//   spacing should be normalized
		`,
		outdent`
			// This is a long comment but
			// it ends here.
			// This is intentionally separate.
		`,
		outdent`
			// This is a long comment but
			// I don't like long lines

			// This is another long comment but
			// I still don't like long lines
		`,
	],
});

// JSONC / JSON5 support
test.snapshot({
	valid: [
		// A single comment is valid
		{
			code: outdent`
				// Single JSONC comment.

				{"key": "value"}
			`,
			language: languages.jsonc,
		},
		// Separate comments ending with sentence punctuation are valid
		{
			code: outdent`
				// First JSONC comment.
				// Second JSONC comment.

				{"key": "value"}
			`,
			language: languages.jsonc,
		},
		// Block comments are never flagged, only consecutive line comments
		{
			code: outdent`
				/* This is a wrapped block comment but
				it should be on one line */

				{"key": "value"}
			`,
			language: languages.jsonc,
		},
	],
	invalid: [
		// Wrapped comment in JSONC
		{
			code: outdent`
				// This is a wrapped JSONC comment but
				// it should be on one line

				{"key": "value"}
			`,
			language: languages.jsonc,
		},
		// Wrapped comment in JSON5
		{
			code: outdent`
				// This is a wrapped JSON5 comment but
				// it should be on one line

				{"key": "value"}
			`,
			language: languages.json5,
		},
	],
});

// TOML support
test.snapshot({
	valid: [
		'# A complete sentence.\n# Another complete sentence.',
		'# A wrapped sentence\n\n# separated by a blank line',
		'# A wrapped sentence\n#\n# separated by an empty comment',
		'# A wrapped sentence\n  # with different indentation',
		'key = 1 # An inline comment\n# followed by another comment',
		'# A comment attached\n# to the following key\nkey = 1',
		'key = 1\n# A comment attached\n# to the previous key',
		'# TODO: Some work\n# FIXME: Other work',
		'# - First item\n# - Second item',
		'# SPDX-License-Identifier: MIT\n# Copyright 2026 Example',
		'# eslint-disable rule-to-test/no-manually-wrapped-comments\n\n# A wrapped sentence\n# continued here',
		'text = """\n# A wrapped sentence\n# inside a string\n"""',
	].map(code => ({code, filename: 'example.toml', language: languages.toml})),
	invalid: [
		'# A wrapped sentence\n# continued here',
		'# First sentence.\n# A wrapped sentence\n# continued here',
		'# A wrapped sentence\n# ends here.\n# A separate sentence.',
		'  # A wrapped sentence\n  # continues on another line\n  # and ends here.',
		'#A wrapped sentence\r\n#   continued here\r\n\r\nkey = 1',
		'# A wrapped sentence\n# continued here\n\nkey = 1\n\n# Another sentence\n# continues here',
	].map(code => ({code, filename: 'example.toml', language: languages.toml})),
});

test.snapshot({
	valid: [
		'# A complete YAML sentence.\n# Another complete sentence.',
		'# A YAML sentence\n\n# separated by a blank line',
		'key: 1 # An inline YAML comment\n# followed by another comment',
		'# A YAML comment attached\n# to the following key\nkey: 1',
		'# TODO: Some YAML work\n# FIXME: Other work',
		'# yamllint disable rule:line-length\n# A separate explanation',
		'# yamllint enable rule:line-length\n# A separate explanation',
		'# yamllint disable-file\n# A separate explanation',
		'# eslint-disable rule-to-test/no-manually-wrapped-comments\n\n# A YAML sentence\n# continued here',
		'text: |\n  # A wrapped sentence\n  # inside a string',
	].map(code => ({code, language: languages.yaml})),
	invalid: [
		'# A YAML sentence\n# continued here',
		'# First YAML sentence.\n# A wrapped sentence\n# continued here',
		'  # A YAML sentence\n  # continues on another line\n  # and ends here.',
		'#A YAML sentence\r\n#   continued here\r\n\r\nkey: 1',
	].map(code => ({code, language: languages.yaml})),
});
