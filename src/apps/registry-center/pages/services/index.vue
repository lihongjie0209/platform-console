<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { ServiceInstance, ServiceSummary } from '../../api';
import { listInstances, listServices } from '../../api';

defineOptions({ name: 'RegistryCenterServices' });
const platformStore = usePlatformStore();
const canListInstances = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'service_registry.instance.list' })
);
const loading = ref(false);
const prefix = ref('');
const services = ref<ServiceSummary[]>([]);
const servicePage = ref(1);
const servicePageSize = ref(20);
const serviceTotal = ref(0);
const revision = ref(0);
const selected = ref<ServiceSummary>();
const instances = ref<ServiceInstance[]>([]);
const instancePage = ref(1);
const instancePageSize = ref(20);
const instanceTotal = ref(0);
const instanceRevision = ref(0);
const visible = ref(false);
const includeDraining = ref(true);
const detail = ref<ServiceInstance>();
const detailVisible = ref(false);
const serviceGuard = createLatestRequestGuard();
const instanceGuard = createLatestRequestGuard();
async function loadServices() {
  const request = serviceGuard.begin();
  loading.value = true;
  try {
    const result = await listServices(prefix.value.trim(), servicePage.value, servicePageSize.value);
    if (!serviceGuard.isCurrent(request)) return;
    services.value = result.services || [];
    serviceTotal.value = result.total || 0;
    revision.value = result.revision || 0;
  } finally {
    if (serviceGuard.isCurrent(request)) loading.value = false;
  }
}
async function showInstances(row: ServiceSummary, resetPage = false) {
  if (!canListInstances.value) return;
  if (resetPage || selected.value?.service_name !== row.service_name) instancePage.value = 1;
  const request = instanceGuard.begin();
  selected.value = row;
  const result = await listInstances({
    serviceName: row.service_name,
    metadata: {},
    includeDraining: includeDraining.value,
    page: instancePage.value,
    pageSize: instancePageSize.value
  });
  if (!instanceGuard.isCurrent(request) || selected.value?.service_name !== row.service_name) return;
  instances.value = result.instances || [];
  instanceTotal.value = result.total || 0;
  instanceRevision.value = result.revision || 0;
  visible.value = true;
}
function showDetail(row: ServiceInstance) {
  detail.value = row;
  detailVisible.value = true;
}
onMounted(loadServices);

function searchServices() {
  servicePage.value = 1;
  loadServices();
}

function changeServicePageSize() {
  servicePage.value = 1;
  loadServices();
}

function changeInstancePageSize() {
  instancePage.value = 1;
  if (selected.value) showInstances(selected.value);
}
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">服务目录</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            查看应用层服务租约、健康实例和 draining 状态；Kubernetes Service/DNS 仍负责基础寻址。
          </p>
        </div>
        <ElTag>Revision {{ revision }}</ElTag>
      </div>
    </template>
    <ElForm inline class="mb-16px">
      <ElFormItem label="服务前缀"><ElInput v-model="prefix" clearable /></ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="searchServices">查询</ElButton>
        <ElButton @click="loadServices">刷新</ElButton>
      </ElFormItem>
    </ElForm>
    <ElTable v-loading="loading" :data="services" border stripe>
      <ElTableColumn prop="service_name" label="服务名" min-width="260" />
      <ElTableColumn prop="healthy_instances" label="健康实例" width="130" />
      <ElTableColumn prop="draining_instances" label="Draining" width="130" />
      <ElTableColumn label="操作" width="100">
        <template #default="{ row }">
          <ElButton v-if="canListInstances" link type="primary" @click="showInstances(row, true)">实例</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      v-model:current-page="servicePage"
      v-model:page-size="servicePageSize"
      class="mt-16px justify-end"
      layout="total, sizes, prev, pager, next"
      :total="serviceTotal"
      :page-sizes="[20, 50, 100]"
      @current-change="loadServices"
      @size-change="changeServicePageSize"
    />
  </ElCard>
  <ElDrawer
    v-model="visible"
    :title="`${selected?.service_name || ''} · 实例（Revision ${instanceRevision}）`"
    size="900px"
  >
    <div class="mb-12px flex-y-center justify-between">
      <ElCheckbox v-model="includeDraining" @change="selected && showInstances(selected)">包含 Draining</ElCheckbox>
      <ElButton v-if="canListInstances" @click="selected && showInstances(selected)">刷新</ElButton>
    </div>
    <ElTable :data="instances" border>
      <ElTableColumn prop="instance_id" label="实例 ID" min-width="220" show-overflow-tooltip />
      <ElTableColumn prop="endpoint" label="Endpoint" min-width="190" />
      <ElTableColumn prop="protocol" label="协议" width="90" />
      <ElTableColumn prop="status" label="状态" width="120" />
      <ElTableColumn prop="weight" label="权重" width="80" />
      <ElTableColumn prop="version" label="版本" width="120" />
      <ElTableColumn
        prop="lease_expires_at"
        label="租约到期"
        min-width="190"
        :formatter="formatPlatformTableDateTime"
      />
      <ElTableColumn label="操作" width="80">
        <template #default="{ row }"><ElButton link type="primary" @click="showDetail(row)">详情</ElButton></template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      v-model:current-page="instancePage"
      v-model:page-size="instancePageSize"
      class="mt-16px justify-end"
      layout="total, sizes, prev, pager, next"
      :total="instanceTotal"
      :page-sizes="[20, 50, 100]"
      @current-change="selected && showInstances(selected)"
      @size-change="changeInstancePageSize"
    />
  </ElDrawer>
  <ElDrawer v-model="detailVisible" title="实例详情" size="650px">
    <ElDescriptions v-if="detail" :column="1" border>
      <ElDescriptionsItem label="实例 ID">{{ detail.instance_id }}</ElDescriptionsItem>
      <ElDescriptionsItem label="服务">{{ detail.service_name }}</ElDescriptionsItem>
      <ElDescriptionsItem label="Endpoint">{{ detail.endpoint }}</ElDescriptionsItem>
      <ElDescriptionsItem label="状态">{{ detail.status }}</ElDescriptionsItem>
      <ElDescriptionsItem label="元数据">
        <pre class="overflow-auto whitespace-pre-wrap">{{ JSON.stringify(detail.metadata, null, 2) }}</pre>
      </ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>
