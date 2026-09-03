<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCopyText } from '@/components/business';
import { confirmUserAction } from '@/platform/user-action';
import type { ServiceAccount, ServiceAccountForm } from '../../api';
import {
  createServiceAccount,
  getServiceAccount,
  listServiceAccounts,
  rotateServiceAccountSecret,
  updateServiceAccountStatus
} from '../../api';

defineOptions({ name: 'PlatformAdminServiceAccounts' });

const loading = ref(false);
const submitting = ref(false);
const rows = ref<ServiceAccount[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const status = ref('');
const createVisible = ref(false);
const credentialVisible = ref(false);
const createdClientID = ref('');
const createdSecret = ref('');
const credentialTitle = ref('请立即保存客户端凭据');
const rotatingID = ref('');
const formRef = ref<FormInstance>();
const form = reactive<ServiceAccountForm>({ name: '', audiences: [] });
const rules: FormRules<ServiceAccountForm> = {
  name: [{ required: true, message: '请输入服务账号名称', trigger: 'blur' }],
  audiences: [{ required: true, type: 'array', min: 1, message: '至少配置一个 JWT audience', trigger: 'change' }]
};
const platformStore = usePlatformStore();
const canCreateAccount = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'identity.service-account.create' })
);
const canReadAccount = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'identity.service-account.read' })
);
const canUpdateAccount = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'identity.service-account.update-status' })
);
const canRotateSecret = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'identity.service-account.rotate-secret' })
);

async function loadData() {
  loading.value = true;
  try {
    const result = await listServiceAccounts({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      status: status.value
    });
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}

function resetSearch() {
  keyword.value = '';
  status.value = '';
  search();
}

function openCreate() {
  if (!canCreateAccount.value) return;
  Object.assign(form, { name: '', audiences: [] });
  formRef.value?.clearValidate();
  createVisible.value = true;
}

async function submit() {
  if (!canCreateAccount.value || !(await formRef.value?.validate())) return;
  submitting.value = true;
  try {
    const result = await createServiceAccount(form);
    createdClientID.value = String(result.account?.client_id || '');
    createdSecret.value = String(result.client_secret || '');
    credentialTitle.value = '请立即保存客户端凭据';
    createVisible.value = false;
    credentialVisible.value = true;
    await loadData();
  } finally {
    submitting.value = false;
  }
}

async function rotateSecret(row: ServiceAccount) {
  if (!canRotateSecret.value || !canReadAccount.value || rotatingID.value) return;
  const confirmed = await confirmUserAction(() =>
    window.$messageBox!.confirm(`轮换后 ${row.name} 的旧 Client Secret 会立即失效，确认继续？`, '轮换客户端密钥', {
      type: 'warning',
      confirmButtonText: '确认轮换',
      cancelButtonText: '取消'
    })
  );
  if (!confirmed) return;

  rotatingID.value = row.id;
  try {
    const current = await getServiceAccount(row.id);
    const result = await rotateServiceAccountSecret(current.id, current.version);
    createdClientID.value = current.client_id;
    createdSecret.value = result.client_secret || '';
    credentialTitle.value = '请立即保存轮换后的客户端密钥';
    credentialVisible.value = true;
    await loadData();
  } finally {
    rotatingID.value = '';
  }
}

async function changeStatus(row: ServiceAccount) {
  if (!canUpdateAccount.value || !canReadAccount.value) return;
  const nextStatus = row.status === 'active' ? 'disabled' : 'active';
  const current = await getServiceAccount(row.id);
  if (current.status !== row.status) {
    window.$message?.warning('服务账号状态已变化，请确认最新状态后重试');
    await loadData();
    return;
  }
  await updateServiceAccountStatus(current.id, nextStatus, current.version);
  window.$message?.success(nextStatus === 'active' ? '服务账号已启用' : '服务账号已停用');
  await loadData();
}

function closeCredential() {
  createdClientID.value = '';
  createdSecret.value = '';
  credentialVisible.value = false;
}

function changePage(value: number) {
  page.value = value;
  loadData();
}

function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  loadData();
}

onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">服务账号</h2>
          <p class="mb-0 mt-6px text-13px text-#999">管理机器身份及其 JWT audience，客户端密钥只在创建时展示一次。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton v-if="canCreateAccount" type="primary" @click="openCreate">创建服务账号</ElButton>
        </div>
      </div>
    </template>

    <ElForm inline class="mb-16px" @submit.prevent="search">
      <ElFormItem label="关键词">
        <ElInput v-model="keyword" clearable placeholder="名称或 Client ID" @keyup.enter="search" />
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="status" clearable class="w-140px" placeholder="全部">
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="disabled" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="search">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </ElFormItem>
    </ElForm>

    <ElTable v-loading="loading" :data="rows" border stripe>
      <ElTableColumn prop="name" label="名称" min-width="170" />
      <ElTableColumn label="Client ID" min-width="330">
        <template #default="{ row }"><BizCopyText :value="row.client_id" /></template>
      </ElTableColumn>
      <ElTableColumn label="Audience" min-width="260">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-6px">
            <ElTag v-for="audience in row.audiences" :key="audience" effect="plain">{{ audience }}</ElTag>
            <span v-if="!row.audiences.length">-</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="110">
        <template #default="{ row }">
          <ElTag :type="row.status === 'active' ? 'success' : 'danger'" effect="plain">{{ row.status }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="version" label="版本" width="90" />
      <ElTableColumn label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <ElPopconfirm
            v-if="canUpdateAccount && canReadAccount"
            :title="row.status === 'active' ? '确认停用该服务账号？' : '确认启用该服务账号？'"
            @confirm="changeStatus(row)"
          >
            <template #reference>
              <ElButton link :type="row.status === 'active' ? 'danger' : 'primary'">
                {{ row.status === 'active' ? '停用' : '启用' }}
              </ElButton>
            </template>
          </ElPopconfirm>
          <ElButton
            v-if="canRotateSecret && canReadAccount"
            class="ml-8px"
            link
            type="warning"
            :loading="rotatingID === row.id"
            :disabled="Boolean(rotatingID)"
            @click="rotateSecret(row)"
          >
            轮换密钥
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <div class="mt-16px flex justify-end">
      <ElPagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @update:current-page="changePage"
        @update:page-size="changePageSize"
      />
    </div>
  </ElCard>

  <ElDialog v-model="createVisible" title="创建服务账号" width="560px">
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="名称" prop="name"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="JWT Audience" prop="audiences">
        <ElSelect
          v-model="form.audiences"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入服务 audience 后回车，可添加多个"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="createVisible = false">取消</ElButton>
      <ElButton v-if="canCreateAccount" type="primary" :loading="submitting" @click="submit">创建</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    :model-value="credentialVisible"
    :title="credentialTitle"
    width="680px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="Client Secret 关闭后无法再次查看，请立即保存到 Secret 管理系统，禁止写入代码或配置仓库。"
    />
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem label="Client ID"><BizCopyText :value="createdClientID" /></ElDescriptionsItem>
      <ElDescriptionsItem label="Client Secret"><BizCopyText :value="createdSecret" /></ElDescriptionsItem>
    </ElDescriptions>
    <template #footer><ElButton type="primary" @click="closeCredential">我已保存并关闭</ElButton></template>
  </ElDialog>
</template>
