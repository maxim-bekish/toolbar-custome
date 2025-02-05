import { YooEditor } from '../../editor/types';
type MultiSelectionOptions = {
    editor: YooEditor;
};
type SelectionState = {
    selectionStarted: boolean;
    indexToSelect: null | number;
    startedIndexToSelect: null | number;
};
export declare function useMultiSelection({ editor }: MultiSelectionOptions): {
    onMouseDown: (e: React.MouseEvent) => void;
    onShiftArrowUp: (event: any) => void;
    onShiftArrowDown: (event: any) => void;
    selectionState: SelectionState;
};
export {};
//# sourceMappingURL=selection.d.ts.map