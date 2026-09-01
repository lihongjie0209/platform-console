<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import type { SearchFacet, SearchHit } from '../../api';
import { searchDocuments, suggestDocuments } from '../../api';
defineOptions({ name: 'SearchCenterSearch' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const query = ref('');
const documentTypes = ref<string[]>([]);
const sort = ref('relevance');
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const items = ref<SearchHit[]>([]);
const facets = ref<SearchFacet[]>([]);
const total = ref(0);
const took = ref(0);
const suggestions = ref<Array<{ value: string }>>([]);
let searchVersion = 0;
let suggestVersion = 0;
async function search() {
  searchVersion += 1;
  const version = searchVersion;
  if (!scopeReady.value) return;
  loading.value = true;
  try {
    const result = await searchDocuments({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      query: query.value,
      documentTypes: documentTypes.value,
      sort: sort.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (version !== searchVersion) return;
    items.value = result.items || [];
    facets.value = result.facets || [];
    total.value = result.total || 0;
    took.value = result.took_milliseconds || 0;
  } finally {
    if (version === searchVersion) loading.value = false;
  }
}
async function suggest(value: string) {
  suggestVersion += 1;
  const version = suggestVersion;
  if (!scopeReady.value || !value.trim()) {
    return [];
  }
  const result = await suggestDocuments(tenantID.value, applicationID.value, value);
  if (version !== suggestVersion) return [];
  suggestions.value = (result.items || []).map(item => ({ value: item.text }));
  return suggestions.value;
}
function open(hit: SearchHit) {
  const url = hit.document?.url;
  if (url) window.open(url, '_blank', 'noopener');
}
watch([tenantID, applicationID], () => {
  searchVersion += 1;
  suggestVersion += 1;
  items.value = [];
  facets.value = [];
  suggestions.value = [];
  total.value = 0;
  took.value = 0;
  loading.value = false;
  page.value = 1;
});
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div>
        <h2 class="m-0 text-18px font-semibold">应用内搜索</h2>
        <p class="mb-0 mt-6px text-13px text-#999">
          搜索 {{ applicationName }} 内当前用户可见的跨域投影；结果是最终一致的导航索引，不作为业务事实来源。
        </p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <div class="mb-20px flex gap-10px">
        <ElAutocomplete
          v-model="query"
          class="flex-1"
          :fetch-suggestions="suggest"
          placeholder="搜索标题、摘要和内容"
          @keyup.enter="search"
          @select="search"
        />
        <ElSelect v-model="sort" class="w-180px">
          <ElOption label="相关度" value="relevance" />
          <ElOption label="最近更新" value="updated_at_desc" />
          <ElOption label="最早更新" value="updated_at_asc" />
        </ElSelect>
        <ElButton type="primary" :loading="loading" @click="search">搜索</ElButton>
      </div>
      <div v-if="total" class="mb-14px text-13px text-#999">共 {{ total }} 条，耗时 {{ took }} ms</div>
      <div class="grid gap-12px lg:grid-cols-[1fr_240px]">
        <div>
          <ElCard
            v-for="hit in items"
            :key="hit.document?.id"
            class="mb-12px cursor-pointer"
            shadow="hover"
            @click="open(hit)"
          >
            <h3 class="m-0 text-16px text-primary">{{ hit.document?.title }}</h3>
            <p class="my-8px text-13px text-#666">{{ hit.document?.summary }}</p>
            <div class="text-12px text-#999">
              {{ hit.document?.document_type }} · {{ hit.document?.source_service }} · score {{ hit.score?.toFixed(2) }}
            </div>
            <div v-for="highlight in hit.highlights" :key="highlight.field" class="mt-6px text-12px">
              {{ highlight.fragments?.join(' … ') }}
            </div>
          </ElCard>
          <ElEmpty v-if="!loading && !items.length" description="暂无搜索结果" />
        </div>
        <ElCard shadow="never">
          <h3 class="mt-0 text-14px">聚合</h3>
          <div v-for="facet in facets" :key="facet.field" class="mb-16px">
            <div class="mb-6px font-medium">{{ facet.field }}</div>
            <div v-for="bucket in facet.buckets" :key="bucket.value" class="flex justify-between text-12px">
              <span>{{ bucket.value }}</span>
              <span>{{ bucket.count }}</span>
            </div>
          </div>
        </ElCard>
      </div>
      <div class="mt-16px flex justify-end">
        <ElPagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @update:current-page="
            value => {
              page = value;
              search();
            }
          "
        />
      </div>
    </template>
  </ElCard>
</template>
