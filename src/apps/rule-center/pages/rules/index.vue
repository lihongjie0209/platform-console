<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { parseJSONObject } from '@/platform/json';
import type { RuleSet, RuleVersion } from '../../api';
import {
  createRuleVersion,
  evaluateRule,
  listRuleSets,
  listRuleVersions,
  publishRuleVersion,
  saveRuleSet,
  validateRule
} from '../../api';
defineOptions({ name: 'RuleCenterRules' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<RuleSet[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const keyword = ref('');
const visible = ref(false);
const editing = ref<RuleSet>();
const versionVisible = ref(false);
const selected = ref<RuleSet>();
const versions = ref<RuleVersion[]>([]);
const versionTotal = ref(0);
const versionPage = ref(1);
const versionPageSize = ref(20);
const definition = ref('{\n  "rules": []\n}');
const facts = ref('{}');
const evaluation = ref('');
const form = reactive({ code: '', name: '', description: '', status: 'draft' });
const loadGuard = createLatestRequestGuard();
const versionGuard = createLatestRequestGuard();
const canCreate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'rule.set.create' }));
const canUpdate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'rule.set.update' }));
const canListVersions = computed(() => store.hasPermission({ scope: 'tenant', codes: 'rule.version.list' }));
const canCreateVersion = computed(() =>
  store.hasPermission({
    scope: 'tenant',
    codes: ['rule.version.create', 'rule.version.validate'],
    strategy: 'all'
  })
);
const canPublish = computed(() => store.hasPermission({ scope: 'tenant', codes: 'rule.version.publish' }));
const canEvaluate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'rule.evaluation.execute' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  const v = await listRuleSets({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    keyword: keyword.value,
    page: page.value,
    pageSize: pageSize.value
  });
  if (loadGuard.isCurrent(request)) {
    rows.value = v.items || [];
    total.value = v.total || 0;
  }
}
function search() {
  page.value = 1;
  load();
}
function open(v?: RuleSet) {
  if ((v && !canUpdate.value) || (!v && !canCreate.value)) return;
  editing.value = v;
  Object.assign(form, v || { code: '', name: '', description: '', status: 'draft' });
  visible.value = true;
}
async function save() {
  if ((editing.value && !canUpdate.value) || (!editing.value && !canCreate.value) || !scopeReady.value) return;
  await saveRuleSet(editing.value, { tenantID: tenantID.value, applicationID: applicationID.value }, form);
  visible.value = false;
  await load();
}
async function versionsFor(v: RuleSet) {
  if (!canListVersions.value) return;
  const request = versionGuard.begin();
  selected.value = v;
  const result = await listRuleVersions(v, versionPage.value, versionPageSize.value);
  if (versionGuard.isCurrent(request) && selected.value?.id === v.id) {
    versions.value = result.items || [];
    versionTotal.value = result.total || 0;
    versionVisible.value = true;
  }
}
function openVersions(v: RuleSet) {
  versionPage.value = 1;
  versionsFor(v);
}
function reloadVersions() {
  if (selected.value) versionsFor(selected.value);
}
function resizeVersions() {
  versionPage.value = 1;
  reloadVersions();
}
async function createVersion() {
  if (!canCreateVersion.value || !selected.value) return;
  const value = parseJSONObject(definition.value, '规则定义');
  const check = await validateRule(selected.value.tenant_id, selected.value.application_id, value);
  if (!check.valid) {
    window.$message?.error(check.issues.join('; ') || '规则无效');
    return;
  }
  await createRuleVersion(selected.value, value);
  await versionsFor(selected.value);
}
async function publish(v: RuleVersion) {
  if (!canPublish.value || !selected.value) return;
  const result = await publishRuleVersion(selected.value, v);
  selected.value = result.rule_set;
  await load();
  await versionsFor(result.rule_set);
}
async function evaluate(v: RuleSet) {
  if (!canEvaluate.value) return;
  const r = await evaluateRule(v, parseJSONObject(facts.value, '事实'));
  evaluation.value = JSON.stringify(r, null, 2);
}
watch([tenantID, applicationID], () => {
  versionGuard.invalidate();
  rows.value = [];
  total.value = 0;
  page.value = 1;
  visible.value = false;
  editing.value = undefined;
  versionVisible.value = false;
  selected.value = undefined;
  versions.value = [];
  versionTotal.value = 0;
  versionPage.value = 1;
  evaluation.value = '';
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">规则集</h2>
          <p class="mb-0 text-#999">规则版本不可变，校验后发布；执行事实和结果使用结构化 JSON。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="open()">新建规则集</ElButton>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先选择租户" type="warning" :closable="false" />
    <ElAlert
      v-else-if="!applicationID"
      title="请先从应用选择页进入一个应用"
      type="warning"
      show-icon
      :closable="false"
    />
    <template v-else>
      <ElAlert :title="`当前应用：${applicationName}`" type="info" show-icon :closable="false" class="mb-16px" />
      <ElForm inline>
        <ElFormItem label="搜索"><ElInput v-model="keyword" /></ElFormItem>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="search">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="code" label="编码" />
        <ElTableColumn prop="name" label="名称" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="published_version_number" label="发布版本" />
        <ElTableColumn label="操作" width="220">
          <template #default="{ row }">
            <ElButton v-if="canUpdate" link @click="open(row)">编辑</ElButton>
            <ElButton v-if="canListVersions" link @click="openVersions(row)">版本</ElButton>
            <ElButton v-if="canEvaluate && row.status === 'active'" link @click="evaluate(row)">试运行</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-16px flex justify-end">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="load"
          @size-change="search"
        />
      </div>
      <ElInput v-if="evaluation" v-model="evaluation" class="mt-16px" type="textarea" :rows="6" readonly />
    </template>
  </ElCard>
  <ElDialog v-model="visible" :title="editing ? '编辑规则集' : '新建规则集'">
    <ElForm label-width="90px">
      <ElFormItem label="编码"><ElInput v-model="form.code" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="说明"><ElInput v-model="form.description" /></ElFormItem>
      <ElFormItem v-if="editing" label="状态"><ElInput v-model="form.status" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="editing ? canUpdate : canCreate" type="primary" @click="save">保存</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="versionVisible" title="规则版本" size="760px">
    <ElInput v-model="definition" type="textarea" :rows="10" />
    <ElButton v-if="canCreateVersion" class="my-12px" type="primary" @click="createVersion">校验并创建版本</ElButton>
    <ElTable :data="versions" border>
      <ElTableColumn prop="version_number" label="版本" />
      <ElTableColumn prop="status" label="状态" />
      <ElTableColumn prop="checksum" label="校验和" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton v-if="canPublish && row.status === 'draft'" link @click="publish(row)">发布</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <div class="mt-16px flex justify-end">
      <ElPagination
        v-model:current-page="versionPage"
        v-model:page-size="versionPageSize"
        :total="versionTotal"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="reloadVersions"
        @size-change="resizeVersions"
      />
    </div>
    <ElDivider>试运行事实</ElDivider>
    <ElInput v-model="facts" type="textarea" :rows="5" />
  </ElDrawer>
</template>
