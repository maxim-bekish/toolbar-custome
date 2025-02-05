/// <reference types="react" />
import { YooEditor } from '../../editor/types';
type dragHandleProps = {
    attributes: any;
    listeners: any;
    setActivatorNodeRef: any;
};
type FloatingBlockActionsProps = {
    editor: YooEditor;
    dragHandleProps: dragHandleProps | null;
};
export declare const FloatingBlockActions: import("react").MemoExoticComponent<({ editor, dragHandleProps }: FloatingBlockActionsProps) => import("react/jsx-runtime").JSX.Element>;
export {};
//# sourceMappingURL=FloatingBlockActions.d.ts.map