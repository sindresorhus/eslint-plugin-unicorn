import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
		outdent`
			for (const key of set.keys()) {
				set.delete(key);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(key, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
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
			for (const [key] of map.entries()) {
				map.delete(key);
			}
		`,
		outdent`
			const iterator = items.values();
			for (const item of iterator) {
				items.push(item);
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
			for (const index of items.keys()) {
				items.pop();
			}
		`,
		outdent`
			for (const [index, item] of items.entries()) {
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
			for (const [key, value] of map) {
				map.set(otherKey, value);
			}
		`,
		outdent`
			for (const key of map.keys()) {
				map.set(otherKey, value);
			}
		`,
		outdent`
			for (const value of map.values()) {
				map.clear();
			}
		`,
		outdent`
			for (const item of items) {
				for (const otherItem of otherItems) {
					items.push(otherItem);
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
