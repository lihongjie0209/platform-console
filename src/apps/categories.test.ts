import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applicationCategories,
  applicationCategoryLabel,
  applicationCategoryOptions,
  isApplicationCategory
} from './categories';

test('application category catalog has unique values and matching form options', () => {
  const values = applicationCategories.map(item => item.category);
  assert.equal(new Set(values).size, values.length);
  assert.deepEqual(
    applicationCategoryOptions.map(option => option.value),
    values
  );
  assert.equal(Object.isFrozen(applicationCategoryOptions), true);
});

test('application category helpers reject unknown values and provide labels', () => {
  assert.equal(isApplicationCategory('operations'), true);
  assert.equal(isApplicationCategory('unknown'), false);
  assert.equal(isApplicationCategory(null), false);
  assert.equal(applicationCategoryLabel('platform'), '平台治理');
});
