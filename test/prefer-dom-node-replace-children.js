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

const error = {
	messageId: 'prefer-dom-node-replace-children',
};

test({
	valid: [
		'element.replaceChildren();',
		'element.innerHTML = html;',
		'element.innerHTML = "<p>content</p>";',
		'element.innerHTML = null;',
		'element.innerHTML += "";',
		'element[innerHTML] = "";',
		'element.textContent = "";',
		'element["outerHTML"] = "";',
		'document.createElement("template").innerHTML = "";',
		'document.createElement("TEMPLATE", options).innerHTML = "";',
		'document.createElementNS("http://www.w3.org/1999/xhtml", "template").innerHTML = "";',
		'document.createElementNS("http://www.w3.org/1999/xhtml", "TEMPLATE", options).innerHTML = "";',
		'document.createElementNS(namespace, "template").innerHTML = "";',
		'const namespace = "http://www.w3.org/1999/xhtml"; document.createElementNS(namespace, "template").innerHTML = "";',
		'document["createElement"]("template").innerHTML = "";',
		'document["createElementNS"]("http://www.w3.org/1999/xhtml", "template").innerHTML = "";',
		{
			code: '(document.createElement("template") as Element).innerHTML = "";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(document.createElement("template") as unknown as Element).innerHTML = "";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(<Element>document.createElement("template")).innerHTML = "";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(document.createElementNS("http://www.w3.org/1999/xhtml", "template") as Element).innerHTML = "";',
			languageOptions: {parser: parsers.typescript},
		},
		'while (node.firstChild) { node.firstChild.remove(); }',
		'while (node.lastChild) { node.lastChild.remove(); }',
		'while (node.firstElementChild) { node.removeChild(node.firstElementChild); }',
		'while (node.firstChild) { node.removeChild(node.lastChild); }',
		'while (node.lastChild) { otherNode.removeChild(node.lastChild); }',
		'while (node.firstChild) { node.removeChild(child); }',
		'while (node.firstChild) { node.removeChild(node.firstChild); node.normalize(); }',
		'while (node.firstChild) { node.removeChild?.(node.firstChild); }',
		'while (node.firstChild) { node["removeChild"](node.firstChild); }',
		'while (node.firstChild) { node.removeChild(...children); }',
		'while (getNode().firstChild) { getNode().removeChild(getNode().firstChild); }',
		'while ((node?.parent).firstChild) { (node?.parent).removeChild((node?.parent).firstChild); }',
		typeAware('function foo(node: string) { node.innerHTML = ""; }'),
		typeAware('function foo(node: HTMLTemplateElement) { node.innerHTML = ""; }'),
		typeAware('function foo(node: Element | HTMLTemplateElement) { node.innerHTML = ""; }'),
		typeAware('function foo<T extends HTMLTemplateElement>(node: T) { node.innerHTML = ""; }'),
		typeAware('class TemplateElement extends HTMLTemplateElement {} function foo(node: TemplateElement) { node.innerHTML = ""; }'),
		typeAware('function foo(node: Document) { node.innerHTML = ""; }'),
		typeAware('function foo(node: DocumentFragment) { node.innerHTML = ""; }'),
		typeAware('function foo(node: Node) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
		typeAware('function foo(node: {innerHTML: string; replaceChildren(): void}) { node.innerHTML = ""; }'),
		typeAware('function foo(node: Element | {innerHTML: string; replaceChildren(): void}) { node.innerHTML = ""; }'),
		typeAware('function foo(node: {firstChild: Node | undefined; removeChild(node: Node): Node}) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
		typeAware('function foo(node: {firstChild: Node | undefined; removeChild(node: Node): Node; replaceChildren(): void}) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
		typeAware(outdent`
			type MaybeElement = Element | {firstChild: Node | undefined; removeChild(node: Node): Node; replaceChildren(): void};
			function foo(node: MaybeElement) { while (node.firstChild) { node.removeChild(node.firstChild); } }
		`),
		typeAware('function foo(node: {firstChild: Node | undefined; removeChild(node: Node): Node; replaceChildren: string}) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
		typeAware('function foo(node: {innerHTML: string; replaceChildren(value: string): void}) { node.innerHTML = ""; }'),
	],
	invalid: [
		{
			code: 'element.innerHTML = "";',
			errors: [error],
			output: 'element.replaceChildren();',
		},
		{
			code: 'element.innerHTML = ``;',
			errors: [error],
			output: 'element.replaceChildren();',
		},
		{
			code: 'element["innerHTML"] = "";',
			errors: [error],
			output: 'element.replaceChildren();',
		},
		{
			code: 'element[`innerHTML`] = "";',
			errors: [error],
			output: 'element.replaceChildren();',
		},
		{
			code: '(element || fallback).innerHTML = "";',
			errors: [error],
			output: '(element || fallback).replaceChildren();',
		},
		{
			code: 'document.createElementNS("http://www.w3.org/2000/svg", "template").innerHTML = "";',
			errors: [error],
			output: 'document.createElementNS("http://www.w3.org/2000/svg", "template").replaceChildren();',
		},
		{
			code: 'const namespace = "http://www.w3.org/2000/svg"; document.createElementNS(namespace, "template").innerHTML = "";',
			errors: [error],
			output: 'const namespace = "http://www.w3.org/2000/svg"; document.createElementNS(namespace, "template").replaceChildren();',
		},
		{
			code: 'document.createElementNS(null, "template").innerHTML = "";',
			errors: [error],
			output: 'document.createElementNS(null, "template").replaceChildren();',
		},
		{
			code: 'const namespace = null; document.createElementNS(namespace, "template").innerHTML = "";',
			errors: [error],
			output: 'const namespace = null; document.createElementNS(namespace, "template").replaceChildren();',
		},
		{
			code: outdent`
				foo()
				;(node as Element).innerHTML = "";
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [error],
			output: outdent`
				foo()
				;(node as Element).replaceChildren();
			`,
		},
		{
			code: 'while (node.firstChild) { node.removeChild(node.firstChild); }',
			errors: [error],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.lastChild) { node.removeChild(node.lastChild); }',
			errors: [error],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.firstChild) node.removeChild(node.firstChild);',
			errors: [error],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.lastChild) node.removeChild(node.lastChild);',
			errors: [error],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (this.firstChild) { this.removeChild(this.firstChild); }',
			errors: [error],
			output: 'this.replaceChildren();',
		},
		{
			code: 'class Foo extends Element { method() { while (super.firstChild) { super.removeChild(super.firstChild); } } }',
			errors: [error],
			output: 'class Foo extends Element { method() { super.replaceChildren(); } }',
		},
		{
			code: 'while (parent.node.firstChild) { parent.node.removeChild(parent.node.firstChild); }',
			errors: [error],
			output: 'parent.node.replaceChildren();',
		},
		{
			code: 'function foo(node: Element) { while ((node as Element).firstChild) { (node as Element).removeChild((node as Element).firstChild); } }',
			languageOptions: {parser: parsers.typescript},
			errors: [error],
			output: 'function foo(node: Element) { (node as Element).replaceChildren(); }',
		},
		{
			code: outdent`
				foo()
				while ((node as Element).firstChild) {
					(node as Element).removeChild((node as Element).firstChild);
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [error],
			output: outdent`
				foo()
				;(node as Element).replaceChildren();
			`,
		},
		{
			...typeAware('function foo(node: Element) { node.innerHTML = ""; }'),
			errors: [error],
			output: 'function foo(node: Element) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: ShadowRoot) { node.innerHTML = ""; }'),
			errors: [error],
			output: 'function foo(node: ShadowRoot) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element | undefined) { node.innerHTML = ""; }'),
			errors: [error],
			output: 'function foo(node: Element | undefined) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element | null) { node.innerHTML = ""; }'),
			errors: [error],
			output: 'function foo(node: Element | null) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: any) { node.innerHTML = ""; }'),
			errors: [error],
			output: 'function foo(node: any) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
			errors: [error],
			output: 'function foo(node: Element) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element | undefined) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
			errors: [error],
			output: 'function foo(node: Element | undefined) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element | null) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
			errors: [error],
			output: 'function foo(node: Element | null) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: any) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
			errors: [error],
			output: 'function foo(node: any) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Document) { while (node.firstChild) { node.removeChild(node.firstChild); } }'),
			errors: [error],
			output: 'function foo(node: Document) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: DocumentFragment) { while (node.lastChild) { node.removeChild(node.lastChild); } }'),
			errors: [error],
			output: 'function foo(node: DocumentFragment) { node.replaceChildren(); }',
		},
		{
			code: 'const result = element.innerHTML = "";',
			errors: [error],
		},
		{
			code: outdent`
				while (node.firstChild) {
					// Keep this comment.
					node.removeChild(node.firstChild);
				}
			`,
			errors: [error],
		},
		{
			code: outdent`
				while (node.firstChild /* Keep this comment. */) {
					node.removeChild(node.firstChild);
				}
			`,
			errors: [error],
		},
		{
			code: 'element /* Keep this comment. */ .innerHTML = "";',
			errors: [error],
		},
		{
			code: 'element.innerHTML = /* Keep this comment. */ "";',
			errors: [error],
		},
	],
});
