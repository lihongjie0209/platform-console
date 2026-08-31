# 业务 CRUD 组件

`BizCrudPage` 统一列表查询、分页、选择、增删改和表单承载。业务页面提供类型化配置与 API 适配器，不直接组织 `ElCard`、`ElTable`、`ElPagination`、`ElDialog` 或 `ElDrawer`。

视觉规范以 Soybean Admin Element Plus 为唯一来源：沿用其 `card-wrapper`、主题变量、Element Plus 默认组件和 UnoCSS 布局，不在业务组件层另设品牌色、字体、圆角、阴影或动效。

## 最小配置

```ts
const config: BizCrudConfig<User, UserQuery, UserForm, number> = {
  title: '用户管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 10, keyword: '' }),
  searchFields: [{ key: 'keyword', label: '关键词' }],
  columns: () => [
    { type: 'selection', prop: 'selection', width: 48 },
    { prop: 'name', label: '姓名' },
    { prop: 'operate', label: '操作', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    createTitle: '新增用户',
    editTitle: '编辑用户',
    createModel: () => ({ name: '' }),
    fields: [{ key: 'name', label: '姓名', rules: { required: true, message: '请输入姓名' } }]
  }
};
```

适配器必须把项目请求结果转换为标准分页结果。失败时抛出错误，组件会结束 loading，并保留当前查询或表单数据。

```ts
const adapter: BizCrudAdapter<User, UserQuery, UserForm, number> = {
  async list(query) {
    const result = await fetchUsers(query);
    return { items: result.records, total: result.total, page: result.current, pageSize: result.size };
  },
  create: form => createUser(form),
  update: (id, form) => updateUser(id, form),
  remove: ids => deleteUsers(ids)
};
```

## 扩展点

- 表格列设置 `slot: 'status'` 后，通过 `#cell-status="{ row }"` 自定义内容。
- 表单字段设置 `type: 'slot'` 后，通过 `#field-字段名="{ model }"` 实现联动或复杂控件。
- `toolbar-prefix`、`toolbar-suffix`、`form-extra` 用于权限、导入导出和业务附加操作。
- `batch-actions` 在选中数据时进入统一批量操作栏，可直接获得 `rows`、`keys` 和 `remove`。
- 常见字段应优先使用 schema；只有 schema 无法清晰表达时才使用插槽。

## 表单承载模式

- `dialog` 和 `drawer` 由 `BizCrudPage` 管理打开、校验、提交与关闭。
- `page` 模式配置 `toCreateRoute`、`toEditRoute`，列表模板只负责导航。
- 独立路由页复用同一份 `form.fields` 和 adapter，并用 `useBizCrudForm` 管理详情与提交：

```vue
<BizFormPage :title="title" :submitting="submitting" @cancel="router.back()" @submit="save">
  <BizCrudForm ref="formRef" v-model="model" :fields="config.form.fields" />
</BizFormPage>
```

Element Plus 可以在业务组件内部和明确的复杂插槽中使用；已迁移页面的 CRUD 结构组件受 ESLint 规则限制。

## 其他公共业务组件

公共出口位于 `@/components/business`：

- `BizPageContainer`：统一普通业务页的标题、说明、操作区、loading 和内容卡片。
- `BizDescriptions`：类型化详情字段、空值占位、格式化函数和字段插槽。
- `BizEmptyState`：统一无数据说明和引导操作。
- `BizFileUpload`：统一文件数量、大小校验、提示和上传事件。
- `BizImportExportActions`：统一导入文件选择与导出 loading 状态。
- `BizTreeCrudPage`：统一菜单、组织等树形表格页面的卡片、工具栏、列配置和表格结构。
- `BizTreeCheckDialog`：统一菜单权限、按钮权限等树勾选弹窗，负责并发初始化、回显与半选节点提交。
- `BizRemoteSelect`：统一远程检索、分页加载、请求竞态保护和已选值回显。
- `BizDictText` / `BizDictTag`：统一字典值到文本或状态标签的映射与空值展示。
- `BizPermissionAction` / `BizActionButton`：统一权限降级、确认操作、防重复提交和成功反馈。
- `BizAsyncDialog`：统一弹窗初始化、提交 loading、失败保留和成功关闭。
- `BizBatchActionBar`：统一批量选择数量、清空选择和批量操作入口。
- `BizDetailPage`：统一详情页的返回、标题、说明、操作区、摘要和内容卡片。
- `BizFormSection`：统一复杂表单分段、说明与折叠状态。
- `BizDynamicFields`：统一可增删表单数组的最小/最大数量和数组更新；业务通过默认插槽渲染每一项。
- `BizImportDialog`：统一模板下载、文件选择、大小校验、提交 loading 和失败保留。
- `BizExportTask`：统一导出任务创建、可选轮询、成功下载及失败反馈。
- `BizImagePreview` / `BizCopyText` / `BizLink`：统一图片预览、复制反馈及内外链状态。
- `BizCascadeSelect` / `BizDateRange` / `BizFilterBar`：统一级联选择、日期区间格式及筛选栏结构；筛选预设由业务页面提供和持久化。
- `BizColumnSetting`：业务层对现有列配置拖拽能力的统一出口。
- `BizStepsForm` / `BizTimeline` / `BizCommentPanel`：统一分步流程、操作记录和评论提交的交互骨架。
- `BizPrint`：基于项目既有 `print-js` 的统一打印入口。
- `BizErrorBoundary`：局部内容渲染失败后的可重试降级。
- `BizRichText`：基于项目既有 WangEditor 的受控富文本封装。

公共组件只负责稳定的交互和视觉规则。接口请求、文件解析、下载实现、权限判断等业务逻辑由调用方提供，避免组件和某个后端协议绑定。

## 复杂表单与导入导出

```vue
<BizFormSection title="联系人" collapsible>
  <BizDynamicFields v-model="form.contacts" :create-item="() => ({ name: '', phone: '' })">
    <template #default="{ item }">
      <ElInput v-model="item.name" placeholder="姓名" />
    </template>
  </BizDynamicFields>
</BizFormSection>

<BizImportDialog v-model="importVisible" :import-file="file => importUsers(file)" template-url="/templates/users.xlsx" />
<BizExportTask :create="createExport" :query="queryExport" />
```

`BizExportTask` 的 `create` 与 `query` 返回 `{ id, status, downloadUrl?, message? }`；状态为 `success` 时会打开下载地址，状态为 `failed` 时保留页面并提示错误。

## 详情、流程与展示

```vue
<BizDetailPage title="订单详情" @back="router.back()">
  <template #actions><BizPrint printable="order-print-area" /></template>
  <BizDescriptions :data="order" :items="detailItems" />
  <BizTimeline :items="orderLogs" />
</BizDetailPage>

<BizStepsForm v-model:active="step" :steps="steps" @finish="submit">
  <component :is="stepComponents[step]" />
</BizStepsForm>
```

富文本使用项目内置的 WangEditor；代码编辑器尚未绑定业务级依赖，待确定 Monaco、CodeMirror 或服务端编辑协议后再接入，避免公共组件库引入不可控的大型依赖。
