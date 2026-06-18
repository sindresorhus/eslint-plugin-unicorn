import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
		},
	},
});

test.snapshot({
	valid: [
		outdent`
			for (const item of items) {
				otherItems.push(item);
			}
		`,
		outdent`
			for (const item of [...items]) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of Array.from(items)) {
				items.push(item);
			}
		`,
		outdent`
			for (const key of Object.keys(object)) {
				delete object[key];
			}
		`,
		outdent`
			for (const value of Object.values(object)) {
				object.extra = value;
			}
		`,
		outdent`
			for (const [key] of Object.entries(object)) {
				delete object[key];
			}
		`,
		outdent`
			for (const item of items) {
				function later() {
					items.push(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				const later = () => {
					items.push(item);
				};
			}
		`,
		outdent`
			for (const item of items) {
				class Later {
					method() {
						items.push(item);
					}
				}
			}
		`,
		outdent`
			for (const item of items) {
				{
					const items = [];
					items.push(item);
				}
			}
		`,
		outdent`
			for (const item of object.items) {
				{
					const object = {items: []};
					object.items.push(item);
				}
			}
		`,
		outdent`
			for (const item of collections[index]) {
				{
					const index = otherIndex;
					collections[index].push(item);
				}
			}
		`,
		outdent`
			for (const item of items) {
				items[method](item);
			}
		`,
		outdent`
			for (const item of items) {
				items.notMutating(item);
			}
		`,
		outdent`
			const items = [];
			for (const item of items) {
				items.add(item);
			}
		`,
		outdent`
			const set = new Set();
			for (const value of set) {
				set.push(value);
			}
		`,
		outdent`
			const map = new Map();
			for (const [key] of map) {
				map.add(key);
			}
		`,
		{
			code: outdent`
				const items = [] as string[] & {add(item: string): void};
				for (const item of items) {
					items.add(item);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				const set = new Set<string>() as Set<string> & {push(value: string): void};
				for (const value of set) {
					set.push(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				const map = new Map<string, number>() as Map<string, number> & {add(value: string): void};
				for (const [key] of map) {
					map.add(key);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			for (const item of items.values(argument)) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items?.values()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items.values?.()) {
				items.push(item);
			}
		`,
		outdent`
			for await (const item of items) {
				items.push(item);
			}
		`,
		outdent`
			for (const value of set) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.add(value);
			}
		`,
		{
			code: outdent`
				const set: Set<string> = new Set();
				for (const value of set.values()) {
					set.delete(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const set = new Set();
			for (const value of set.values()) {
				set.delete(value);
			}
		`,
		typeAware(outdent`
			declare function getSet(): Set<string>;
			const set = getSet();
			for (const value of set.values()) {
				set.delete(value);
			}
		`),
		outdent`
			for (const value of set['values']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set.keys()) {
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['keys']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.delete(value);
			}
		`,
		outdent`
			for (const [value] of set['entries']()) {
				set.add(value);
			}
		`,
		outdent`
			for (const key of set.keys()) {
				set.delete(key);
			}
		`,
		outdent`
			for (const key of set['keys']()) {
				set.delete(key);
			}
		`,
		outdent`
			for (const [value] of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
				} else {
					set.add(value);
				}
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
					continue;
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value), set.add(value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map.entries()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map['entries']()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key] of map.entries()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const [key] of map['entries']()) {
				map.delete(key);
			}
		`,
		outdent`
			for (const entry of map) {
				map.delete(entry);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				if (shouldDelete) {
					map.delete(key);
				} else {
					map.set(key, value);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				if (shouldDelete) {
					map.delete(key);
					continue;
				}

				map.set(key, value);
			}
		`,
		outdent`
			for (const value of set) {
				switch (kind) {
					case 'delete':
						set.delete(value);
						continue;
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				switch (kind) {
					case 'delete':
						set.delete(value);
						break;
				}

				set.add(value);
			}
		`,
		outdent`
			const iterator = items.values();
			for (const item of iterator) {
				items.push(item);
			}
		`,
		outdent`
			for (const value of set) {
				for (const innerValue of set) {
					set.add(innerValue);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				for (const [innerKey, innerValue] of map) {
					map.set(innerKey, innerValue);
				}
			}
		`,
	],
	invalid: [
		outdent`
			for (const item of items) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.unshift(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.pop();
			}
		`,
		outdent`
			for (const item of items) {
				items.shift();
			}
		`,
		outdent`
			for (const item of items) {
				items.splice(0, 1);
			}
		`,
		outdent`
			for (const item of items) {
				items.sort();
			}
		`,
		outdent`
			for (const item of items) {
				items.reverse();
			}
		`,
		outdent`
			for (const item of items) {
				items.fill(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.copyWithin(0, 1);
			}
		`,
		outdent`
			for (const item of items) {
				items?.push(item);
			}
		`,
		outdent`
			for (const item of items) {
				items.push?.(item);
			}
		`,
		outdent`
			for (const item of items) {
				items['push'](item);
			}
		`,
		outdent`
			for (const item of items.values()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of items['values']()) {
				items.push(item);
			}
		`,
		outdent`
			for (const index of items.keys()) {
				items.pop();
			}
		`,
		outdent`
			for (const index of items['keys']()) {
				items.pop();
			}
		`,
		outdent`
			for (const [index, item] of items.entries()) {
				items.push(item);
			}
		`,
		outdent`
			for (const [index, item] of items['entries']()) {
				items.push(item);
			}
		`,
		outdent`
			for (const item of this.items) {
				this.items.push(item);
			}
		`,
		outdent`
			for (const item of object.items) {
				object.items.push(item);
			}
		`,
		outdent`
			for (const item of collections[index]) {
				collections[index].push(item);
			}
		`,
		outdent`
			for (const item of (items)) {
				(items).push(item);
			}
		`,
		outdent`
			for (const value of set) {
				set.add(value + 1);
			}
		`,
		outdent`
			for (const value of set) {
				set.clear();
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.add(otherValue);
			}
		`,
		outdent`
			for (const value of set.values()) {
				set.delete(value);
			}
		`,
		outdent`
			const set = new Set();
			for (const value of set.values()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['values']()) {
				set.delete(value);
			}
		`,
		outdent`
			for (let value of set) {
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (let value of set) {
				value = otherValue;
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				value++;
				set.add(value);
			}
		`,
		outdent`
			for (let value of set) {
				value = otherValue;
				set.delete(value);
			}
		`,
		outdent`
			for (const value of set) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				{
					set.delete(value);
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set.keys()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set['keys']()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set.entries()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const [value] of set['entries']()) {
				set.delete(value);
				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				if (shouldDelete) {
					set.delete(value);
				}

				set.add(value);
			}
		`,
		outdent`
			for (const value of set) {
				{
					const value = otherValue;
					set.add(value);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				map.set(otherKey, value);
			}
		`,
		{
			code: outdent`
				const map: Map<string, number> = new Map();
				for (const entry of map) {
					map.delete(entry);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const map = new Map();
			for (const entry of map) {
				map.delete(entry);
			}
		`,
		outdent`
			const map = new Map();
			for (const entry of map) {
				map.set(entry, value);
			}
		`,
		{
			code: outdent`
				const set: Set<[string]> = new Set();
				for (const [value] of set) {
					set.delete(value);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const set = new Set([['value']]);
			for (const [value] of set) {
				set.delete(value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(otherKey, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				key = otherKey;
				map.set(key, value);
			}
		`,
		outdent`
			for (let key of map.keys()) {
				key++;
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map['keys']()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map.entries()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map['entries']()) {
				map.delete(key);
				map.set(key, value);
			}
		`,
		outdent`
			for (const [key, value] of map) {
				switch (kind) {
					case 1:
						map.delete(key);
						map.set(key, value);
				}
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.clear();
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.delete(value);
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.set(value, newValue);
			}
		`,
		outdent`
			for (const item of items) {
				for (const otherItem of otherItems) {
					items.push(otherItem);
				}
			}
		`,
		outdent`
			for (const item of items) {
				for (const otherItem of items) {
					items.push(otherItem);
				}
			}
		`,
		outdent`
			for (const value of set) {
				for (const innerValue of set) {
					set.delete(innerValue);
				}
			}
		`,
		outdent`
			for (const [key, value] of map) {
				for (const [innerKey] of map) {
					map.delete(innerKey);
				}
			}
		`,
		{
			code: outdent`
				for (const item of (items as string[])) {
					(items as string[]).push(item);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
