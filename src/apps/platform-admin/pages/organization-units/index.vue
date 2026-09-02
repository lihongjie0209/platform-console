<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import type { OrganizationUnit, OrganizationUnitForm } from '../../api';
import { createOrganizationUnit, listOrganizationUnits, updateOrganizationUnit } from '../../api';
import { buildOrganizationTree, descendantOrganizationIDs } from '../../organization-tree';

defineOptions({ name: 'PlatformAdminOrganizationUnits' });
interface ParentOption {
  value: string;
  label: string;
  disabled: boolean;
  children: ParentOption[];
}
const platformStore = usePlatformStore();
const loading = ref(false);
const saving = ref(false);
const units = ref<OrganizationUnit[]>([]);
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
const tree = computed(() => buildOrganizationTree(units.value));
const forbiddenParentIDs = computed(() =>
  form.id ? descendantOrganizationIDs(units.value, form.id) : new Set<string>()
);
const parentOptions = computed<ParentOption[]>(() => {
  const map = (nodes: ReturnType<typeof buildOrganizationTree>): ParentOption[] =>
    nodes.map(node => ({
      value: String(node.id),
      label: `${node.name || node.code} (${node.code})`,
      disabled: forbiddenParentIDs.value.has(String(node.id)),
      children: map(node.children)
    }));
  return map(tree.value);
});
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
  try {
    units.value = await listOrganizationUnits(tenantID.value);
  } finally {
    loading.value = false;
  }
}
function openCreate(parentID = '') {
  if (!canCreateUnit.value) return;
  resetForm(emptyForm(parentID));
  editorVisible.value = true;
}
function openEdit(unit: OrganizationUnit) {
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
watch(tenantID, loadData);
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
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton v-if="canCreateUnit" type="primary" :disabled="!tenantID" @click="openCreate()">
            新增根节点
          </ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <ElTable
      v-else
      v-loading="loading"
      :data="tree"
      row-key="id"
      default-expand-all
      border
      :tree-props="{ children: 'children' }"
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
        <ElTreeSelect
          v-model="form.parent_id"
          :data="parentOptions"
          check-strictly
          clearable
          default-expand-all
          placeholder="不选择表示根节点"
        />
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
