import { YooEditor, YooptaPathIndex } from '../types';
type DeleteBlockByIdOptions = {
    blockId: string;
    at?: never;
};
type DeleteBlockByPathOptions = {
    at: YooptaPathIndex;
    blockId?: never;
};
export type DeleteBlockOptions = (DeleteBlockByIdOptions & {
    focus?: boolean;
}) | (DeleteBlockByPathOptions & {
    focus?: boolean;
});
export declare function deleteBlock(editor: YooEditor, options: DeleteBlockOptions): void;
export {};
//# sourceMappingURL=deleteBlock.d.ts.map