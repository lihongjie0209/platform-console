<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { remoteSearchPage } from '@/platform/remote-search';
import type { SwaggerService } from '../../api';
import { getSwaggerSpec, listSwaggerServices } from '../../api';
import { renderSwaggerUI } from '../../swagger-ui';

defineOptions({ name: 'SwaggerCenterDocuments' });
const platformStore = usePlatformStore();
const canRead = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'swagger.document.read' }));

const loading = ref(false);
const rendering = ref(false);
const services = ref<SwaggerService[]>([]);
const selectedName = ref('');
const swaggerRoot = ref<HTMLElement>();
let renderRevision = 0;
let swaggerUI: { destroy?: () => void } | undefined;
const serviceGuard = createLatestRequestGuard();

async function loadServices(keyword = '', selectDefault = false) {
  const request = serviceGuard.begin();
  loading.value = true;
  try {
    const response = await listSwaggerServices({ keyword: keyword.trim(), ...remoteSearchPage(50) });
    if (!serviceGuard.isCurrent(request)) return;
    const selected = services.value.find(item => item.name === selectedName.value);
    services.value = selected
      ? Array.from(new Map([selected, ...(response.items || [])].map(item => [item.name, item])).values())
      : response.items || [];
    if (selectDefault && !services.value.some(item => item.name === selectedName.value)) {
      selectedName.value = services.value[0]?.name || '';
    }
    if (selectDefault && canRead.value && selectedName.value) await loadSpec();
  } finally {
    if (serviceGuard.isCurrent(request)) loading.value = false;
  }
}

function reloadServices() {
  loadServices('', true);
}

async function loadSpec() {
  renderRevision += 1;
  const revision = renderRevision;
  if (!canRead.value || !selectedName.value) return;
  rendering.value = true;
  try {
    const response = await getSwaggerSpec(selectedName.value);
    await nextTick();
    if (revision !== renderRevision || !swaggerRoot.value) return;
    swaggerUI?.destroy?.();
    swaggerRoot.value.replaceChildren();
    swaggerUI = await renderSwaggerUI(swaggerRoot.value, response.document);
  } finally {
    if (revision === renderRevision) rendering.value = false;
  }
}

onMounted(reloadServices);
onBeforeUnmount(() => {
  serviceGuard.invalidate();
  renderRevision += 1;
  swaggerUI?.destroy?.();
});
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">API 文档中心</h2>
          <p class="mb-0 mt-6px text-13px text-#999">自动发现平台服务，在统一登录态下查看 OpenAPI 文档并调试接口。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSelect
            v-model="selectedName"
            filterable
            remote
            reserve-keyword
            class="w-280px"
            placeholder="选择服务"
            :disabled="!canRead"
            :remote-method="loadServices"
            :loading="loading"
            @change="loadSpec"
          >
            <ElOption v-for="service in services" :key="service.name" :label="service.title" :value="service.name">
              <div class="flex-y-center justify-between gap-12px">
                <span>{{ service.title }}</span>
                <ElTag size="small" :type="service.available ? 'success' : 'info'">{{ service.origin }}</ElTag>
              </div>
            </ElOption>
          </ElSelect>
          <ElButton :loading="loading" @click="reloadServices">刷新目录</ElButton>
        </div>
      </div>
    </template>
    <ElEmpty v-if="!loading && !services.length" description="尚未发现 OpenAPI 服务" />
    <ElAlert v-if="!canRead" title="当前账号无权读取 API 文档内容" type="warning" show-icon :closable="false" />
    <div v-else v-loading="loading || rendering" class="min-h-600px">
      <div ref="swaggerRoot" class="swagger-ui-host" />
    </div>
  </ElCard>
</template>

<style scoped>
.swagger-ui-host {
  min-height: 600px;
}

.swagger-ui-host :deep(.swagger-ui .topbar) {
  display: none;
}
</style>
