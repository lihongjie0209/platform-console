<script setup lang="ts">
import { $t } from '@/locales';

function showLegacyDemoDisabled() {
  window.$message?.warning('平台控制台已移除模拟后端错误接口。');
}

const logout = showLegacyDemoDisabled;
const logoutWithModal = showLegacyDemoDisabled;
const refreshToken = showLegacyDemoDisabled;
const handleRepeatedMessageError = showLegacyDemoDisabled;
const handleRepeatedModalError = showLegacyDemoDisabled;
</script>

<template>
  <ElSpace direction="vertical" fill :size="16">
    <ElCard :header="$t('request.logout')" class="card-wrapper">
      <ElButton @click="logout">{{ $t('common.trigger') }}</ElButton>
    </ElCard>
    <ElCard :header="$t('request.logoutWithModal')" class="card-wrapper">
      <ElButton @click="logoutWithModal">{{ $t('common.trigger') }}</ElButton>
    </ElCard>
    <ElCard :header="$t('request.refreshToken')" class="card-wrapper">
      <ElButton @click="refreshToken">{{ $t('common.trigger') }}</ElButton>
    </ElCard>
    <ElCard :header="$t('page.function.request.repeatedErrorOccurOnce')" class="card-wrapper">
      <ElButton @click="handleRepeatedMessageError">{{ $t('page.function.request.repeatedError') }}(Message)</ElButton>
      <ElButton class="ml-12px" @click="handleRepeatedModalError">
        {{ $t('page.function.request.repeatedError') }}(Modal)
      </ElButton>
    </ElCard>
  </ElSpace>
</template>

<style scoped></style>
