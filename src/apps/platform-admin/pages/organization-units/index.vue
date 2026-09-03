<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import type { OrganizationUnit, OrganizationUnitForm, OrganizationUnitTreeNode } from '../../api';
import { createOrganizationUnit, getOrganizationUnit, treeOrganizationUnits, updateOrganizationUnit } from '../../api';
import { flattenOrganizationTree } from '../../organization-directory';

defineOptions({ name: 'PlatformAdminOrganizationUnits' });
const platformStore = usePlatformStore();
const loading = ref(false);
const saving = ref(false);
const units = ref<OrganizationUnitTreeNode[]>([]);
const keyword = ref('');
const truncated = ref(false);
const parentSearching = ref(false);
const parentOptions = ref<OrganizationUnit[]>([]);
const editorVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<OrganizationUnitForm>(emptyForm());
const tenantID = computed(() => platformStore.selectedTenantId);
const canCreateUnit = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.organization-unit.create' })
);
const canUpdateUnit = computed(() =>
  platformStore.hasPermission({
    scope: 'tenant',
    codes: ['tenant.organization-unit.read', 'tenant.organization-unit.update'],
    strategy: 'all'
  })
);
const treeGuard = createLatestRequestGuard();
const parentGuard = createLatestRequestGuard();
const rules: FormRules<OrganizationUnitForm> = {
  code: [{ required: true, message: '请输入组织编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }]
};

function emptyForm(parentID = ''): OrganizationUnitForm {
  return { id: '', parent_id: parentID, code: '', name: '', status: 'active', version: 0 };
}
function resetForm(value = emptyForm()) {
  Object.assign(form, value);
  formRef.value?.clearValidate();
}
async function loadData() {
  if (!tenantID.value) {
    units.value = [];
    return;
  }
  loading.value = true;
  const request = treeGuard.begin();
  try {
    const searchKeyword = keyword.value.trim();
    const result = await treeOrganizationUnits({
      tenantID: tenantID.value,
      mode: searchKeyword ? 'search_with_ancestors' : 'lazy_children',
      keyword: searchKeyword,
      maxDepth: searchKeyword ? 32 : 1,
      maxNodes: searchKeyword ? 500 : 100
    });
    if (treeGuard.isCurrent(request)) {
      units.value = result.nodes || [];
      truncated.value = result.truncated;
    }
  } finally {
    if (treeGuard.isCurrent(request)) loading.value = false;
  }
}
async function loadChildren(
  row: OrganizationUnitTreeNode,
  _treeNode: unknown,
  resolve: (items: OrganizationUnitTreeNode[]) => void
) {
  const requestedTenantID = tenantID.value;
  try {
    const result = await treeOrganizationUnits({
      tenantID: requestedTenantID,
      mode: 'lazy_children',
      parentID: row.id,
      maxDepth: 1,
      maxNodes: 100
    });
    if (tenantID.value !== requestedTenantID) {
      resolve([]);
      return;
    }
    if (result.truncated) window.$message?.warning('该节点下级超过 100 个，请使用搜索定位');
    resolve(result.nodes || []);
  } catch {
    resolve([]);
  }
}
function search() {
  loadData();
}
async function searchParents(value = '') {
  if (!tenantID.value) return;
  const request = parentGuard.begin();
  parentSearching.value = true;
  try {
    const result = await treeOrganizationUnits({
      tenantID: tenantID.value,
      mode: 'search_with_ancestors',
      keyword: value.trim(),
      status: 'active',
      maxDepth: 32,
      maxNodes: 100
    });
    if (!parentGuard.isCurrent(request)) return;
    const selected = parentOptions.value.find(item => item.id === form.parent_id);
    const options = flattenOrganizationTree(result.nodes || []).filter(item => item.id !== form.id);
    parentOptions.value = selected
      ? Array.from(new Map([selected, ...options].map(item => [String(item.id), item])).values())
      : options;
  } finally {
    if (parentGuard.isCurrent(request)) parentSearching.value = false;
  }
}
function openCreate(parentID = '') {
  if (!canCreateUnit.value) return;
  resetForm(emptyForm(parentID));
  editorVisible.value = true;
  searchParents();
}
async function openEdit(unit: OrganizationUnit) {
  if (!canUpdateUnit.value) return;
  resetForm({
    id: String(unit.id),
    parent_id: String(unit.parent_id || ''),
    code: String(unit.code),
    name: String(unit.name),
    status: String(unit.status),
    version: Number(unit.version)
  });
  editorVisible.value = true;
  parentOptions.value = [];
  if (unit.parent_id) {
    try {
      parentOptions.value = [await getOrganizationUnit(unit.parent_id)];
    } catch {
      parentOptions.value = [];
    }
  }
}
async function save() {
  if ((form.id && !canUpdateUnit.value) || (!form.id && !canCreateUnit.value)) return;
  if (!(await formRef.value?.validate())) return;
  saving.value = true;
  try {
    if (form.id) await updateOrganizationUnit(form);
    else await createOrganizationUnit(tenantID.value, form);
    editorVisible.value = false;
    window.$message?.success(form.id ? '组织单元已更新' : '组织单元已创建');
    await loadData();
  } finally {
    saving.value = false;
  }
}
function statusType(status: unknown) {
  return status === 'active' ? 'success' : 'danger';
}
watch(tenantID, () => {
  treeGuard.invalidate();
  parentGuard.invalidate();
  units.value = [];
  parentOptions.value = [];
  keyword.value = '';
  loadData();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">组织架构</h2>
          <p class="mb-0 mt-6px text-13px text-#999">维护当前租户的部门树；移动节点时禁止选择自身及其后代。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElInput
            v-model="keyword"
            class="w-240px"
            clearable
            placeholder="搜索组织编码或名称"
            @keyup.enter="search"
            @clear="search"
          />
          <ElButton @click="search">查询</ElButton>
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton v-if="canCreateUnit" type="primary" :disabled="!tenantID" @click="openCreate()">
            新增根节点
          </ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <ElAlert
      v-else-if="truncated"
      class="mb-12px"
      title="结果已达到节点上限，请缩小搜索范围"
      type="warning"
      show-icon
      :closable="false"
    />
    <ElTable
      v-else
      v-loading="loading"
      :data="units"
      row-key="id"
      lazy
      border
      :load="loadChildren"
      :tree-props="{ children: 'children', hasChildren: 'has_children' }"
    >
      <ElTableColumn prop="name" label="组织名称" min-width="220" />
      <ElTableColumn prop="code" label="组织编码" min-width="160" />
      <ElTableColumn prop="path" label="物化路径" min-width="240" show-overflow-tooltip />
      <ElTableColumn label="状态" width="100">
        <template #default="{ row }">
          <ElTag :type="statusType(row.status)" effect="plain">{{ row.status }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="version" label="版本" width="90" />
      <ElTableColumn label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <ElButton v-if="canCreateUnit" link type="primary" @click="openCreate(row.id)">新增下级</ElButton>
          <ElButton v-if="canUpdateUnit" link type="primary" @click="openEdit(row)">编辑</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>

  <ElDrawer v-model="editorVisible" :title="form.id ? '编辑组织单元' : '创建组织单元'" size="540px">
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="上级组织">
        <ElSelect
          v-model="form.parent_id"
          filterable
          remote
          reserve-keyword
          clearable
          :remote-method="searchParents"
          :loading="parentSearching"
          placeholder="不选择表示根节点"
        >
          <ElOption
            v-for="item in parentOptions"
            :key="String(item.id)"
            :label="`${item.name || item.code} (${item.path || item.code})`"
            :value="String(item.id)"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="组织编码" prop="code"><ElInput v-model="form.code" :disabled="Boolean(form.id)" /></ElFormItem>
      <ElFormItem label="组织名称" prop="name"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem v-if="form.id" label="状态">
        <ElSelect v-model="form.status">
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="disabled" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="editorVisible = false">取消</ElButton>
      <ElButton v-if="form.id ? canUpdateUnit : canCreateUnit" type="primary" :loading="saving" @click="save">
        保存
      </ElButton>
    </template>
  </ElDrawer>
</template>
