import { YooEditor, SlateEditor, FocusAt, YooptaPathIndex } from '../types';
export type ToggleBlockOptions = {
    at?: YooptaPathIndex;
    deleteText?: boolean;
    slate?: SlateEditor;
    focus?: boolean;
    focusAt?: FocusAt;
};
export declare function toggleBlock(editor: YooEditor, toBlockTypeArg: string, options?: ToggleBlockOptions): string;
//# sourceMappingURL=toggleBlock.d.ts.map