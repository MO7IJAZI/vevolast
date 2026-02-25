declare module "react-hook-form" {
  export type FieldValues = Record<string, any>;
  export type FieldPath<TFieldValues extends FieldValues = FieldValues> =
    keyof TFieldValues extends string ? keyof TFieldValues : string;

  export type ControllerRenderProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    name: TName;
    value: any;
    onChange: (...event: any[]) => void;
    onBlur: () => void;
    ref: import("react").Ref<any>;
  };

  export type ControllerFieldState = {
    invalid?: boolean;
    isTouched?: boolean;
    isDirty?: boolean;
    error?: { message?: string };
  };

  export type UseFormStateReturn<TFieldValues extends FieldValues = FieldValues> = {
    errors: Partial<Record<keyof TFieldValues, any>>;
  };

  export type ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    name: TName;
    control?: any;
    render: (props: {
      field: ControllerRenderProps<TFieldValues, TName>;
      fieldState: ControllerFieldState;
      formState: UseFormStateReturn<TFieldValues>;
    }) => import("react").ReactElement | null;
    defaultValue?: any;
    rules?: any;
    shouldUnregister?: boolean;
  };

  export type UseFormReturn<TFieldValues extends FieldValues = FieldValues> = {
    control: any;
    watch: (name?: any) => any;
    handleSubmit: (cb: (data: TFieldValues) => void) => (e?: any) => void;
    setValue: (name: any, value: any, options?: any) => void;
    reset: (values?: Partial<TFieldValues>) => void;
    formState: any;
    getFieldState: (name: any, state: any) => any;
  };

  export function useForm<TFieldValues extends FieldValues = FieldValues>(
    props?: any
  ): UseFormReturn<TFieldValues>;

  export function useFormContext<TFieldValues extends FieldValues = FieldValues>(): UseFormReturn<TFieldValues>;

  export function FormProvider<TFieldValues extends FieldValues = FieldValues>(
    props: { children?: import("react").ReactNode } & UseFormReturn<TFieldValues>
  ): import("react").ReactElement;

  export const Controller: <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  >(
    props: ControllerProps<TFieldValues, TName>
  ) => import("react").ReactElement | null;
}

declare module "@hookform/resolvers/zod" {
  export function zodResolver(schema: any, options?: any): any;
}

declare module "react-day-picker" {
  export type DayPickerProps = Record<string, any>;
  export const DayPicker: import("react").ComponentType<DayPickerProps>;
}
