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
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.arc(170, 60, 50, 0, 2 * Math.PI);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.beginPath();
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.beginPath();
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
			}

			for (const item of items) {
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke(path);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.fill(path);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.clip(path);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInPath(path, item.x, item.y);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInPath(path, item.x, item.y, 'evenodd');
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInStroke(path, item.x, item.y);
			}
		`,
		outdent`
			for (const item of items) {
				function draw() {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`,
		outdent`
			function setInterval(callback) {
				callback();
			}

			setInterval(() => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}, 1000);
		`,
		outdent`
			const requestAnimationFrame = callback => callback();

			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			requestAnimationFrame(draw);
		`,
		outdent`
			const window = {
				requestAnimationFrame(callback) {
					callback();
				},
			};

			window.requestAnimationFrame(() => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			});
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			function step(draw) {
				requestAnimationFrame(draw);
			}

			requestAnimationFrame(step);
		`,
		outdent`
			function startPath() {
				context.moveTo(220, 60);
			}

			function finishPath() {
				context.lineTo(170, 60);
				context.stroke();
			}

			requestAnimationFrame(() => {
				startPath();
				finishPath();
			});
		`,
		outdent`
			let draw = () => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			};
			draw = noop;

			setInterval(draw, 1000);
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			draw = noop;
			setInterval(draw, 1000);
		`,
		outdent`
			for (const item of items) {
				context["moveTo"](item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context?.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			const context = canvas.getContext('webgl');
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			let context = canvas.getContext('webgl');
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			const context = {
				moveTo() {},
				lineTo() {},
				stroke() {},
			};
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			const object = {
				moveTo() {},
				lineTo() {},
				stroke() {},
			};
			for (const item of items) {
				object.moveTo(item.x, item.y);
				object.lineTo(item.x + 1, item.y + 1);
				object.stroke();
			}
		`,
		outdent`
			context.lineTo(170, 60);

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.stroke();
			}
		`,
		outdent`
			let context = canvas.getContext('2d');
			context = getOtherContext();

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			let context;
			context = canvas.getContext('webgl');

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			let renderingContext = canvas.getContext('2d');
			renderingContext = getOtherContext();

			for (const item of items) {
				renderingContext.moveTo(item.x, item.y);
				renderingContext.lineTo(item.x + 1, item.y + 1);
				renderingContext.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				{
					const context = firstCanvas.getContext('2d');
					context.moveTo(item.x, item.y);
					context.stroke();
				}

				{
					const context = secondCanvas.getContext('2d');
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`,
		{
			code: outdent`
				function draw(context: string) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: WebGLRenderingContext) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: string[]) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: [string]) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type {Context} from './types';

				function draw(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type {CanvasRenderingContext2D} from './types';

				function draw(context: CanvasRenderingContext2D) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: WebGL.RenderingContext) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type * as Types from './types';

				function draw(context: Types.CanvasRenderingContext2D) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			function draw(context: string) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(context: {moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; stroke(): void}) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			export {};

			type CanvasRenderingContext2D = {
				moveTo(x: number, y: number): void;
				lineTo(x: number, y: number): void;
				stroke(): void;
			};

			function draw(context: CanvasRenderingContext2D) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			for (const item of items) {
				{
					const layer: {context: CanvasRenderingContext2D} = firstLayer;
					layer.context.moveTo(item.x, item.y);
					layer.context.stroke();
				}

				{
					const layer: {context: CanvasRenderingContext2D} = secondLayer;
					layer.context.lineTo(item.x + 1, item.y + 1);
					layer.context.stroke();
				}
			}
		`),
		// Recursive type alias
		{
			code: outdent`
				type Context = Context | CanvasRenderingContext2D;

				function draw(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				interface Context extends Types.CanvasRenderingContext2D {}

				function draw(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw<Context>(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Context {}

				function draw(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				import type {Context} from './types';

				function draw(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: readonly CanvasRenderingContext2D[]) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: keyof CanvasRenderingContext2D) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: string | number) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: typeof canvasContext | null) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: {x: number} & {y: number}) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(context: typeof canvasContext & {scaleFactor: number}) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(renderingContext: unknown) {
					for (const item of items) {
						(renderingContext as any).moveTo(item.x, item.y);
						(renderingContext as any).lineTo(item.x + 1, item.y + 1);
						(renderingContext as any).stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			for (const item of items) {
				renderer.moveTo(item.x, item.y);
				renderer.lineTo(item.x + 1, item.y + 1);
				renderer.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				(renderer?.context).moveTo(item.x, item.y);
				(renderer?.context).lineTo(item.x + 1, item.y + 1);
				(renderer?.context).stroke();
			}
		`,
		outdent`
			const context = canvas.getContext('webgl');

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		// Each `getContext()` call is a different receiver
		outdent`
			for (const item of items) {
				canvas.getContext('2d').moveTo(item.x, item.y);
				canvas.getContext('2d').lineTo(item.x + 1, item.y + 1);
				canvas.getContext('2d').stroke();
			}
		`,
		typeAware(outdent`
			function draw(context: any) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			interface Base {
				moveTo(x: number, y: number): void;
				lineTo(x: number, y: number): void;
				stroke(): void;
			}

			interface First extends Base {
				first: true;
			}

			interface Second extends Base {
				second: true;
			}

			function draw(context: First | Second) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw<Context>(context: Context) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
	],
	invalid: [
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.arc(170, 60, 50, 0, 2 * Math.PI);
				context.stroke();
			}

			function step() {
				draw();

				if (foo) {
					requestAnimationFrame(step);
				}
			}

			requestAnimationFrame(step);
		`,
		outdent`
			requestAnimationFrame(() => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			});
		`,
		outdent`
			requestAnimationFrame(function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			});
		`,
		outdent`
			window.requestAnimationFrame(() => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			});
		`,
		outdent`
			setInterval(() => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}, 1000);
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			setInterval(draw, 1000);
		`,
		outdent`
			const draw = () => {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			};

			setInterval(draw, 1000);
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			globalThis.setInterval(draw, 1000);
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			self.setInterval(draw, 1000);
		`,
		outdent`
			function draw() {
				context.moveTo(220, 60);
				context.lineTo(170, 60);
				context.stroke();
			}

			for (const item of items) {
				draw(item);
			}
		`,
		outdent`
			const context = canvas.getContext('2d');

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`,
		outdent`
			let renderingContext = canvas.getContext('2d');

			for (const item of items) {
				renderingContext.moveTo(item.x, item.y);
				renderingContext.lineTo(item.x + 1, item.y + 1);
				renderingContext.stroke();
			}
		`,
		outdent`
			while (enabled) {
				ctx.beginPath();
				ctx.moveTo(220, 60);
				ctx.arc(170, 60, 50, 0, 2 * Math.PI);
				ctx.fill('evenodd');
			}
		`,
		outdent`
			context.moveTo(220, 60);

			for (const item of items) {
				context.lineTo(item.x, item.y);
				context.arc(item.x, item.y, 50, 0, 2 * Math.PI);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.rect(item.x, item.y, item.width, item.height);
				context.closePath();
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
				context.beginPath();
				context.moveTo(item.x + 2, item.y + 2);
				context.stroke();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.clip();
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.clip('evenodd');
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInPath(item.x, item.y);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInPath(item.x, item.y, 'evenodd');
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.isPointInStroke(item.x, item.y);
			}
		`,
		outdent`
			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();

				ctx.moveTo(item.x, item.y);
				ctx.lineTo(item.x + 1, item.y + 1);
				ctx.stroke();
			}
		`,
		{
			code: outdent`
				function draw(context: CanvasRenderingContext2D) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw<Context extends CanvasRenderingContext2D>(context: Context) {
					for (const item of items) {
						context.moveTo(item.x, item.y);
						context.lineTo(item.x + 1, item.y + 1);
						context.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			function draw(context: CanvasRenderingContext2D) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(context: CanvasRenderingContext2D | undefined) {
				if (!context) {
					return;
				}

				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(context: CanvasRenderingContext2D | string) {
				if (typeof context === 'string') {
					return;
				}

				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(context: CanvasRenderingContext2D & {scaleFactor: number}) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			interface Canvas2DContext extends CanvasRenderingContext2D {}

			function draw(renderingContext: Canvas2DContext) {
				for (const item of items) {
					renderingContext.moveTo(item.x, item.y);
					renderingContext.lineTo(item.x + 1, item.y + 1);
					renderingContext.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(context: OffscreenCanvasRenderingContext2D) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d')!;

			for (const item of items) {
				context.moveTo(item.x, item.y);
				context.lineTo(item.x + 1, item.y + 1);
				context.stroke();
			}
		`),
		typeAware(outdent`
			function draw<Context extends CanvasRenderingContext2D>(context: Context) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		{
			code: outdent`
				function draw(renderingContext: unknown) {
					for (const item of items) {
						(renderingContext satisfies CanvasRenderingContext2D).moveTo(item.x, item.y);
						(renderingContext satisfies CanvasRenderingContext2D).lineTo(item.x + 1, item.y + 1);
						(renderingContext satisfies CanvasRenderingContext2D).stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				type Context = CanvasRenderingContext2D;

				function draw(renderingContext: Context) {
					for (const item of items) {
						renderingContext.moveTo(item.x, item.y);
						renderingContext.lineTo(item.x + 1, item.y + 1);
						renderingContext.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				interface Context extends CanvasRenderingContext2D {}

				function draw(renderingContext: Context) {
					for (const item of items) {
						renderingContext.moveTo(item.x, item.y);
						renderingContext.lineTo(item.x + 1, item.y + 1);
						renderingContext.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(renderingContext: CanvasRenderingContext2D | undefined) {
					for (const item of items) {
						renderingContext!.moveTo(item.x, item.y);
						renderingContext!.lineTo(item.x + 1, item.y + 1);
						renderingContext!.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(renderingContext: CanvasRenderingContext2D & {scaleFactor: number}) {
					for (const item of items) {
						renderingContext.moveTo(item.x, item.y);
						renderingContext.lineTo(item.x + 1, item.y + 1);
						renderingContext.stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(renderingContext: unknown) {
					for (const item of items) {
						(renderingContext as CanvasRenderingContext2D).moveTo(item.x, item.y);
						(renderingContext as CanvasRenderingContext2D).lineTo(item.x + 1, item.y + 1);
						(renderingContext as CanvasRenderingContext2D).stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function draw(renderingContext: unknown) {
					for (const item of items) {
						(<CanvasRenderingContext2D>renderingContext).moveTo(item.x, item.y);
						(<CanvasRenderingContext2D>renderingContext).lineTo(item.x + 1, item.y + 1);
						(<CanvasRenderingContext2D>renderingContext).stroke();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				for (const item of items) {
					(ctx satisfies object).moveTo(item.x, item.y);
					(ctx as object).lineTo(item.x + 1, item.y + 1);
					ctx.stroke();
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			for (const item of items) {
				ctx.moveTo(item.x, item.y);
				ctx.lineTo(item.x + 1, item.y + 1);
				ctx.stroke();
			}
		`),
		typeAware(outdent`
			function draw(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
				for (const item of items) {
					context.moveTo(item.x, item.y);
					context.lineTo(item.x + 1, item.y + 1);
					context.stroke();
				}
			}
		`),
		typeAware(outdent`
			function draw(layer: {context: CanvasRenderingContext2D} | undefined) {
				for (const item of items) {
					(layer?.context).moveTo(item.x, item.y);
					(layer?.context).lineTo(item.x + 1, item.y + 1);
					(layer?.context).stroke();
				}
			}
		`),
	],
});

// Shared ancestors in separate union branches are not cycles.
test({
	valid: [
		typeAware('interface First extends Second {} interface Second extends First {} function draw(context: First) { for (const item of items) { context.moveTo(0, 0); context.lineTo(1, 1); context.stroke(); } }'),
		typeAware('type First = Second; type Second = First; function draw(context: First) { for (const item of items) { context.moveTo(0, 0); context.lineTo(1, 1); context.stroke(); } }'),
	],
	invalid: [
		'interface First extends CanvasRenderingContext2D {first: true;} interface Second extends CanvasRenderingContext2D {second: true;}',
		'interface Base extends CanvasRenderingContext2D {} interface First extends Base {first: true;} interface Second extends Base {second: true;}',
	].map(declarations => ({
		...typeAware(`${declarations} function draw(context: First | Second) { for (const item of items) { context.moveTo(0, 0); context.lineTo(1, 1); context.stroke(); } }`),
		errors: 1,
	})),
});

// Alias definitions resolve their own scope, and same-named aliases in different scopes are distinct.
test({
	valid: [],
	invalid: [
		'type Context = CanvasRenderingContext2D; type Alias = Context; { type Context = Alias; function draw(context: Context) { for (const item of items) { context.moveTo(0, 0); context.lineTo(1, 1); context.stroke(); } } }',
		'type Context = CanvasRenderingContext2D; type Alias = Context; { type Context = string; function draw(context: Alias) { for (const item of items) { context.moveTo(0, 0); context.lineTo(1, 1); context.stroke(); } } }',
	].map(code => ({
		code,
		languageOptions: {parser: parsers.typescript},
		errors: 1,
	})),
});
