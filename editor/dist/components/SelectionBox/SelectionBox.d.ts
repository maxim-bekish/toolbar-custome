/// <reference types="react" />
import { YooEditor } from '../../editor/types';
export type RectangeSelectionProps = {
    editor: YooEditor;
    root?: HTMLElement | React.MutableRefObject<HTMLElement | null> | false;
};
export type RectangeSelectionState = {
    origin: [number, number];
    coords: [number, number];
    selection: boolean;
};
export type SelectionBoxProps = {
    origin: RectangeSelectionState['origin'];
    coords: RectangeSelectionState['coords'];
    isOpen: boolean;
};
declare const SelectionBox: ({ origin, coords, isOpen }: SelectionBoxProps) => import("react/jsx-runtime").JSX.Element | null;
export { SelectionBox };
//# sourceMappingURL=SelectionBox.d.ts.map