import { YooptaBlockData, SlateElement, YooptaBlockBaseMeta } from '../../editor/types';
export declare const buildBlockElement: (element?: Partial<SlateElement>) => SlateElement;
type BuildBlockDataOptions = Partial<Omit<YooptaBlockData<SlateElement>, 'meta'>> & {
    value?: SlateElement[];
    meta?: Partial<YooptaBlockBaseMeta>;
};
export declare function buildBlockData(block?: BuildBlockDataOptions): YooptaBlockData;
export declare const buildDefaultChildren: () => {
    [x: string]: YooptaBlockData<import("slate").Descendant>;
};
export {};
//# sourceMappingURL=buildBlockData.d.ts.map