<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { collectAllPages } from '@/platform/pagination';
import { applicationPageOptionsFor, pageUsesApplicationNamespace } from '@/apps/registry';
import { type PermissionCatalogOption, buildPermissionCatalogOptions } from '@/platform/permission-catalog';
import { type MenuPermissionScope, normalizeMenuPermissionScope } from '@/platform/navigation';
import type { Application, ApplicationMenu } from '../../api';
import {
  deleteMenu,
  getApplication,
  listApplications,
  listMenuDraft,
  listMyPermissionCatalog,
  publishMenus,
  upsertMenu
} from '../../api';
import {
  buildMenuTree,
  descendantMenuIDs,
  findMenuRouteConflict,
  isApplicationDefaultRouteValid
} from '../../menu-tree';

defineOptions({ name: 'PlatformAdminMenus' });

interface MenuForm {
  id: string;
  parent_id: string;
  code: string;
  type: string;
  name: string;
  i18n_key: string;
  route: string;
  component: string;
  icon: string;
  external_url: string;
  permission_code: string;
  permission_scope: MenuPermissionScope;
  sort_order: number;
  visible: boolean;
  version: number;
}

const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const permissionLoading = ref(false);
const permissionOptions = ref<PermissionCatalogOption[]>([]);
const platformStore = usePlatformStore();
let permissionRequestSequence = 0;
const menuRequestGuard = createLatestRequestGuard();
let loadedMenuApplicationID = '';
const applications = ref<Application[]>([]);
const applicationID = ref('');
const menus = ref<ApplicationMenu[]>([]);
const editorVisible = ref(false);
const publishVisible = ref(false);
const publishComment = ref('');
const formRef = ref<FormInstance>();
const form = reactive<MenuForm>(emptyMenu());
const tree = computed(() => buildMenuTree(menus.value));
const selectedApplication = computed(() => applications.value.find(item => item.id === applicationID.value));
const applicationPageOptions = computed(() =>
  applicationPageOptionsFor(String(selectedApplication.value?.code || ''), form.component)
);
const selectedTenantID = computed(() => platformStore.selectedTenantId);
const forbiddenParentIDs = computed(() => (form.id ? descendantMenuIDs(menus.value, form.id) : new Set<string>()));
const defaultRouteValid = computed(() =>
  isApplicationDefaultRouteValid(
    String(selectedApplication.value?.code || ''),
    String(selectedApplication.value?.default_route || ''),
    menus.value
  )
);
const canUpdateMenus = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'application.menu.update' })
);
const canDeleteMenus = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'application.menu.delete' })
);
const canPublishMenus = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'application.menu.publish' })
);

