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
const status = ref('');
const keyword = ref('');
const visible = ref(false);
const editing = ref<RuleSet>();
const versionVisible = ref(false);
const selected = ref<RuleSet>();
const versions = ref<RuleVersion[]>([]);
const definition = ref('{\n  "rules": []\n}');
const facts = ref('{}');
const evaluation = ref('');
const form = reactive({ code: '', name: '', description: '', status: 'draft' });
const loadGuard = createLatestRequestGuard();
const versionGuard = createLatestRequestGuard();
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    return;
  }
  const v = await listRuleSets({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    keyword: keyword.value,
    page: 1,
    pageSize: 100
  });
  if (loadGuard.isCurrent(request)) rows.value = v.items || [];
}
function open(v?: RuleSet) {
  editing.value = v;
  Object.assign(form, v || { code: '', name: '', description: '', status: 'draft' });
  visible.value = true;
}
async function save() {
  if (!scopeReady.value) return;
  await saveRuleSet(editing.value, { tenantID: tenantID.value, applicationID: applicationID.value }, form);
  visible.value = false;
  await load();
}
async function versionsFor(v: RuleSet) {
  const request = versionGuard.begin();
  selected.value = v;
  const result = await listRuleVersions(v);
  if (versionGuard.isCurrent(request) && selected.value?.id === v.id) {
    versions.value = result.items || [];
    versionVisible.value = true;
  }
}
async function createVersion() {
  if (!selected.value) return;
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
  if (!selected.value) return;
  const result = await publishRuleVersion(selected.value, v);
  selected.value = result.rule_set;
  await load();
  await versionsFor(result.rule_set);
}
async function evaluate(v: RuleSet) {
  const r = await evaluateRule(v, parseJSONObject(facts.value, '事实'));
  evaluation.value = JSON.stringify(r, null, 2);
}
watch([tenantID, applicationID], () => {
  versionGuard.invalidate();
  rows.value = [];
  visible.value = false;
  editing.value = undefined;
  versionVisible.value = false;
  selected.value = undefined;
  versions.value = [];
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
        <ElButton type="primary" :disabled="!scopeReady" @click="open()">新建规则集</ElButton>
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
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="code" label="编码" />
        <ElTableColumn prop="name" label="名称" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="published_version_number" label="发布版本" />
        <ElTableColumn label="操作" width="220">
          <template #default="{ row }">
            <ElButton link @click="open(row)">编辑</ElButton>
            <ElButton link @click="versionsFor(row)">版本</ElButton>
            <ElButton v-if="row.status === 'active'" link @click="evaluate(row)">试运行</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
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
      <ElButton type="primary" @click="save">保存</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="versionVisible" title="规则版本" size="760px">
    <ElInput v-model="definition" type="textarea" :rows="10" />
    <ElButton class="my-12px" type="primary" @click="createVersion">校验并创建版本</ElButton>
    <ElTable :data="versions" border>
      <ElTableColumn prop="version_number" label="版本" />
      <ElTableColumn prop="status" label="状态" />
      <ElTableColumn prop="checksum" label="校验和" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton v-if="row.status === 'draft'" link @click="publish(row)">发布</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElDivider>试运行事实</ElDivider>
    <ElInput v-model="facts" type="textarea" :rows="5" />
  </ElDrawer>
</template>
