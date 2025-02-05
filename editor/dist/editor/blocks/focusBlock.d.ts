import { FocusAt, SlateEditor, YooEditor } from '../types';
export type FocusBlockOptions = {
    waitExecution?: boolean;
    waitExecutionMs?: number;
    shouldUpdateBlockPath?: boolean;
    focusAt?: FocusAt;
    slate?: SlateEditor;
};
export declare function focusBlock(editor: YooEditor, blockId: string, options?: FocusBlockOptions): void;
//# sourceMappingURL=focusBlock.d.ts.map