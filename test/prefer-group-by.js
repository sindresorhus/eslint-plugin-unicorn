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
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;});',
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {existing: []});',
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item.value); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.type] = item; return groups;}, {});',
		'items.reduce((groups, item) => ({...groups, [item.type]: [...(groups[item.type] ?? []), item]}), {});',
		'items.reduce((groups, item) => {groups[item.type] ? groups[item.type].push(item) : groups[item.type] = [item]; return groups;}, {});',
		'items.reduce((groups, item, index) => {groups[index] ??= []; groups[index].push(item); return groups;}, {});',
		'items.reduce((groups, item, index, array) => {groups[array.length] ??= []; groups[array.length].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[getKey(item)] ??= []; groups[getKey(item)].push(item); return groups;}, {});',
		'items?.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce?.((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return other;}, {});',
		'items.reduce(async (groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, {type}) => {groups[type] ??= []; groups[type].push(item); return groups;}, {});',
		'new Set(items).reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'"abc".reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'({reduce: callback => callback}).reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {if (!groups.has(item.type)) {groups.set(item.type, [item]);} return groups;}, new Map());',
		'items.reduce((groups, item) => {const group = groups.get(item.type) ?? []; group.push(item); groups.set(item.type, group); return groups;}, new Map([[type, []]]));',
		typeAware('function foo(items: Set<Item>) {items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});}'),
		{
			code: outdent`
				function foo(items: {reduce(callback: Function, initialValue: object): object}) {
					items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.type] = groups[item.type] || []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.type] = groups[item.type] ?? []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.type] ||= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {(groups[item.type] ??= []).push(item); return groups;}, {});',
		'items.reduce((groups, item) => {(groups[item.type] ||= []).push(item); return groups;}, {});',
		'items.reduce((groups, item) => {(groups[item.type] = groups[item.type] || []).push(item); return groups;}, {});',
		'items.reduce(function (groups, item) {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});',
		'items.reduce(function (groups, item) {(groups[arguments[1].type] ??= []).push(item); return groups;}, {});',
		'items.reduce(function (groups, item) {const key = this.getKey(item); groups[key] ??= []; groups[key].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {const key = getKey(item); groups[key] ??= []; groups[key].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item.groups] ??= []; groups[item.groups].push(item); return groups;}, {});',
		'items.reduce((groups, item, index) => {groups[item.index] ??= []; groups[item.index].push(item); return groups;}, {});',
		'items.reduce((groups, item, index, array) => {groups[item.array] ??= []; groups[item.array].push(item); return groups;}, {});',
		'items.reduce((groups, item) => {groups[item[type]] ??= []; groups[item[type]].push(item); return groups;}, {});',
		'foo.items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, Object.create(null));',
		'items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, Object.create(null));',
		outdent`
			items.reduce((groups, item) => {
				// Keep this comment.
				groups[item.type] ??= [];
				groups[item.type].push(item);
				return groups;
			}, {});
		`,
		'items.reduce((groups, item) => {if (groups.has(item.type)) {groups.get(item.type).push(item);} else {groups.set(item.type, [item]);} return groups;}, new Map());',
		'items.reduce((groups, item) => {const key = getKey(item); if (groups.has(key)) {groups.get(key).push(item);} else {groups.set(key, [item]);} return groups;}, new Map());',
		'items.reduce((groups, item) => {const group = groups.get(item.type) ?? []; group.push(item); groups.set(item.type, group); return groups;}, new Map());',
		'items.reduce((groups, item) => {const group = groups.get(item.type) || []; group.push(item); groups.set(item.type, group); return groups;}, new Map());',
		{
			code: 'function foo(items: Item[]) {items.reduce((groups, item) => {groups[(item.type as string)] ??= []; groups[(item.type as string)].push(item); return groups;}, {});}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(items: Item[]) {items.reduce((groups, item) => {groups[(item.type satisfies string)] ??= []; groups[(item.type satisfies string)].push(item); return groups;}, {});}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(items: Item[]) {items.reduce((groups, item) => {groups[item!.type] ??= []; groups[item!.type].push(item); return groups;}, {});}',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(items: Item[]) {items.reduce<Record<string, Item[]>>((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});}',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('function foo(items: Item[]) {items.reduce((groups, item) => {groups[item.type] ??= []; groups[item.type].push(item); return groups;}, {});}'),
	],
});
