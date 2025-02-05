import { YooptaMark } from '../marks';
import { Plugin, PluginEvents } from './types';
import { SlateElement } from '../editor/types';
type Props<TElementMap extends Record<string, SlateElement>, TOptions> = Plugin<TElementMap, TOptions> & {
    id: string;
    marks?: YooptaMark<any>[];
    options: Plugin<TElementMap, TOptions>['options'];
    placeholder?: string;
    events?: PluginEvents;
};
declare const SlateEditorComponent: <TElementMap extends Record<string, SlateElement<string, any>>, TOptions>({ id, customEditor, elements, marks, events, options, extensions: withExtensions, placeholder, }: Props<TElementMap, TOptions>) => import("react/jsx-runtime").JSX.Element;
export { SlateEditorComponent };
//# sourceMappingURL=SlateEditorComponent.d.ts.map