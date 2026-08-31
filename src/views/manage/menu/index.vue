<script setup lang="tsx">
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useBoolean } from '@sa/hooks';
import { yesOrNoRecord } from '@/constants/common';
import { enableStatusRecord, menuTypeRecord } from '@/constants/business';
import { fetchGetAllPages, fetchGetMenuList } from '@/service/api';
import { defaultTransform, useTableOperate, useUIPaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { BizTreeCrudPage } from '@/components/business/crud';
import MenuOperateModal, { type OperateType } from './modules/menu-operate-modal.vue';

const { bool: visible, setTrue: openModal } = useBoolean();

const { columns, columnChecks, data, loading, pagination, getData, getDataByPage } = useUIPaginatedTable({
  api: () => fetchGetMenuList(),
  transform: response => defaultTransform(response),
  columns: () => [
    { prop: 'selection', type: 'selection', width: 48 },
    { prop: 'id', label: $t('page.manage.menu.id') },
    {
      prop: 'menuType',
      label: $t('page.manage.menu.menuType'),
      width: 90,
      formatter: row => {
        const tagMap: Record<Api.SystemManage.MenuType, UI.ThemeColor> = {
          1: 'info',
          2: 'primary'
        };

        const label = $t(menuTypeRecord[row.menuType]);

        return <ElTag type={tagMap[row.menuType]}>{label}</ElTag>;
      }
    },
    {
      prop: 'menuName',
      label: $t('page.manage.menu.menuName'),
      minWidth: 120,
      formatter: row => {
        const { i18nKey, menuName } = row;

        const label = i18nKey ? $t(i18nKey) : menuName;

        return <span>{label}</span>;
      }
    },
    {
      prop: 'icon',
      label: $t('page.manage.menu.icon'),
      width: 100,
      formatter: row => {
        const icon = row.iconType === '1' ? row.icon : undefined;

        const localIcon = row.iconType === '2' ? row.icon : undefined;

        return (
          <div class="flex-center">
            <SvgIcon icon={icon} localIcon={localIcon} class="text-icon" />
          </div>
        );
      }
    },
    { prop: 'routeName', label: $t('page.manage.menu.routeName'), minWidth: 120 },
    { prop: 'routePath', label: $t('page.manage.menu.routePath'), minWidth: 120 },
    {
      prop: 'status',
      label: $t('page.manage.menu.menuStatus'),
      width: 80,
      formatter: row => {
        if (row.status === undefined) {
          return '';
        }

        const tagMap: Record<Api.Common.EnableStatus, UI.ThemeColor> = {
          1: 'success',
          2: 'warning'
        };

        const label = $t(enableStatusRecord[row.status]);

        return <ElTag type={tagMap[row.status]}>{label}</ElTag>;
      }
    },
    {
      prop: 'hideInMenu',
      label: $t('page.manage.menu.hideInMenu'),
      width: 80,
      formatter: row => {
        const hide: CommonType.YesOrNo = row.hideInMenu ? 'Y' : 'N';

        const tagMap: Record<CommonType.YesOrNo, UI.ThemeColor> = {
          Y: 'danger',
          N: 'info'
        };

        const label = $t(yesOrNoRecord[hide]);

        return <ElTag type={tagMap[hide]}>{label}</ElTag>;
      }
    },
    { prop: 'parentId', label: $t('page.manage.menu.parentId'), width: 90 },
    { prop: 'order', label: $t('page.manage.menu.order'), width: 60 },
    {
      prop: 'operate',
      label: $t('common.operate'),
      width: 270,
      formatter: row => (
        <div class="flex-center justify-end pr-10px">
          {row.menuType === '1' && (
            <ElButton type="primary" plain size="small" onClick={() => handleAddChildMenu(row)}>
              {$t('page.manage.menu.addChildMenu')}
            </ElButton>
          )}
          <ElButton type="primary" plain size="small" onClick={() => handleEdit(row)}>
            {$t('common.edit')}
          </ElButton>
          <ElPopconfirm title={$t('common.confirmDelete')} onConfirm={() => handleDelete(row.id)}>
            {{
              reference: () => (
                <ElButton type="danger" plain size="small">
                  {$t('common.delete')}
                </ElButton>
              )
            }}
          </ElPopconfirm>
        </div>
      )
    }
  ]
});

const { checkedRowKeys, onBatchDeleted, onDeleted } = useTableOperate(data, 'id', getData);

const operateType = ref<OperateType>('add');

function handleAdd() {
  operateType.value = 'add';
  openModal();
}

async function handleBatchDelete() {
  // request

  onBatchDeleted();
}

function handleSelectionChange(rows: Api.SystemManage.Menu[]) {
  checkedRowKeys.value = rows.map(row => String(row.id));
}

function handleDelete(id: number) {
  // eslint-disable-next-line no-console
  console.log(id);
  // request

  onDeleted();
}

/** the edit menu data or the parent menu data when adding a child menu */
const editingData: Ref<Api.SystemManage.Menu | null> = ref(null);

function handleEdit(item: Api.SystemManage.Menu) {
  operateType.value = 'edit';
  editingData.value = { ...item };

  openModal();
}

function handleAddChildMenu(item: Api.SystemManage.Menu) {
  operateType.value = 'addChild';

  editingData.value = { ...item };

  openModal();
}

const allPages = ref<string[]>([]);

async function getAllPages() {
  const { data: pages } = await fetchGetAllPages();
  allPages.value = pages || [];
}

function init() {
  getAllPages();
}

// init
init();
</script>

<template>
  <BizTreeCrudPage
    v-model:column-checks="columnChecks"
    :title="$t('page.manage.menu.title')"
    :data="data"
    :columns="columns"
    :loading="loading"
    row-key="id"
    :total="pagination.total"
    :current-page="pagination.currentPage"
    :page-size="pagination.pageSize"
    :page-sizes="pagination.pageSizes"
    :can-delete="checkedRowKeys.length > 0"
    @add="handleAdd"
    @delete="handleBatchDelete"
    @refresh="getData"
    @selection-change="handleSelectionChange"
    @page-change="page => pagination['current-change']?.(page)"
    @page-size-change="size => pagination['size-change']?.(size)"
  >
    <MenuOperateModal
      v-model:visible="visible"
      :operate-type="operateType"
      :row-data="editingData"
      :all-pages="allPages"
      @submitted="getDataByPage"
    />
  </BizTreeCrudPage>
</template>
