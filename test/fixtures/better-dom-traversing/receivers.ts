type BrowserElement = Element;

export type {BrowserElement as Element};

export interface QueryTree {
	kind: 'query-tree';
	querySelector(selector: string): QueryTree;
}
