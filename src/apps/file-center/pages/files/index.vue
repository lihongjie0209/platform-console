<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { UploadFile, UploadUserFile } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import { BizCopyText } from '@/components/business';
import type { FileMetadata } from '../../api';
import {
  abortMultipartUpload,
  authorizeDownload,
  authorizeUploadPart,
  completeMultipartUpload,
  completeUpload,
  deleteFile,
  initiateMultipartUpload,
  initiateUpload,
  listFiles,
  putAuthorizedFile,
  putAuthorizedPart
} from '../../api';
import { formatFileSize, sha256Hex } from '../../checksum';
import { multipartBuckets, multipartRanges } from '../../multipart-upload';

defineOptions({ name: 'FileCenterFiles' });

const maxDirectUploadBytes = 100 * 1024 * 1024;
const multipartPartSize = 16 * 1024 * 1024;
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const loading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const rows = ref<FileMetadata[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const detail = ref<FileMetadata>();
const detailVisible = ref(false);
const uploadVisible = ref(false);
const uploadFiles = ref<UploadUserFile[]>([]);
const selectedFile = ref<File>();
const filter = reactive({ keyword: '', status: '', scanStatus: '', contentType: '', ownerID: '' });

async function loadData() {
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await listFiles({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      keyword: filter.keyword,
      status: filter.status,
      scanStatus: filter.scanStatus,
      contentType: filter.contentType,
      ownerID: filter.ownerID,
      page: page.value,
      pageSize: pageSize.value
    });
    rows.value = result.files || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}

function resetSearch() {
  Object.assign(filter, { keyword: '', status: '', scanStatus: '', contentType: '', ownerID: '' });
  search();
}

function openUpload() {
  uploadFiles.value = [];
  selectedFile.value = undefined;
  uploadVisible.value = true;
}

function selectUploadFile(file: UploadFile) {
  const source = file.raw;
  if (!source) return;
  selectedFile.value = source;
}

async function uploadDirect(source: File, checksum: string) {
  const authorization = await initiateUpload({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    filename: source.name,
    contentType: source.type || 'application/octet-stream',
    size: source.size,
    checksumSHA256: checksum,
    idempotencyKey: crypto.randomUUID()
  });
  await putAuthorizedFile(authorization, source);
  await completeUpload(authorization.file, checksum);
  uploadProgress.value = 100;
}

async function uploadMultipart(source: File, checksum: string) {
  const session = await initiateMultipartUpload({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    filename: source.name,
    contentType: source.type || 'application/octet-stream',
    size: source.size,
    checksumSHA256: checksum,
    idempotencyKey: crypto.randomUUID(),
    partSize: multipartPartSize
  });
  const ranges = multipartRanges(source.size, session.part_size);
  const completed: Array<{ part_number: number; etag: string }> = [];
  try {
    const uploadRange = async (range: (typeof ranges)[number]) => {
      const authorization = await authorizeUploadPart(session.file, range.partNumber);
      const etag = await putAuthorizedPart(authorization, source.slice(range.start, range.end));
      completed.push({ part_number: range.partNumber, etag });
      uploadProgress.value = Math.round((completed.length / ranges.length) * 100);
    };
    const buckets = multipartBuckets(ranges, 3);
    await Promise.all(
      buckets.map(bucket => bucket.reduce((chain, range) => chain.then(() => uploadRange(range)), Promise.resolve()))
    );
    completed.sort((left, right) => left.part_number - right.part_number);
    await completeMultipartUpload(session.file, checksum, completed);
  } catch (error) {
    await abortMultipartUpload(session.file).catch(() => undefined);
    throw error;
  }
}

async function upload() {
  const source = selectedFile.value;
  if (!scopeReady.value || !source) return;
  uploading.value = true;
  uploadProgress.value = 0;
  try {
    const checksum = await sha256Hex(source);
    if (source.size <= maxDirectUploadBytes) await uploadDirect(source, checksum);
    else await uploadMultipart(source, checksum);
    uploadVisible.value = false;
    window.$message?.success('文件上传完成');
    await loadData();
  } finally {
    uploading.value = false;
  }
}

async function download(row: FileMetadata) {
  if (!scopeReady.value) return;
  const authorization = await authorizeDownload(row);
  const anchor = document.createElement('a');
  anchor.href = authorization.url;
  anchor.rel = 'noopener';
  anchor.download = row.filename;
  anchor.click();
}

async function remove(row: FileMetadata) {
  if (!scopeReady.value) return;
  await ElMessageBox.confirm(`确认删除文件“${row.filename}”吗？对象存储中的内容也会被删除。`, '删除文件', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  });
  await deleteFile(row);
  window.$message?.success('文件已删除');
  await loadData();
}

