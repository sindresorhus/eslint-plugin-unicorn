import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const getWords = text => text.split(" ");',
		'const getWords = text => text.split(" "); new Set(getWords(first));',
		'const getWords = text => text.split(" "); for (const text of texts) { new Set(getWords(text)); }',
		'const getWords = text => text.split(" "); new Set(getWords(first)); getWords(second);',
		'const getWords = text => text.split(" "); new Set(getWords(first)); new Map(getWords(second));',
		'export const getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second));',
		'function getWords(text) { return text.split(" "); } export {getWords}; new Set(getWords(first)); new Set(getWords(second));',
		'function getWords(text) { return text.split(" "); } export default getWords; new Set(getWords(first)); new Set(getWords(second));',
		'import {getWords} from "words"; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = text => text.split(" "); consume(getWords); new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = function inner(text) { consume(inner); return text; }; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = text => text.split(" "); const alias = getWords; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = text => text.split(" "); consume(getWords.name); new Set(getWords(first)); new Set(getWords(second));',
		'let getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second)); getWords = other;',
		'const getWords = text => text.split(" "); new Set(getWords.call(undefined, first)); new Set(getWords.call(undefined, second));',
		'const getWords = text => text.split(" "); new Set(getWords?.(first)); new Set(getWords?.(second));',
		'const getWords = async text => text.split(" "); new Set(getWords(first)); new Set(getWords(second));',
		'function * getWords(text) { yield text; } new Set(getWords(first)); new Set(getWords(second));',
		'function getWords(text) { return getWords(text); } new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = function inner(text) { return new Set(inner(text)); }; new Set(getWords(first)); new Set(getWords(second));',
		'function getWords(text = new Set(getWords(first))) { return text; } new Set(getWords(second));',
		'class Words { constructor(text) {} } new Set(new Words(first)); new Set(new Words(second));',
		'function Words(text) { this.text = text; } new Set(new Words(first)); new Set(new Words(second));',
		'const words = {getWords(text) { return text.split(" "); }}; new Set(words.getWords(first)); new Set(words.getWords(second));',
		'class Words { #getWords(text) { return text; } get() { consume(this.#getWords); new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { #getWords(text) { return text; } get() { new Set(this.#getWords(first)); this.#getWords(second); } }',
		'class Words { #getWords(text) { return text; } get() { new Set(this.#getWords?.(first)); new Set(this.#getWords?.(second)); } }',
		'class Words { #getWords(text) { return text; } get() { new Set(this?.#getWords(first)); new Set(this?.#getWords(second)); } }',
		'class Words { #getWords(text) { return new Set(this.#getWords(text)); } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { async #getWords(text) { return text; } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { * #getWords(text) { yield text; } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { #getWords(Set) { return []; } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { #getWords(text) { return text; } get(Wrapper) { new Wrapper(this.#getWords(first)); new Wrapper(this.#getWords(second)); } }',
		'class Words { #getWords = text => text; get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		outdent`
			class Words {
				#getWords(text) {
					return text;
				}
				get() {
					class Reader {
						read(words) {
							return words.#getWords(first);
						}
					}
					new Set(this.#getWords(first));
					new Set(this.#getWords(second));
				}
			}
		`,
		'const getWords = text => text.split(" "); Set(getWords(first)); Set(getWords(second));',
		'const readCount = object => object.count; Number(readCount(first)); new Number(readCount(second));',
		'const readCount = object => object.count; Number(readCount(first)); String(readCount(second));',
		'const readCount = object => object.count; Number(readCount(first), extra); Number(readCount(second), extra);',
		'const readCount = object => object.count; Number(...readCount(first)); Number(...readCount(second));',
		'const readCount = object => object.count; Number?.(readCount(first)); Number?.(readCount(second));',
		'const readCount = object => object.count; Number(readCount?.(first)); Number(readCount?.(second));',
		'const readCount = object => object.count; convert(readCount(first)); convert(readCount(second));',
		'const readCount = Number => Number; Number(readCount(first)); Number(readCount(second));',
		'const readCount = object => object.count; Number(readCount(first)); { const Number = convert; Number(readCount(second)); }',
		'const getWords = text => text.split(" "); new collections.Set(getWords(first)); new collections.Set(getWords(second));',
		'const getWords = text => text.split(" "); new Wrapper(getWords(first), extra); new Wrapper(getWords(second), extra);',
		'const getWords = text => text.split(" "); new Set(...getWords(first)); new Set(...getWords(second));',
		'const getWords = text => text.split(" "); new Set(await getWords(first)); new Set(await getWords(second));',
		'const getWords = text => text.split(" "); new Set(getWords(first).values()); new Set(getWords(second).values());',
		'const getWords = text => text.split(" "); new Set(getWords(first)); { class Set {} new Set(getWords(second)); }',
		'const getWords = text => text.split(" "); { class Wrapper {} new Wrapper(getWords(first)); new Wrapper(getWords(second)); }',
		'const getWords = Set => []; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = text => text.split(" "); eval(source); new Set(getWords(first)); new Set(getWords(second));',
		'const sumTotals = orders => orders.length; sumTotals(customer.orders); sumTotals(supplier.orders);',
		{code: 'function getWords(text) { return text.split(" "); } new Set(getWords(first)); new Set(getWords(second));', languageOptions: {sourceType: 'script'}},
		{code: 'function outer() { with (object) { const getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second)); } }', languageOptions: {sourceType: 'script'}},
		{code: 'function outer() { { function getWords(text) { return text.split(" "); } new Set(getWords(first)); new Set(getWords(second)); } }', languageOptions: {sourceType: 'script'}},
	],
	invalid: [
		'const getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second));',
		'function getEntries(object) { return Object.entries(object); } new Map(getEntries(first)); new Map(getEntries(second));',
		'const getWords = function (text) { return text.split(" "); }; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = function inner(text) { return text.split(" "); }; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = text => text.split(" "); new Set((getWords)(first)); new Set(((getWords(second))));',
		'const getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second)); new Set(getWords(third));',
		'const getWords = text => text.split(" "); new Set(getWords(/* keep */ first)); new Set(/* keep */ getWords(second));',
		'const getWords = text => text.split(" "); consume(new Set(getWords(first))); consume(new Set(getWords(second)));',
		'const getWords = text => text.split(" "); new Set(getWords(...first)); new Set(getWords(...second));',
		'class Wrapper {} const getWords = text => text.split(" "); new Wrapper(getWords(first)); new Wrapper(getWords(second));',
		'const getWords = text => text.split(" "); { new Set(getWords(first)); } { new Set(getWords(second)); }',
		'function outer() { const getWords = text => text.split(" "); new Set(getWords(first)); new Set(getWords(second)); }',
		'class Words { #getWords(text) { return text; } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		'class Words { static #getWords(text) { return text; } static get() { new Set(Words.#getWords(first)); new Set(Words.#getWords(second)); } }',
		'class Words { #getWords(text) { return text; } get(other) { new Set(this.#getWords(first)); new Set(other.#getWords(second)); } }',
		'class Words { #find(text) { return text; } get() { Boolean(this.#find(first)); Boolean(this.#find(second)); } }',
		'const readCount = object => object.count; Number(readCount(first)); Number(readCount(second));',
		'const readName = object => object.name; String(readName(first)); String(readName(second));',
		'const findItem = items => items.find(item => item.enabled); Boolean(findItem(first)); Boolean(findItem(second));',
		'const readCount = object => object.count; BigInt(readCount(first)); BigInt(readCount(second));',
		'const readCount = object => object.count; Number((readCount)(first)); Number(((readCount(second))));',
		'const readCount = object => object.count; Number(readCount(/* keep */ first)); Number(/* keep */ readCount(second));',
		{code: 'const getWords = text => text; const words = <>{new Set(getWords(first))}{new Set(getWords(second))}</>;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		{code: 'const getWords = (text: string): string[] => text.split(" "); new Set(getWords(first)); new Set(getWords(second));', languageOptions: {parser: parsers.typescript}},
		{code: 'const getWords = <T>(value: T): T[] => [value]; new Set(getWords<string>(first)); new Set(getWords<number>(second));', languageOptions: {parser: parsers.typescript}},
		'export class Words { #getWords(text) { return text; } get() { new Set(this.#getWords(first)); new Set(this.#getWords(second)); } }',
		outdent`
			class Words {
				#getWords(text) {
					return text;
				}
				get() {
					class Reader {
						#getWords(text) {
							return text;
						}
						read() {
							this.#getWords(first);
							this.#getWords(second);
						}
					}
					new Set(this.#getWords(first));
					new Set(this.#getWords(second));
				}
			}
		`,
	],
});

test.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'const getWords = (text: string) => text.split(" "); new Set(getWords(first) as string[]); new Set(getWords(second) as string[]);',
		'const getWords = (text: string) => text.split(" "); new Set(getWords(first)!); new Set(getWords(second)!);',
		'const getWords = (text: string) => text.split(" "); new Set(getWords(first) satisfies string[]); new Set(getWords(second) satisfies string[]);',
		'const getWords = (text: string) => text.split(" "); new Set(<string[]>getWords(first)); new Set(<string[]>getWords(second));',
		'const getWords = (text: string) => text.split(" "); new Set<string>(getWords(first)); new Set<number>(getWords(second));',
		'const getWords = (text: string) => text.split(" "); new Set(getWords!?.(first)); new Set(getWords!?.(second));',
		'const getWords = (text: string) => text.split(" "); consume(getWords!); new Set(getWords!(first)); new Set(getWords!(second));',
		'class Words { private getWords(text: string) { return text; } get() { new Set(this.getWords(first)); new Set(this.getWords(second)); } }',
		'const getWords = (text: string) => text.split(" "); export = getWords; new Set(getWords(first)); new Set(getWords(second));',
	],
	invalid: [
		'const getWords = (text: string) => text.split(" "); new Set<string>(getWords(first)); new Set<string>(getWords(second));',
		'const getWords = (text: string) => text.split(" "); type Getter = typeof getWords; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = (text: string) => text.split(" "); new Set(getWords!(first)); new Set(getWords(second));',
		'const getWords = (text: string) => text.split(" "); new Set((getWords as Getter)(first)); new Set((getWords as Getter)(second));',
		'const getWords = (text: string) => text.split(" "); new Set((getWords satisfies Getter)(first)); new Set((getWords satisfies Getter)(second));',
		'const getWords = (text: string) => text.split(" "); new Set((<Getter>getWords)(first)); new Set((<Getter>getWords)(second));',
		'const getWords = <T>(value: T) => [value]; new Set((getWords<string>)(first)); new Set((getWords<string>)(second));',
		'const readCount = (object: Data) => object.count; Number(readCount!(first)); Number((readCount as Reader)(second));',
		'class Words { #getWords(text: string) { return text; } get() { new Set(this.#getWords!(first)); new Set((this.#getWords as Getter)(second)); } }',
		'const getWords = ((text: string) => text.split(" ")) as Getter; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = (text: string) => text.split(" "); export type {getWords}; new Set(getWords(first)); new Set(getWords(second));',
		'const getWords = ((function (text: string) { return text.split(" "); }) as Getter)!; new Set(getWords(first)); new Set(getWords(second));',
	],
});
