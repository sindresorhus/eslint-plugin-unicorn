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
		'window.addEventListener("scroll", () => window.getBoundingClientRect())',
		'window.addEventListener("scroll", () => document.getBoundingClientRect())',
		'window.addEventListener("scroll", () => visualViewport.getBoundingClientRect())',
		'window.addEventListener("resize", () => { const {offsetWidth} = window; })',
		'window.addEventListener("resize", () => { const {offsetWidth} = document; })',
		'window.addEventListener("resize", () => { const {offsetWidth} = visualViewport; })',
		'window.addEventListener("scroll", () => update())',
		'window.addEventListener("resize", () => update())',
		'window.addEventListener(eventName, () => element.offsetWidth)',
		'window?.addEventListener("resize", () => element.offsetWidth)',
		'window.addEventListener?.("resize", () => element.offsetWidth)',
		'addEventListener?.("resize", () => element.offsetWidth)',
		'window.addEventListener("resize", handler)',
		'window.addEventListener("resize", object.handler)',
		'window.addEventListener("resize")',
		'import {handler as importedHandler} from "./handler.js"; window.addEventListener("resize", importedHandler);',
		'let handler = () => element.offsetWidth; window.addEventListener("resize", handler);',
		'var handler = () => element.offsetWidth; window.addEventListener("resize", handler);',
		'const addEventListener = () => {}; addEventListener("resize", () => window.innerWidth);',
		'import {addEventListener} from "./events.js"; addEventListener("resize", () => window.innerWidth);',
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

			function listen(value: unknown) {
				window.addEventListener("resize", () => (value as Size).offsetWidth);
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
			type WindowLike = {
				innerWidth: number;
			};

			function listen(window_: WindowLike) {
				window.addEventListener("resize", () => window_.innerWidth);
			}
		`),
		typeAware(outdent`
			type ViewportLike = {
				width: number;
			};

			function listen(viewport: ViewportLike) {
				window.addEventListener("resize", () => viewport.width);
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
		typeAware(outdent`
			function listen(eventName: 'resize' | 'scroll') {
				window.addEventListener(eventName, () => element.offsetWidth);
			}
		`),
		typeAware(outdent`
			function listen(eventName: string) {
				window.addEventListener(eventName as 'resize', () => element.offsetWidth);
			}
		`),
	],
	invalid: [
		'window.addEventListener("resize", () => element.offsetWidth)',
		'window.addEventListener("resize", function () { return element.offsetWidth; })',
		'window.addEventListener("resize", () => element.offsetWidth, {passive: true})',
		'window.addEventListener(`resize`, () => element.offsetWidth)',
		'window.addEventListener("resize", () => { element.offsetWidth += 1; })',
		'window.addEventListener("resize", () => { element.offsetWidth++; })',
		'window.addEventListener("resize", () => { window.innerWidth += 1; })',
		'window.addEventListener("resize", () => { innerWidth++; })',
		'window.addEventListener("scroll", () => element.getBoundingClientRect())',
		'window.addEventListener("scroll", () => document.documentElement.getBoundingClientRect())',
		'window.addEventListener("scroll", () => element?.getBoundingClientRect())',
		'window.addEventListener("scroll", () => element["getBoundingClientRect"]())',
		'window.addEventListener("scroll", () => element[`getBoundingClientRect`]())',
		'window.addEventListener("scroll", () => element.getBoundingClientRect(ignored))',
		'window.addEventListener("scroll", () => element.getClientRects())',
		'window.addEventListener("scroll", () => element?.["getClientRects"]())',
		'window.addEventListener("resize", () => element["clientWidth"])',
		'window.addEventListener("resize", () => element[`clientWidth`])',
		'window.addEventListener("resize", () => { const {["clientWidth"]: width} = element; })',
		'window.addEventListener("resize", () => { ({"offsetWidth": width} = element); })',
		'window.addEventListener("resize", () => { const {["innerWidth"]: width} = window; })',
		'window.addEventListener("resize", () => { const {offsetWidth} = element; })',
		'window.addEventListener("resize", () => { ({offsetWidth} = element); })',
		'window.addEventListener("resize", () => { const {innerWidth} = window; })',
		'window.addEventListener("resize", () => { ({innerWidth} = window); })',
		'window.addEventListener("resize", () => { const {width} = visualViewport; })',
		'window.addEventListener("resize", () => window.innerWidth)',
		'window.addEventListener("resize", () => innerHeight)',
		'window.addEventListener("resize", () => globalThis.innerWidth)',
		'window.addEventListener("resize", () => self.innerHeight)',
		'window.addEventListener("resize", () => visualViewport.width)',
		'window.addEventListener("resize", () => window.visualViewport.height)',
		'addEventListener("resize", () => window.innerWidth)',
		'addEventListener("scroll", () => element.getBoundingClientRect())',
		'scroller.addEventListener("scroll", () => target.getBoundingClientRect())',
		outdent`
			function handler() {
				return element.offsetHeight;
			}

			window.addEventListener("resize", handler);
		`,
		outdent`
			function handler() {
				return element.offsetHeight;
			}

			window.addEventListener("resize", handler);
			handler = () => {};
		`,
		outdent`
			const handler = () => {
				return element.scrollHeight;
			};

			window.addEventListener("resize", handler);
		`,
		outdent`
			const handler = function () {
				return element.offsetWidth;
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
			type Size = {
				offsetWidth: number;
			};

			function listen(size: Size) {
				window.addEventListener("resize", () => (size as unknown as HTMLElement).offsetWidth);
			}
		`),
		typeAware(outdent`
			type Size = {
				offsetWidth: number;
			};

			function listen(size: Size) {
				window.addEventListener("resize", () => {
					const {offsetWidth} = size as unknown as HTMLElement;
					return offsetWidth;
				});
			}
		`),
		typeAware(outdent`
			function listen(window_: Window) {
				window_.addEventListener("resize", () => window_.innerWidth);
			}
		`),
		typeAware(outdent`
			function listen(window_: Window) {
				window.addEventListener("resize", () => {
					const {innerWidth} = window_;
					return innerWidth;
				});
			}
		`),
		typeAware(outdent`
			function listen(window_: Window | undefined) {
				window.addEventListener("resize", () => window_?.innerWidth);
			}
		`),
		typeAware(outdent`
			function listen<T extends Window>(window_: T) {
				window.addEventListener("resize", () => window_.innerHeight);
			}
		`),
		typeAware(outdent`
			function listen(visualViewport_: VisualViewport) {
				window.addEventListener("resize", () => visualViewport_.width);
			}
		`),
		typeAware(outdent`
			function listen(visualViewport_: VisualViewport) {
				window.addEventListener("resize", () => {
					const {height} = visualViewport_;
					return height;
				});
			}
		`),
		typeAware(outdent`
			window.addEventListener("resize" as const, () => element.offsetWidth);
		`),
		typeAware(outdent`
			const eventName = 'resize';
			window.addEventListener(eventName, () => element.offsetWidth);
		`),
		typeAware(outdent`
			function listen(eventName: 'scroll') {
				window.addEventListener(eventName, () => element.getBoundingClientRect());
			}
		`),
		typeAware(outdent`
			window.addEventListener(("resize" satisfies string), () => element.offsetWidth);
		`),
		typeAware(outdent`
			window.addEventListener("resize", () => element[("clientWidth" as const)]);
		`),
		typeAware(outdent`
			window.addEventListener("scroll", () => element[("getBoundingClientRect" as const)]());
		`),
		typeAware(outdent`
			window.addEventListener("resize", () => {
				const {[("clientWidth" as const)]: width} = element;
				return width;
			});
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
