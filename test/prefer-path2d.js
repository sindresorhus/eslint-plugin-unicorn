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
	],
});
