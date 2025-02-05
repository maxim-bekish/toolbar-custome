import { YooEditor, YooptaPathIndex } from '../types';
export type GetBlockOptions = {
    at?: YooptaPathIndex;
    id?: string;
};
export declare function getBlock(editor: YooEditor, options: GetBlockOptions): import("../types").YooptaBlockData<import("slate").Descendant> | null;
//# sourceMappingURL=getBlock.d.ts.map