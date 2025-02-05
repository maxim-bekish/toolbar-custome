/// <reference types="react" />
import * as BlockOptionsUI from './BlockOptions/BlockOptions';
export { type BlockOptionsProps } from './BlockOptions/BlockOptions';
export declare const UI: {
    ExtendedBlockActions: ({ id, className, style, onClick, children }: {
        id?: string | undefined;
        className?: string | undefined;
        style?: import("react").CSSProperties | undefined;
        onClick?: (() => void) | undefined;
        children: import("react").ReactNode;
    }) => import("react/jsx-runtime").JSX.Element | null;
    Portal: (props: {
        children: import("react").ReactNode;
        id: string;
    }) => import("react/jsx-runtime").JSX.Element | null;
    Overlay: ({ className, children, lockScroll, ...props }: {
        children: import("react").ReactNode;
        lockScroll?: boolean | undefined;
        className?: string | undefined;
        onClick?: ((e: import("react").MouseEvent<Element, MouseEvent>) => void) | undefined;
        onMouseDown?: ((e: import("react").MouseEvent<Element, MouseEvent>) => void) | undefined;
        style?: import("react").CSSProperties | undefined;
    }) => import("react/jsx-runtime").JSX.Element;
    BlockOptions: ({ isOpen, onClose, refs, style, actions, children }: BlockOptionsUI.BlockOptionsProps) => import("react/jsx-runtime").JSX.Element | null;
    BlockOptionsMenuContent: ({ children }: {
        children: any;
    }) => import("react/jsx-runtime").JSX.Element;
    BlockOptionsMenuGroup: ({ children }: {
        children: any;
    }) => import("react/jsx-runtime").JSX.Element;
    BlockOptionsMenuItem: ({ children }: {
        children: any;
    }) => import("react/jsx-runtime").JSX.Element;
    BlockOptionsSeparator: ({ className }: {
        className?: string | undefined;
    }) => import("react/jsx-runtime").JSX.Element;
};
//# sourceMappingURL=index.d.ts.map