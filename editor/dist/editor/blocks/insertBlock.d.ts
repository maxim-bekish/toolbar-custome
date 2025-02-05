import { YooEditor, YooptaBlockData, YooptaPathIndex } from '../types';
export type InsertBlockOptions = {
    at?: YooptaPathIndex;
    focus?: boolean;
    blockData?: Omit<Partial<YooptaBlockData>, 'type'>;
};
export declare function insertBlock(editor: YooEditor, type: string, options?: InsertBlockOptions): string;
//# sourceMappingURL=insertBlock.d.ts.map