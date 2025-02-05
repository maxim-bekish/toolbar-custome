import { RectangeSelectionProps, RectangeSelectionState } from './SelectionBox';
type RectangeSelectionReturn = RectangeSelectionState & {
    onClose: () => void;
};
export declare const useRectangeSelectionBox: ({ editor, root }: RectangeSelectionProps) => RectangeSelectionReturn;
export {};
//# sourceMappingURL=hooks.d.ts.map