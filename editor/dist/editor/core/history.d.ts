import { YooEditor, YooptaPath } from '../types';
import { YooptaOperation } from './applyTransforms';
export type HistoryStack = {
    operations: YooptaOperation[];
    path: YooptaPath;
};
export type HistoryStackName = 'undos' | 'redos';
export declare function inverseEditorOperation(editor: YooEditor, op: YooptaOperation): YooptaOperation | YooptaOperation[];
export type UndoRedoOptions = {
    scroll?: boolean;
};
export declare const SAVING: WeakMap<YooEditor, boolean | undefined>;
export declare const MERGING: WeakMap<YooEditor, boolean | undefined>;
export declare const YooptaHistory: {
    isMergingHistory(editor: YooEditor): boolean | undefined;
    isSavingHistory(editor: YooEditor): boolean | undefined;
    withMergingHistory(editor: YooEditor, fn: () => void): void;
    withSavingHistory(editor: YooEditor, fn: () => void): void;
    withoutMergingHistory(editor: YooEditor, fn: () => void): void;
    withoutSavingHistory(editor: YooEditor, fn: () => void): void;
    redo: (editor: YooEditor, options?: UndoRedoOptions) => void;
    undo: (editor: YooEditor, options?: UndoRedoOptions) => void;
};
//# sourceMappingURL=history.d.ts.map