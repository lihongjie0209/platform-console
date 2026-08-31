import { defineConfig } from '@soybeanjs/eslint-config';

export default defineConfig(
  { vue: true, unocss: true },
  {
    rules: {
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index', 'App', 'Register', '[id]', '[url]']
        }
      ],
      'vue/component-name-in-template-casing': [
        'warn',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^icon-/']
        }
      ],
      'unocss/order-attributify': 'off'
    }
  },
  {
    files: [
      'src/views/manage/user/index.vue',
      'src/views/manage/role/index.vue',
      'src/views/manage/menu/index.vue',
      'src/views/manage/role/modules/*-auth-modal.vue'
    ],
    plugins: {
      'business-boundaries': {
        rules: {
          'no-direct-element-plus': {
            meta: {
              type: 'suggestion',
              docs: { description: 'Require business CRUD structural components in migrated views' },
              messages: { forbidden: 'Use the Biz CRUD component layer instead of <{{ name }}> in migrated views.' },
              schema: []
            },
            create(context) {
              const forbidden = new Set([
                'el-card',
                'el-form',
                'el-table',
                'el-table-column',
                'el-pagination',
                'el-dialog',
                'el-drawer'
              ]);
              const visitor = {
                VElement(node) {
                  if (forbidden.has(node.rawName)) {
                    context.report({ node, messageId: 'forbidden', data: { name: node.rawName } });
                  }
                }
              };
              return context.sourceCode.parserServices.defineTemplateBodyVisitor?.(visitor) || {};
            }
          }
        }
      }
    },
    rules: {
      'business-boundaries/no-direct-element-plus': 'error'
    }
  }
);
