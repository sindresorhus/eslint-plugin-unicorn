import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester} from './utils/test.js';

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
		'window.addEventListener("click", () => element.getBoundingClientRect())',
		'window.addEventListener("scroll", () => updateScrollPosition(window.scrollY))',
		'window.addEventListener("scroll", () => updateScrollPosition(window.pageYOffset))',
		'window.addEventListener("scroll", () => updateScrollPosition(element.scrollTop))',
		'window.addEventListener("scroll", () => updateScrollPosition(element.scrollLeft))',
		'window.addEventListener("resize", () => element.innerWidth)',
		'window.addEventListener("resize", () => custom.visualViewport.width)',
		'window.addEventListener("resize", () => { element.offsetWidth = 1; })',
		'window.addEventListener("resize", () => { window.innerWidth = 1; })',
		'window.addEventListener("resize", () => { delete element.offsetWidth; })',
		'window.addEventListener("resize", () => window.offsetWidth)',
		'window.addEventListener("resize", () => document.offsetWidth)',
		'window.addEventListener("resize", () => visualViewport.offsetWidth)',
		'window.addEventListener("resize", () => { const {offsetWidth} = window; })',
		'window.addEventListener("resize", () => { const {offsetWidth} = document; })',
		'window.addEventListener("resize", () => { const {offsetWidth} = visualViewport; })',
		'window.addEventListener("scroll", () => update())',
		'window.addEventListener("resize", () => update())',
		'window.addEventListener(eventName, () => element.offsetWidth)',
		'window?.addEventListener("resize", () => element.offsetWidth)',
		'window.addEventListener?.("resize", () => element.offsetWidth)',
		'window.addEventListener("resize", handler)',
		'window.addEventListener("resize", object.handler)',
		'window.addEventListener("resize", importedHandler)',
		'window.addEventListener("resize")',
		'new ResizeObserver(entries => update(entries)).observe(element)',
		'new IntersectionObserver(entries => update(entries)).observe(element)',
		outdent`
			const handler = () => {
				function nested() {
					return element.offsetWidth;
				}

				nested();
			};
			window.addEventListener("resize", handler);
		`,
		typeAware(outdent`
			type Size = {
				offsetWidth: number;
			};

			function listen(size: Size) {
				window.addEventListener("resize", () => size.offsetWidth);
			}
		`),
		typeAware(outdent`
			type Size = {
				offsetWidth: number;
			};

			function listen(size: Size) {
				window.addEventListener("resize", () => {
					const {offsetWidth} = size;
					return offsetWidth;
				});
			}
		`),
		typeAware(outdent`
			type Size = {
				offsetWidth: number;
			};

			function listen(size: Size) {
				window.addEventListener("resize", () => {
					({offsetWidth} = size);
				});
			}
		`),
		typeAware(outdent`
			type Box = {
				getBoundingClientRect(): DOMRect;
			};

			function listen(box: Box) {
				window.addEventListener("scroll", () => box.getBoundingClientRect());
			}
		`),
		typeAware(outdent`
			function listen(innerWidth: number) {
				window.addEventListener("resize", () => innerWidth);
			}
		`),
		typeAware(outdent`
			window.addEventListener("resize", () => {
				type Size = {
					innerWidth: number;
				};
			});
		`),
		typeAware(outdent`
			type Emitter = {
				addEventListener(name: 'resize', listener: () => void): void;
			};

			function listen(emitter: Emitter) {
				emitter.addEventListener("resize", () => window.innerWidth);
			}
		`),
		typeAware(outdent`
			class Emitter extends EventTarget {}

			function listen(emitter: Emitter) {
				emitter.addEventListener("resize", () => window.innerWidth);
			}
		`),
	],
	invalid: [
		'window.addEventListener("resize", () => element.offsetWidth)',
		'window.addEventListener(`resize`, () => element.offsetWidth)',
		'window.addEventListener("resize", () => { element.offsetWidth += 1; })',
		'window.addEventListener("resize", () => { element.offsetWidth++; })',
		'window.addEventListener("resize", () => { window.innerWidth += 1; })',
		'window.addEventListener("resize", () => { innerWidth++; })',
		'window.addEventListener("scroll", () => element.getBoundingClientRect())',
		'window.addEventListener("scroll", () => element?.getBoundingClientRect())',
		'window.addEventListener("scroll", () => element["getBoundingClientRect"]())',
		'window.addEventListener("scroll", () => element[`getBoundingClientRect`]())',
		'window.addEventListener("scroll", () => element.getClientRects())',
		'window.addEventListener("scroll", () => element?.["getClientRects"]())',
		'window.addEventListener("resize", () => element["clientWidth"])',
		'window.addEventListener("resize", () => element[`clientWidth`])',
		'window.addEventListener("resize", () => { const {offsetWidth} = element; })',
		'window.addEventListener("resize", () => { ({offsetWidth} = element); })',
		'window.addEventListener("resize", () => { const {innerWidth} = window; })',
		'window.addEventListener("resize", () => { ({innerWidth} = window); })',
		'window.addEventListener("resize", () => { const {width} = visualViewport; })',
		'window.addEventListener("resize", () => window.innerWidth)',
		'window.addEventListener("resize", () => innerHeight)',
		'window.addEventListener("resize", () => visualViewport.width)',
		'window.addEventListener("resize", () => window.visualViewport.height)',
		outdent`
			function handler() {
				return element.offsetHeight;
			}

			window.addEventListener("resize", handler);
		`,
		outdent`
			const handler = () => {
				return element.scrollHeight;
			};

			window.addEventListener("resize", handler);
		`,
		typeAware(outdent`
			function listen(element: Element) {
				window.addEventListener("scroll", () => element.getBoundingClientRect());
			}
		`),
		typeAware(outdent`
			function listen(element: HTMLElement) {
				window.addEventListener("resize", () => element.offsetWidth);
			}
		`),
		typeAware(outdent`
			class MyElement extends HTMLElement {}

			function listen(element: MyElement) {
				window.addEventListener("resize", () => element.offsetWidth);
			}
		`),
		typeAware(outdent`
			interface MyElement extends HTMLElement {}

			function listen(element: MyElement) {
				window.addEventListener("resize", () => element.offsetWidth);
			}
		`),
		typeAware(outdent`
			window.addEventListener("resize", (() => element.offsetWidth) as EventListener);
		`),
		typeAware(outdent`
			const handler = (() => element.offsetWidth) as EventListener;
			window.addEventListener("resize", handler);
		`),
	],
});
