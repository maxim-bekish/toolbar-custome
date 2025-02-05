import { ExtendedLeafProps } from '../../plugins/types';
type Props = Pick<ExtendedLeafProps<any, any>, 'attributes' | 'children'> & {
    placeholder?: string;
};
declare const TextLeaf: ({ children, attributes, placeholder }: Props) => import("react/jsx-runtime").JSX.Element;
export { TextLeaf };
//# sourceMappingURL=TextLeaf.d.ts.map