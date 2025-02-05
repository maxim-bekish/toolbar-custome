import { CSSProperties } from 'react';
declare const BlockOptionsMenuGroup: ({ children }: {
    children: any;
}) => import("react/jsx-runtime").JSX.Element;
declare const BlockOptionsMenuContent: ({ children }: {
    children: any;
}) => import("react/jsx-runtime").JSX.Element;
declare const BlockOptionsMenuItem: ({ children }: {
    children: any;
}) => import("react/jsx-runtime").JSX.Element;
type BlockOptionsSeparatorProps = {
    className?: string;
};
declare const BlockOptionsSeparator: ({ className }: BlockOptionsSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export type BlockOptionsProps = {
    isOpen: boolean;
    onClose: () => void;
    refs: any;
    style: CSSProperties;
    children?: React.ReactNode;
    actions?: ['delete', 'duplicate', 'turnInto', 'copy'] | null;
};
declare const BlockOptions: ({ isOpen, onClose, refs, style, actions, children }: BlockOptionsProps) => import("react/jsx-runtime").JSX.Element | null;
export { BlockOptions, BlockOptionsMenuContent, BlockOptionsMenuGroup, BlockOptionsMenuItem, BlockOptionsSeparator };
//# sourceMappingURL=BlockOptions.d.ts.map