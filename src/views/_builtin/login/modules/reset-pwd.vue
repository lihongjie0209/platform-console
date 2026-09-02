<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchConfirmPasswordReset } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { passwordPolicyError } from '@/platform/password-policy';
import { passwordResetTokenFromLocation } from '@/platform/password-reset';

defineOptions({ name: 'ResetPwd' });

const route = useRoute();
const router = useRouter();
const { toggleLoginModule } = useRouterPush();
const submitting = ref(false);
const queryToken = typeof route.query.token === 'string' ? route.query.token : '';
const resetToken = ref(passwordResetTokenFromLocation(route.hash, route.query.token));
const password = ref('');
const confirmPassword = ref('');
const validationMessage = computed(() => {
  const policy = passwordPolicyError(password.value);
  if (policy) return policy;
  if (password.value !== confirmPassword.value) return '两次输入的新密码不一致';
  return '';
});

onMounted(() => {
  if (!resetToken.value || (!route.hash && !queryToken)) return;
  // Keep the secret only in component memory after bootstrap. The fragment is not sent to the server.
  router.replace({ path: route.path }).catch(() => undefined);
});

async function handleSubmit() {
  if (!resetToken.value.trim()) {
    window.$message?.error('请输入管理员提供的一次性重置令牌');
    return;
  }
  if (validationMessage.value) {
    window.$message?.error(validationMessage.value);
    return;
  }
  submitting.value = true;
  try {
    const { error } = await fetchConfirmPasswordReset(resetToken.value.trim(), password.value);
    if (error) return;
    resetToken.value = '';
    password.value = '';
    confirmPassword.value = '';
    window.$message?.success('密码已重置，所有旧会话均已退出，请使用新密码登录');
    toggleLoginModule('pwd-login');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ElSpace direction="vertical" fill :size="16" class="w-full">
    <ElAlert
      type="info"
      show-icon
      :closable="false"
      title="令牌只能使用一次且有效期为 30 分钟。平台不会通过此页面签发令牌。"
    />
    <ElInput v-model="resetToken" clearable autocomplete="one-time-code" placeholder="一次性重置令牌" />
    <ElInput v-model="password" type="password" show-password autocomplete="new-password" placeholder="新密码" />
    <ElInput
      v-model="confirmPassword"
      type="password"
      show-password
      autocomplete="new-password"
      placeholder="确认新密码"
    />
    <div
      v-if="password || confirmPassword"
      class="text-12px"
      :class="validationMessage ? 'text-error' : 'text-success'"
    >
      {{ validationMessage || '密码符合安全策略' }}
    </div>
    <ElButton type="primary" size="large" round :loading="submitting" @click="handleSubmit">确认重置密码</ElButton>
    <ElButton size="large" round :disabled="submitting" @click="toggleLoginModule('pwd-login')">返回登录</ElButton>
  </ElSpace>
</template>

<style scoped></style>
