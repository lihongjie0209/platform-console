import type { MaybeRefOrGetter, VNodeChild } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { FormItemRule } from 'element-plus';

export type BizCrudKey = string | number;

export type BizFormMode = 'dialog' | 'drawer' | 'page';

export type BizFieldType =
  | 'input'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'date-range'
  | 'slot';

export interface BizFieldOption<Value = any> {
  label: string;
  value: Value;
  disabled?: boolean;
}

export interface BizFieldGrid {
  span?: number;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface BizFormField<Model extends Record<string, any> = Record<string, any>> {
  key: Extract<keyof Model, string>;
  label: string | (() => string);
  type?: BizFieldType;
  placeholder?: string | (() => string);
  options?: MaybeRefOrGetter<BizFieldOption[]>;
  rules?: FormItemRule | FormItemRule[];
  props?: Record<string, unknown>;
  grid?: BizFieldGrid;
  slot?: string;
  visible?: (model: Record<string, any>) => boolean;
  disabled?: boolean | ((model: Record<string, any>) => boolean);
}

export interface BizCrudListResult<Row> {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BizCrudAdapter<Row, Query, Form, Key extends BizCrudKey = BizCrudKey> {
  list: (query: Query) => Promise<BizCrudListResult<Row>>;
  detail?: (key: Key) => Promise<Partial<Form>>;
  create?: (form: Form) => Promise<void>;
  update?: (key: Key, form: Form) => Promise<void>;
  remove?: (keys: Key[]) => Promise<void>;
}

export type BizCrudColumn<Row> = UI.TableColumnWithKey<Row> & {
  slot?: string;
};

export interface BizCrudFormConfig<Row, Form extends Record<string, any>, Key extends BizCrudKey> {
  mode: BizFormMode;
  fields: BizFormField<Form>[];
  createModel: () => Form;
  createTitle: string | (() => string);
  editTitle: string | (() => string);
  width?: string | number;
  toCreateRoute?: () => RouteLocationRaw;
  toEditRoute?: (key: Key, row: Row) => RouteLocationRaw;
}

export interface BizCrudConfig<
  Row extends Record<string, any>,
  Query extends Record<string, any>,
  Form extends Record<string, any>,
  Key extends BizCrudKey = BizCrudKey
> {
  title: string | (() => string);
  rowKey: Extract<keyof Row, string>;
  createQuery: () => Query;
  searchFields?: BizFormField<Query>[];
  columns: () => BizCrudColumn<Row>[];
  form: BizCrudFormConfig<Row, Form, Key>;
  pagination?: {
    pageKey?: Extract<keyof Query, string>;
    pageSizeKey?: Extract<keyof Query, string>;
    pageSizes?: number[];
  };
  mapRowToForm?: (row: Row) => Partial<Form>;
  deleteConfirm?: string | (() => string);
  showSelection?: boolean;
  showColumnSetting?: boolean;
  renderEmpty?: () => VNodeChild;
}

export interface BizCrudFormExpose {
  validate: () => Promise<boolean>;
  resetValidation: () => void;
}

export function resolveBizText(value: string | (() => string)) {
  return typeof value === 'function' ? value() : value;
}
