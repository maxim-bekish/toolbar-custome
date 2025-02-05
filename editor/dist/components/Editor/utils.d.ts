import { YooptaBlockData, SlateElement, YooptaBlockBaseMeta } from '../../editor/types';
export declare const buildBlockElement: (element?: Partial<SlateElement>) => SlateElement;
type BuildBlockDataOptions = Partial<YooptaBlockData<SlateElement>> & {
    value?: SlateElement[];
    meta?: Partial<YooptaBlockBaseMeta>;
};
export declare const buildBlockData: (block?: BuildBlockDataOptions) => YooptaBlockData;
export declare const getDefaultYooptaChildren: () => {
    [x: string]: YooptaBlockData<import("slate").Descendant>;
};
export {};
//# sourceMappingURL=utils.d.ts.map