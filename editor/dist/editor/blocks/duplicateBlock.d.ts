import { YooEditor, YooptaPathIndex } from '../types';
export type DuplicateBlockOptions = {
    original: {
        blockId?: never;
        path: YooptaPathIndex;
    } | {
        blockId: string;
        path?: never;
    };
    focus?: boolean;
    at?: YooptaPathIndex;
};
export declare function duplicateBlock(editor: YooEditor, options: DuplicateBlockOptions): any;
//# sourceMappingURL=duplicateBlock.d.ts.map