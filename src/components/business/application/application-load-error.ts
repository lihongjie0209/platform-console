import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'ApplicationLoadError',
  props: { error: { type: Error, required: false } },
  setup(props) {
    return () =>
      h('div', { class: 'card-wrapper rounded-8px bg-[var(--el-bg-color)] p-24px text-center' }, [
        h('h2', { class: 'm-0 text-18px font-semibold' }, props.error ? '应用页面加载失败' : '应用页面暂不可用'),
        h(
          'p',
          { class: 'mb-18px mt-8px text-13px text-gray-500' },
          '应用资源暂时不可用，请检查网络或确认控制台版本后重新加载。'
        ),
        h(
          'button',
          {
            class: 'cursor-pointer border-0 rounded-6px bg-primary px-16px py-8px text-white',
            type: 'button',
            onClick: () => window.location.reload()
          },
          '重新加载'
        )
      ]);
  }
});
