import assert from 'node:assert/strict';
import test from 'node:test';
import { findCrudMutationViolations } from './check-crud-mutation-safety';

test('rejects an update adapter that edits a list snapshot', () => {
  const source = `<script setup lang="ts">
const adapter: BizCrudAdapter<Row, Query, Form, string> = {
  list,
  update
};
</script>`;

  assert.deepEqual(findCrudMutationViolations(source, 'unsafe.vue'), [{ file: 'unsafe.vue', line: 2, column: 7 }]);
});

test('accepts property and method detail readers', () => {
  const sources = [
    `<script setup lang="ts">
const adapter: BizCrudAdapter<Row, Query, Form, string> = { list, detail: getDetail, update };
</script>`,
    `<script setup lang="ts">
const adapter: BizCrudAdapter<Row, Query, Form, string> = { list, async detail(id) { return getDetail(id); }, update };
</script>`
  ];

  for (const source of sources) assert.deepEqual(findCrudMutationViolations(source), []);
});

test('ignores unrelated adapters and scriptless components', () => {
  assert.deepEqual(findCrudMutationViolations('<template><div /></template>'), []);
  assert.deepEqual(
    findCrudMutationViolations(`<script setup lang="ts">const adapter: OtherAdapter = { update };</script>`),
    []
  );
});
