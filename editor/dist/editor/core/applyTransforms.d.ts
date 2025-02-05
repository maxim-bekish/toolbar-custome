import { SlateEditor, SlateElement, YooEditor, YooptaBlockData, YooptaContentValue, YooptaPath } from '../types';
import { Operation, Range } from 'slate';
export type ChangeSource = 'api' | 'user' | 'history';
export type SetSlateOperation = {
    type: 'set_slate';
    slate: SlateEditor;
    blockId: string;
    properties: {
        slateOps: Operation[];
        selectionBefore: Range | null;
    };
};
export type MoveBlockOperation = {
    type: 'move_block';
    prevProperties: {
        id: string;
        order: number;
    };
    properties: {
        id: string;
        order: number;
    };
};
export type InsertBlockOperation = {
    type: 'insert_block';
    path: YooptaPath;
    block: YooptaBlockData;
};
export type SetBlockValueOperation = {
    type: 'set_block_value';
    id: string;
    value: SlateElement[];
    forceSlate?: boolean;
};
export type SetBlockMetaOperation = {
    type: 'set_block_meta';
    id: string;
    properties: Omit<Partial<YooptaBlockData['meta']>, 'order'>;
    prevProperties: Omit<Partial<YooptaBlockData['meta']>, 'order'>;
};
export type SplitBlockOperation = {
    type: 'split_block';
    properties: {
        nextBlock: YooptaBlockData;
        splitSlateValue: SlateElement[];
        nextSlateValue: SlateElement[];
    };
    prevProperties: {
        originalBlock: YooptaBlockData;
        originalValue: SlateElement[];
    };
    path: YooptaPath;
};
export type MergeBlockOperation = {
    type: 'merge_block';
    properties: {
        mergedBlock: YooptaBlockData;
        mergedSlateValue: SlateElement[];
    };
    prevProperties: {
        sourceBlock: YooptaBlockData;
        sourceSlateValue: SlateElement[];
        targetBlock: YooptaBlockData;
        targetSlateValue: SlateElement[];
    };
    path: YooptaPath;
};
export type DeleteBlockOperation = {
    type: 'delete_block';
    path: YooptaPath;
    block: YooptaBlockData;
};
export type SetSelectionBlockOperation = {
    type: 'set_block_path';
    path: YooptaPath;
};
export type NormalizePathsBlockOperation = {
    type: 'validate_block_paths';
};
export type SetEditorValueOperation = {
    type: 'set_editor_value';
    properties: {
        value: YooptaContentValue;
    };
    prevProperties: {
        value: YooptaContentValue;
    };
};
export type YooptaOperation = InsertBlockOperation | DeleteBlockOperation | NormalizePathsBlockOperation | SetSelectionBlockOperation | SplitBlockOperation | SetBlockValueOperation | SetBlockMetaOperation | MergeBlockOperation | MoveBlockOperation | SetSlateOperation | SetEditorValueOperation;
export type ApplyTransformsOptions = {
    validatePaths?: boolean;
    source?: ChangeSource;
};
export declare function applyTransforms(editor: YooEditor, ops: YooptaOperation[], options?: ApplyTransformsOptions): void;
//# sourceMappingURL=applyTransforms.d.ts.map