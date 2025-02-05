import { YooEditor, YooptaContentValue } from '../editor/types';
type StyleElement = {
    id?: string;
    content: string;
};
type MetaElement = {
    content?: string;
    name?: string;
    'http-equiv'?: string;
    property?: string;
    charset?: string;
};
type StyleAttribute = {
    [key: string]: string | number;
};
type ElementAttributes = {
    style?: StyleAttribute;
    [key: string]: any;
};
export type EmailTemplateOptions = {
    head?: {
        styles?: StyleElement[];
        meta?: MetaElement[];
        title?: string;
    };
    body?: {
        attrs?: ElementAttributes;
    };
    container?: {
        attrs?: ElementAttributes;
    };
    customTemplate?: (content: string) => string;
};
export declare function getEmail(editor: YooEditor, content: YooptaContentValue, opts?: EmailTemplateOptions): string;
export {};
//# sourceMappingURL=getEmail.d.ts.map