function showDetail(row: FileMetadata) {
  detail.value = row;
  detailVisible.value = true;
}

watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  detail.value = undefined;
  detailVisible.value = false;
  uploadVisible.value = false;
  uploadFiles.value = [];
  selectedFile.value = undefined;
  uploadProgress.value = 0;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">文件管理</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            管理 {{ applicationName }} 的文件元数据、上传、下载授权和生命周期。
          </p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton type="primary" :disabled="!scopeReady" @click="openUpload">上传文件</ElButton>
        </div>
      </div>
    </template>

    <ElAlert v-if="!scopeReady" title="请先在应用选择页选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline class="mb-16px" @submit.prevent="search">
        <ElFormItem label="关键词">
          <ElInput v-model="filter.keyword" clearable placeholder="文件名或文件 ID" />
        </ElFormItem>
        <ElFormItem label="文件状态">
          <ElSelect v-model="filter.status" clearable class="w-150px">
            <ElOption
              v-for="item in ['pending_upload', 'ready', 'deleting', 'deleted', 'expired']"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="扫描状态">
          <ElSelect v-model="filter.scanStatus" clearable class="w-140px">
            <ElOption
              v-for="item in ['pending', 'clean', 'infected', 'skipped']"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Content-Type"><ElInput v-model="filter.contentType" clearable /></ElFormItem>
        <ElFormItem label="所有者"><ElInput v-model="filter.ownerID" clearable /></ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="search">查询</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="created_at" label="创建时间" min-width="190" />
        <ElTableColumn prop="filename" label="文件名" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="content_type" label="Content-Type" min-width="180" />
        <ElTableColumn label="大小" width="110">
          <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="130" />
        <ElTableColumn prop="scan_status" label="扫描" width="110" />
        <ElTableColumn prop="owner_id" label="所有者" min-width="180" />
        <ElTableColumn label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="showDetail(row)">详情</ElButton>
            <ElButton v-if="row.status === 'ready'" link type="primary" @click="download(row)">下载</ElButton>
            <ElButton v-if="!['deleted', 'expired'].includes(row.status)" link type="danger" @click="remove(row)">
              删除
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
          @update:current-page="
            value => {
              page = value;
              loadData();
            }
          "
          @update:page-size="
            value => {
              page = 1;
              pageSize = value;
              loadData();
            }
          "
        />
      </div>
    </template>
  </ElCard>

  <ElDialog v-model="uploadVisible" title="上传文件" width="620px" :close-on-click-modal="!uploading">
    <ElUpload v-model:file-list="uploadFiles" drag :auto-upload="false" :limit="1" @change="selectUploadFile">
      <div class="py-24px">将文件拖到此处，或点击选择</div>
      <template #tip>
        <div class="text-12px text-#999">
          不超过 100 MB 使用直传，更大的文件自动使用 16 MiB 分片；上传前会计算 SHA-256。
        </div>
      </template>
    </ElUpload>
    <ElProgress v-if="uploading" class="mt-16px" :percentage="uploadProgress" />
    <template #footer>
      <ElButton :disabled="uploading" @click="uploadVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="uploading" :disabled="!selectedFile" @click="upload">上传</ElButton>
    </template>
  </ElDialog>

  <ElDrawer v-model="detailVisible" title="文件详情" size="680px">
    <ElDescriptions v-if="detail" :column="1" border>
      <ElDescriptionsItem label="文件 ID"><BizCopyText :value="detail.id" /></ElDescriptionsItem>
      <ElDescriptionsItem label="文件名">{{ detail.filename }}</ElDescriptionsItem>
      <ElDescriptionsItem label="对象键"><BizCopyText :value="String(detail.object_key || '')" /></ElDescriptionsItem>
      <ElDescriptionsItem label="Bucket">{{ detail.bucket }}</ElDescriptionsItem>
      <ElDescriptionsItem label="Content-Type">{{ detail.content_type }}</ElDescriptionsItem>
      <ElDescriptionsItem label="大小">{{ formatFileSize(detail.size) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="SHA-256">
        <BizCopyText :value="String(detail.checksum_sha256 || '')" />
      </ElDescriptionsItem>
      <ElDescriptionsItem label="状态">{{ detail.status }} / {{ detail.scan_status }}</ElDescriptionsItem>
      <ElDescriptionsItem label="上传模式">{{ detail.upload_mode }}</ElDescriptionsItem>
      <ElDescriptionsItem label="审计">{{ detail.created_by }} / {{ detail.updated_by }}</ElDescriptionsItem>
      <ElDescriptionsItem label="更新时间">{{ detail.updated_at }}</ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>
