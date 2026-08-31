<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ServiceInstance, ServiceSummary } from '../../api';
import { listInstances, listServices } from '../../api';

defineOptions({ name: 'RegistryCenterServices' });
const loading = ref(false);
const prefix = ref('');
const services = ref<ServiceSummary[]>([]);
const revision = ref(0);
const selected = ref<ServiceSummary>();
const instances = ref<ServiceInstance[]>([]);
const instanceRevision = ref(0);
const visible = ref(false);
const includeDraining = ref(true);
const detail = ref<ServiceInstance>();
const detailVisible = ref(false);
async function loadServices() {
  loading.value = true;
  try {
    const result = await listServices(prefix.value);
    services.value = result.services || [];
    revision.value = result.revision || 0;
  } finally {
    loading.value = false;
  }
}
async function showInstances(row: ServiceSummary) {
  selected.value = row;
  const result = await listInstances(row.service_name, {}, includeDraining.value);
  instances.value = result.instances || [];
  instanceRevision.value = result.revision || 0;
  visible.value = true;
}
function showDetail(row: ServiceInstance) {
  detail.value = row;
  detailVisible.value = true;
}
onMounted(loadServices);
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
        <ElButton type="primary" @click="loadServices">查询</ElButton>
        <ElButton @click="loadServices">刷新</ElButton>
      </ElFormItem>
    </ElForm>
    <ElTable v-loading="loading" :data="services" border stripe>
      <ElTableColumn prop="service_name" label="服务名" min-width="260" />
      <ElTableColumn prop="healthy_instances" label="健康实例" width="130" />
      <ElTableColumn prop="draining_instances" label="Draining" width="130" />
      <ElTableColumn label="操作" width="100">
        <template #default="{ row }">
          <ElButton link type="primary" @click="showInstances(row)">实例</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>
  <ElDrawer
    v-model="visible"
    :title="`${selected?.service_name || ''} · 实例（Revision ${instanceRevision}）`"
    size="900px"
  >
    <div class="mb-12px flex-y-center justify-between">
      <ElCheckbox v-model="includeDraining" @change="selected && showInstances(selected)">包含 Draining</ElCheckbox>
      <ElButton @click="selected && showInstances(selected)">刷新</ElButton>
    </div>
    <ElTable :data="instances" border>
      <ElTableColumn prop="instance_id" label="实例 ID" min-width="220" show-overflow-tooltip />
      <ElTableColumn prop="endpoint" label="Endpoint" min-width="190" />
      <ElTableColumn prop="protocol" label="协议" width="90" />
      <ElTableColumn prop="status" label="状态" width="120" />
      <ElTableColumn prop="weight" label="权重" width="80" />
      <ElTableColumn prop="version" label="版本" width="120" />
      <ElTableColumn prop="lease_expires_at" label="租约到期" min-width="190" />
      <ElTableColumn label="操作" width="80">
        <template #default="{ row }"><ElButton link type="primary" @click="showDetail(row)">详情</ElButton></template>
      </ElTableColumn>
    </ElTable>
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
