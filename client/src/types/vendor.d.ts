declare module "react-hook-form" {
  export type FieldValues = Record<string, unknown>;
  export type FieldPath<TFieldValues extends FieldValues = FieldValues> =
    Extract<keyof TFieldValues, string>;

  export type ControllerRenderProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    name: TName;
    value: TFieldValues[TName];
    onChange: (...event: unknown[]) => void;
    onBlur: () => void;
  };

  export type ControllerFieldState = {
    invalid?: boolean;
    isTouched?: boolean;
    isDirty?: boolean;
    error?: { message?: string };
  };

  export type UseFormStateReturn<TFieldValues extends FieldValues = FieldValues> = {
    errors: Partial<Record<keyof TFieldValues, unknown>>;
  };

  export type ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > = {
    name: TName;
    control?: Record<string, unknown>;
    render: (props: {
      field: ControllerRenderProps<TFieldValues, TName>;
      fieldState: ControllerFieldState;
      formState: UseFormStateReturn<TFieldValues>;
    }) => import("react").ReactElement | null;
    defaultValue?: unknown;
    rules?: Record<string, unknown>;
    shouldUnregister?: boolean;
  };

  export type UseFormReturn<TFieldValues extends FieldValues = FieldValues> = {
    control: Record<string, unknown>;
    watch: {
      (): TFieldValues;
      <TName extends FieldPath<TFieldValues>>(name: TName): TFieldValues[TName];
    };
    handleSubmit: (cb: (data: TFieldValues) => void) => (e?: unknown) => void;
    setValue: <TName extends FieldPath<TFieldValues>>(
      name: TName,
      value: TFieldValues[TName],
      options?: Record<string, unknown>
    ) => void;
    reset: (values?: Partial<TFieldValues>) => void;
    formState: Record<string, unknown>;
    getFieldState: <TName extends FieldPath<TFieldValues>>(
      name: TName,
      state: Record<string, unknown>
    ) => ControllerFieldState;
  };

  export function useForm<TFieldValues extends FieldValues = FieldValues>(
    props?: Record<string, unknown>
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
  export function zodResolver(
    schema: unknown,
    options?: Record<string, unknown>
  ): (values: unknown) => unknown;
}

declare module "react-day-picker" {
  export type DayPickerProps = {
    className?: string;
    classNames?: Record<string, string>;
    showOutsideDays?: boolean;
    components?: Record<string, import("react").ComponentType<import("react").SVGProps<SVGSVGElement>>>;
  } & Record<string, unknown>;
  export const DayPicker: import("react").ComponentType<DayPickerProps>;
}