const rules: FormRules<MenuForm> = {
  code: [{ required: true, message: '请输入菜单编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }]
};

function emptyMenu(parentID = ''): MenuForm {
  return {
    id: '',
    parent_id: parentID,
    code: '',
    type: 'page',
    name: '',
    i18n_key: '',
    route: '',
    component: '',
    icon: '',
    external_url: '',
    permission_code: '',
    permission_scope: 'tenant',
    sort_order: 0,
    visible: true,
    version: 0
  };
}

function resetForm(value = emptyMenu()) {
  Object.assign(form, value);
  formRef.value?.clearValidate();
}

async function loadApplications() {
  applications.value = await collectAllPages((page, pageSize) => listApplications(page, pageSize));
  if (!applications.value.some(item => item.id === applicationID.value)) {
    applicationID.value = String(applications.value[0]?.id || '');
  }
}

async function loadMenus() {
  const requestedApplicationID = applicationID.value;
  const request = menuRequestGuard.begin();
  if (requestedApplicationID !== loadedMenuApplicationID) {
    menus.value = [];
    editorVisible.value = false;
    publishVisible.value = false;
    publishComment.value = '';
  }
  if (!requestedApplicationID) {
    loadedMenuApplicationID = '';
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await listMenuDraft(requestedApplicationID);
    if (menuRequestGuard.isCurrent(request) && applicationID.value === requestedApplicationID) {
      menus.value = result;
      loadedMenuApplicationID = requestedApplicationID;
    }
  } finally {
    if (menuRequestGuard.isCurrent(request)) loading.value = false;
  }
}

function openCreate(parentID = '') {
  if (!canUpdateMenus.value) return;
  resetForm(emptyMenu(parentID));
  editorVisible.value = true;
  loadPermissionOptions();
}

function openEdit(menu: ApplicationMenu) {
  if (!canUpdateMenus.value) return;
  resetForm({
    ...emptyMenu(),
    id: String(menu.id || ''),
    parent_id: String(menu.parent_id || ''),
    code: String(menu.code || ''),
    type: String(menu.type || 'page'),
    name: String(menu.name || ''),
    i18n_key: String(menu.i18n_key || ''),
    route: String(menu.route || ''),
    component: String(menu.component || ''),
    icon: String(menu.icon || ''),
    external_url: String(menu.external_url || ''),
    permission_code: String(menu.permission_code || ''),
    permission_scope: normalizeMenuPermissionScope(menu.permission_scope),
    sort_order: Number(menu.sort_order || 0),
    visible: menu.visible !== false,
    version: Number(menu.version || 0)
  });
  editorVisible.value = true;
  loadPermissionOptions();
}

async function loadPermissionOptions(search = '') {
  permissionRequestSequence += 1;
  const sequence = permissionRequestSequence;
  if (!selectedTenantID.value) {
    permissionOptions.value = buildPermissionCatalogOptions([], form.permission_code);
    return;
  }
  permissionLoading.value = true;
  try {
    const result = await listMyPermissionCatalog({
      tenantID: selectedTenantID.value,
      permissionScope: form.permission_scope,
      search
    });
    if (sequence === permissionRequestSequence) {
      permissionOptions.value = buildPermissionCatalogOptions(result.items, form.permission_code);
    }
  } catch {
    if (sequence === permissionRequestSequence) {
      permissionOptions.value = buildPermissionCatalogOptions([], form.permission_code);
    }
  } finally {
    if (sequence === permissionRequestSequence) permissionLoading.value = false;
  }
}

function changePermissionScope() {
  form.permission_code = '';
  permissionOptions.value = [];
  loadPermissionOptions();
}

function menuRouteConflictMessage() {
  const conflict = findMenuRouteConflict(String(selectedApplication.value?.code || ''), menus.value, {
    id: form.id,
    code: form.code,
    type: form.type,
    route: form.route,
    status: 'active'
  });
  return conflict ? `最终路由 ${conflict.path} 与 ${conflict.menuCode} 冲突` : '';
}

async function saveMenu() {
  if (!(await formRef.value?.validate())) return;
  if (form.type === 'page' && (!form.route || !form.component)) {
    window.$message?.warning('页面菜单必须配置路由和已注册页面键');
    return;
  }
  if (
    form.type === 'page' &&
    !pageUsesApplicationNamespace(form.component, String(selectedApplication.value?.code || ''))
  ) {
    window.$message?.warning('页面键必须属于当前应用命名空间');
    return;
  }
  if (form.type === 'external' && !form.external_url) {
    window.$message?.warning('外部链接菜单必须配置 URL');
    return;
  }
  const conflictMessage = menuRouteConflictMessage();
  if (conflictMessage) {
    window.$message?.warning(conflictMessage);
    return;
  }
  saving.value = true;
  try {
    await upsertMenu(
      {
        id: form.id || undefined,
        application_id: applicationID.value,
        parent_id: form.parent_id,
        code: form.code,
        type: form.type,
        name: form.name,
        i18n_key: form.i18n_key,
        route: form.route,
        component: form.component,
        icon: form.icon,
        external_url: form.external_url,
        permission_code: form.permission_code,
        permission_scope: form.permission_scope,
        sort_order: form.sort_order,
        visible: form.visible,
        status: 'active'
      },
      form.version
    );
    editorVisible.value = false;
    window.$message?.success(form.id ? '菜单已更新' : '菜单已创建');
    await loadMenus();
  } finally {
    saving.value = false;
  }
}

async function removeMenu(menu: ApplicationMenu) {
  if (!canDeleteMenus.value) return;
  await deleteMenu(String(menu.id), Number(menu.version));
  window.$message?.success('菜单已删除');
  await loadMenus();
}

async function publish() {
  if (!applicationID.value || !canPublishMenus.value) return;
  if (!defaultRouteValid.value) {
    window.$message?.warning('应用默认路由必须指向当前草稿中的启用叶子菜单或应用概览');
    return;
  }
  publishing.value = true;
  try {
    const application = await getApplication(applicationID.value);
    const result = await publishMenus(applicationID.value, Number(application.version), publishComment.value);
    publishVisible.value = false;
    publishComment.value = '';
    window.$message?.success(`菜单版本 ${result.release.release_number} 已发布`);
    await Promise.all([loadApplications(), loadMenus()]);
  } finally {
    publishing.value = false;
  }
}

watch(applicationID, loadMenus);
onMounted(async () => {
  await loadApplications();
});
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">菜单发布工作台</h2>
          <p class="mb-0 mt-6px text-13px text-#999">编辑草稿树，并使用应用数据版本进行乐观锁发布。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSelect v-model="applicationID" class="w-240px" filterable placeholder="选择应用">
            <ElOption
              v-for="item in applications"
              :key="String(item.id)"
              :label="`${item.name} (${item.code})`"
              :value="String(item.id)"
            />
          </ElSelect>
          <ElButton :loading="loading" @click="loadMenus">刷新</ElButton>
          <ElButton v-if="canUpdateMenus" type="primary" :disabled="!applicationID" @click="openCreate()">
            新增根菜单
          </ElButton>
          <ElButton
            v-if="canPublishMenus"
            type="success"
            :disabled="loading || !menus.length || !defaultRouteValid"
            @click="publishVisible = true"
          >
            发布
          </ElButton>
        </div>
      </div>
    </template>

    <ElAlert
      v-if="selectedApplication"
      class="mb-16px"
      :type="loading || defaultRouteValid ? 'info' : 'warning'"
      :closable="false"
      :title="
        loading
          ? `正在加载 ${selectedApplication.name} 的菜单草稿`
          : defaultRouteValid
            ? `当前应用：${selectedApplication.name}，已发布版本：${selectedApplication.published_release || 0}`
            : `默认路由 ${selectedApplication.default_route} 不是启用叶子菜单，发布前请先修正应用配置或菜单草稿`
      "
    />
    <ElEmpty v-if="!applicationID" description="请先创建或选择应用" />
    <ElTree
      v-else
      v-loading="loading"
      :data="tree"
      node-key="id"
      default-expand-all
      :expand-on-click-node="false"
      :props="{ label: 'name', children: 'children' }"
    >
      <template #default="{ data }">
        <div class="min-w-0 flex flex-1 items-center justify-between gap-12px py-6px">
          <div class="min-w-0 flex-y-center gap-8px">
            <ElTag size="small" effect="plain">{{ data.type }}</ElTag>
            <span class="truncate font-medium">{{ data.name }}</span>
            <span class="truncate text-12px text-#999">{{ data.code }}</span>
            <span v-if="data.component" class="truncate text-12px text-#999">{{ data.component }}</span>
            <ElTag v-if="data.permission_code" size="small" type="warning" effect="plain">
              {{ normalizeMenuPermissionScope(data.permission_scope) === 'platform' ? '平台' : '租户' }} ·
              {{ data.permission_code }}
            </ElTag>
          </div>
          <div class="flex-y-center gap-6px" @click.stop>
            <ElButton v-if="canUpdateMenus" link type="primary" @click="openCreate(String(data.id))">新增子项</ElButton>
            <ElButton v-if="canUpdateMenus" link type="primary" @click="openEdit(data)">编辑</ElButton>
            <ElPopconfirm v-if="canDeleteMenus" title="只能删除没有子项的菜单，确认继续？" @confirm="removeMenu(data)">
              <template #reference><ElButton link type="danger">删除</ElButton></template>
            </ElPopconfirm>
          </div>
        </div>
      </template>
    </ElTree>
  </ElCard>

  <ElDrawer v-model="editorVisible" :title="form.id ? '编辑菜单' : '新增菜单'" size="600px" destroy-on-close>
    <ElAlert
      v-if="!selectedTenantID"
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="请先选择租户，系统需要使用租户会话安全查询权限目录。"
    />
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="父菜单" prop="parent_id">
        <ElSelect v-model="form.parent_id" class="w-full" clearable placeholder="根菜单">
          <ElOption label="根菜单" value="" />
          <ElOption
            v-for="item in menus"
            :key="String(item.id)"
            :label="`${item.name} (${item.code})`"
            :value="String(item.id)"
            :disabled="forbiddenParentIDs.has(String(item.id))"
          />
        </ElSelect>
      </ElFormItem>
      <div class="grid grid-cols-2 gap-x-12px">
        <ElFormItem label="菜单编码" prop="code"><ElInput v-model="form.code" /></ElFormItem>
        <ElFormItem label="菜单名称" prop="name"><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="类型" prop="type">
          <ElSelect v-model="form.type" class="w-full">
            <ElOption label="目录" value="directory" />
            <ElOption label="页面" value="page" />
            <ElOption label="操作权限" value="action" />
            <ElOption label="外部链接" value="external" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序"><ElInputNumber v-model="form.sort_order" :min="0" class="w-full" /></ElFormItem>
        <ElFormItem v-if="form.type === 'page'" label="路由" prop="route"><ElInput v-model="form.route" /></ElFormItem>
        <ElFormItem v-if="form.type === 'page'" label="页面键" prop="component">
          <ElSelect v-model="form.component" class="w-full" filterable>
            <ElOption
              v-for="option in applicationPageOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="form.type === 'external'" label="外部 URL" prop="external_url" class="col-span-2">
          <ElInput v-model="form.external_url" />
        </ElFormItem>
        <ElFormItem label="权限码">
          <ElSelect
            v-model="form.permission_code"
            class="w-full"
            clearable
            filterable
            remote
            reserve-keyword
            :disabled="!selectedTenantID"
            :loading="permissionLoading"
            :remote-method="loadPermissionOptions"
            placeholder="搜索并选择权限码（可留空）"
            @visible-change="visible => visible && loadPermissionOptions()"
          >
            <ElOption
              v-for="option in permissionOptions"
              :key="option.code"
              :label="option.label"
              :value="option.code"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="权限作用域">
          <ElSelect v-model="form.permission_scope" class="w-full" @change="changePermissionScope">
            <ElOption label="租户权限" value="tenant" />
            <ElOption label="平台权限" value="platform" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Iconify 图标"><ElInput v-model="form.icon" /></ElFormItem>
        <ElFormItem label="i18n Key"><ElInput v-model="form.i18n_key" /></ElFormItem>
        <ElFormItem label="菜单可见"><ElSwitch v-model="form.visible" /></ElFormItem>
      </div>
    </ElForm>
    <template #footer>
      <ElButton @click="editorVisible = false">取消</ElButton>
      <ElButton v-if="canUpdateMenus" type="primary" :loading="saving" @click="saveMenu">保存</ElButton>
    </template>
  </ElDrawer>

  <ElDialog v-model="publishVisible" title="发布菜单" width="520px">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="发布后会生成不可变菜单版本，并立即供应用导航使用。"
    />
    <ElInput v-model="publishComment" type="textarea" :rows="4" placeholder="请输入发布说明" />
    <template #footer>
      <ElButton @click="publishVisible = false">取消</ElButton>
      <ElButton v-if="canPublishMenus" type="primary" :loading="publishing" @click="publish">确认发布</ElButton>
    </template>
  </ElDialog>
</template>
