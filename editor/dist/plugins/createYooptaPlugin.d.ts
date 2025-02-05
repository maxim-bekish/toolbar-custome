/// <reference types="react" />
import { SlateElement } from '../editor/types';
import { PluginElementRenderProps, Plugin, PluginOptions, PluginEvents } from './types';
export type ExtendPluginRender<TKeys extends string> = {
    [x in TKeys]: (props: PluginElementRenderProps) => JSX.Element;
};
type ExtractProps<T> = T extends SlateElement<string, infer P> ? P : never;
export type ExtendPlugin<TElementMap extends Record<string, SlateElement>, TOptions> = {
    renders?: {
        [K in keyof TElementMap]?: (props: PluginElementRenderProps) => JSX.Element;
    };
    options?: Partial<PluginOptions<TOptions>>;
    elementProps?: {
        [K in keyof TElementMap]?: (props: ExtractProps<TElementMap[K]>) => ExtractProps<TElementMap[K]>;
    };
    events?: Partial<PluginEvents>;
};
export declare class YooptaPlugin<TElementMap extends Record<string, SlateElement>, TOptions = Record<string, unknown>> {
    private readonly plugin;
    constructor(plugin: Plugin<TElementMap, TOptions>);
    get getPlugin(): Plugin<TElementMap, TOptions>;
    extend(extendPlugin: ExtendPlugin<TElementMap, TOptions>): YooptaPlugin<TElementMap, TOptions>;
}
export {};
//# sourceMappingURL=createYooptaPlugin.d.ts.map