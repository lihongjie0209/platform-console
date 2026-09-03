<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { collectAllPages } from '@/platform/pagination';
import type { Group, GroupMember, Membership, UserIdentity } from '../../api';
import {
  addGroupMember,
  batchGetUsers,
  listGroupMembers,
  listGroups,
  listMemberships,
  removeGroupMember
} from '../../api';
import { boundedDistinctIDs, mergeUserDirectory } from '../../user-directory';

defineOptions({ name: 'PlatformAdminGroupMembers' });
const platformStore = usePlatformStore();
const loading = ref(false);
const changing = ref('');
const groups = ref<Group[]>([]);
const memberships = ref<Membership[]>([]);
const assignments = ref<GroupMember[]>([]);
const users = ref<UserIdentity[]>([]);
const groupID = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const tenantID = computed(() => platformStore.selectedTenantId);
const canAddMember = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.group.add-member' }));
const canRemoveMember = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.group.remove-member' })
);
const assignmentByMembership = computed(
  () => new Map(assignments.value.map(item => [String(item.membership_id), item]))
);
const userByID = computed(() => new Map(users.value.map(item => [String(item.id), item])));

async function loadCatalogs() {
  if (!tenantID.value) {
    groups.value = [];
    memberships.value = [];
    return;
  }
  loading.value = true;
  try {
    const groupItems = await collectAllPages((catalogPage, catalogPageSize) =>
      listGroups({ tenantID: tenantID.value, page: catalogPage, pageSize: catalogPageSize })
    );
    groups.value = groupItems.filter(item => item.status === 'active');
    if (!groups.value.some(item => item.id === groupID.value)) groupID.value = groups.value[0]?.id || '';
    await loadMemberships();
  } finally {
    loading.value = false;
  }
}
async function loadMemberships() {
  if (!tenantID.value) return;
  const result = await listMemberships({
    tenantID: tenantID.value,
    status: 'active',
    page: page.value,
    pageSize: pageSize.value
  });
  memberships.value = result.memberships;
  total.value = result.total;
  const ids = boundedDistinctIDs(result.memberships.map(item => item.user_id));
  if (ids.length) {
    const directory = await batchGetUsers(ids);
    users.value = mergeUserDirectory(users.value, directory.items || []);
  }
}
async function loadAssignments() {
  if (!groupID.value) {
    assignments.value = [];
    return;
  }
  loading.value = true;
  try {
    assignments.value = (await listGroupMembers(groupID.value)).group_members || [];
  } finally {
    loading.value = false;
  }
}
async function toggle(membership: Membership, enabled: boolean) {
  if ((enabled && !canAddMember.value) || (!enabled && !canRemoveMember.value)) return;
  const membershipID = String(membership.id || '');
  if (!membershipID) return;
  const assignment = assignmentByMembership.value.get(membershipID);
  changing.value = membershipID;
  try {
    if (enabled) await addGroupMember(groupID.value, membershipID);
    else if (assignment) await removeGroupMember(groupID.value, membershipID, Number(assignment.version));
    window.$message?.success(enabled ? '成员已加入分组' : '成员已移出分组');
    await loadAssignments();
  } finally {
    changing.value = '';
  }
}
function userLabel(id: string) {
  const user = userByID.value.get(id);
  return user ? `${user.display_name || user.username} (${user.username})` : id;
}
async function changePage(value: number) {
  page.value = value;
  await loadMemberships();
}
async function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  await loadMemberships();
}
watch(groupID, loadAssignments);
watch(tenantID, async () => {
  groupID.value = '';
  page.value = 1;
  await loadCatalogs();
  await loadAssignments();
});
onMounted(loadCatalogs);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">成员组分配</h2>
          <p class="mb-0 mt-6px text-13px text-#999">将当前租户的活跃成员加入或移出成员组，移除后可以安全恢复。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSelect v-model="groupID" class="w-260px" filterable placeholder="选择成员组">
            <ElOption
              v-for="group in groups"
              :key="String(group.id)"
              :label="`${group.name} (${group.code})`"
              :value="String(group.id)"
            />
          </ElSelect>
          <ElButton :loading="loading" @click="loadAssignments">刷新</ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <ElEmpty v-else-if="!groups.length" description="当前租户暂无启用的成员组" />
    <template v-else>
      <ElTable v-loading="loading" :data="memberships" border stripe>
        <ElTableColumn prop="user_id" label="用户" min-width="220">
          <template #default="{ row }">{{ userLabel(row.user_id) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="primary_organization_unit_id" label="主组织 ID" min-width="190">
          <template #default="{ row }">{{ row.primary_organization_unit_id || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="joined_at" label="加入租户时间" min-width="190" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="组内状态" width="130" fixed="right">
          <template #default="{ row }">
            <ElSwitch
              v-if="canAddMember || canRemoveMember"
              :model-value="assignmentByMembership.get(row.id)?.status === 'active'"
              :loading="changing === row.id"
              :disabled="assignmentByMembership.get(row.id)?.status === 'active' ? !canRemoveMember : !canAddMember"
              @change="value => toggle(row, Boolean(value))"
            />
            <span v-else>-</span>
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
    </template>
  </ElCard>
</template>
