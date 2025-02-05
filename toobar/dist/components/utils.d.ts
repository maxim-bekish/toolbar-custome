import { YooEditor } from '@yoopta/editor';
type Params = {
    editor: YooEditor;
    onClose: () => void;
    empty?: boolean;
    view?: 'small' | 'default';
};
export declare function buildActionMenuRenderProps({ editor, view, onClose }: Params): {
    actions: {
        type: string;
        title: any;
        description: any;
        icon: any;
    }[];
    onClose: () => void;
    empty: boolean;
    getItemProps: (type: any) => {
        onMouseEnter: () => undefined;
        'data-action-menu-item': boolean;
        'data-action-menu-item-type': any;
        'aria-selected': boolean;
        onClick: () => void;
    };
    getRootProps: () => {
        'data-action-menu-list': boolean;
    };
    editor: YooEditor;
    view: "small" | "default" | undefined;
};
export {};
//# sourceMappingURL=utils.d.ts.map