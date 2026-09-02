<script setup lang="ts">
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/modules/auth';
import { useForm, useFormRules } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';

defineOptions({ name: 'PwdLogin' });

const authStore = useAuthStore();
const { formRef, validate } = useForm();
const { toggleLoginModule } = useRouterPush();

interface FormModel {
  userName: string;
  password: string;
}

const model = ref<FormModel>({
  userName: '',
  password: ''
});
const mfaMode = ref<'totp' | 'recovery'>('totp');
const mfaCode = ref('');

const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
  // inside computed to make locale ref, if not apply i18n, you can define it without computed
  const { formRules } = useFormRules();

  return {
    userName: formRules.userName,
    password: formRules.pwd
  };
});

async function handleSubmit() {
  await validate();
  await authStore.login(model.value.userName, model.value.password);
  if (authStore.mfaChallenge) {
    model.value.password = '';
    mfaCode.value = '';
  }
}

async function handleMFASubmit() {
  const value = mfaCode.value.trim();
  if (mfaMode.value === 'totp' && !/^\d{6}$/.test(value)) {
    window.$message?.error('请输入 6 位动态验证码');
    return;
  }
  if (mfaMode.value === 'recovery' && value === '') {
    window.$message?.error('请输入恢复码');
    return;
  }
  await authStore.verifyMFA(mfaMode.value === 'totp' ? value : '', mfaMode.value === 'recovery' ? value : '');
}

function cancelMFA() {
  authStore.cancelMFA();
  mfaMode.value = 'totp';
  mfaCode.value = '';
}

function handlePrimary() {
  if (authStore.mfaChallenge) handleMFASubmit();
  else handleSubmit();
}
</script>

<template>
  <ElForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handlePrimary">
    <template v-if="authStore.mfaChallenge">
      <ElAlert
        class="mb-16px"
        type="info"
        show-icon
        :closable="false"
        :title="`密码验证成功，请完成多因素认证。挑战有效期至 ${dayjs(authStore.mfaChallenge.expiresAt).format('HH:mm:ss')}`"
      />
      <ElFormItem>
        <ElSegmented
          v-model="mfaMode"
          block
          :options="[
            { label: '动态验证码', value: 'totp' },
            { label: '恢复码', value: 'recovery' }
          ]"
        />
      </ElFormItem>
      <ElFormItem>
        <ElInput
          v-model="mfaCode"
          clearable
          autocomplete="one-time-code"
          :maxlength="mfaMode === 'totp' ? 6 : 32"
          :placeholder="mfaMode === 'totp' ? '请输入认证器中的 6 位验证码' : '请输入一次性恢复码'"
        />
      </ElFormItem>
      <ElSpace direction="vertical" :size="12" class="w-full" fill>
        <ElButton type="primary" size="large" round block :loading="authStore.loginLoading" @click="handleMFASubmit">
          验证并登录
        </ElButton>
        <ElButton size="large" round block :disabled="authStore.loginLoading" @click="cancelMFA">返回密码登录</ElButton>
      </ElSpace>
    </template>
    <template v-else>
      <ElFormItem prop="userName">
        <ElInput v-model="model.userName" :placeholder="$t('page.login.common.userNamePlaceholder')" />
      </ElFormItem>
      <ElFormItem prop="password">
        <ElInput
          v-model="model.password"
          type="password"
          show-password-on="click"
          :placeholder="$t('page.login.common.passwordPlaceholder')"
        />
      </ElFormItem>
      <ElSpace direction="vertical" :size="24" class="w-full" fill>
        <ElButton type="primary" size="large" round block :loading="authStore.loginLoading" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </ElButton>
        <ElButton link type="primary" @click="toggleLoginModule('reset-pwd')">使用管理员提供的重置令牌</ElButton>
      </ElSpace>
    </template>
  </ElForm>
</template>

<style scoped></style>
