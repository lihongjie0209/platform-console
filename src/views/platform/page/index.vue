<script setup lang="ts">
defineOptions({ name: 'PlatformPage' });

const props = defineProps<{
  applicationCode: string;
  applicationName: string;
  menuCode: string;
  menuName: string;
  componentKey?: string;
  externalURL?: string;
}>();

function openExternalURL() {
  if (props.externalURL) window.open(props.externalURL, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">{{ menuName }}</h2>
          <p class="mb-0 mt-6px text-13px text-#999">{{ applicationName }} · {{ applicationCode }} · {{ menuCode }}</p>
        </div>
        <ElButton v-if="externalURL" type="primary" plain @click="openExternalURL">打开外部系统</ElButton>
      </div>
    </template>
    <ElEmpty description="该业务模块正在接入统一控制台" :image-size="96">
      <template #description>
        <p class="mb-0 text-#666">
          模块由应用服务已发布的菜单驱动；页面实现会在此注册，不会执行菜单中的组件字符串（{{
            componentKey || '未配置'
          }}）。
        </p>
      </template>
    </ElEmpty>
  </ElCard>
</template>
