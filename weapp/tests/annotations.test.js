const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();

global.wx = {
  getStorageSync(key) {
    return storage.get(key);
  },
  setStorageSync(key, value) {
    storage.set(key, value);
  },
  removeStorageSync(key) {
    storage.delete(key);
  }
};

const annotations = require('../services/annotations');

test.beforeEach(() => {
  storage.clear();
});

test('创建标注类型并持久化', () => {
  const created = annotations.createType('呼吸法', '#E8637A');
  assert.ok(created.id);
  assert.equal(created.label, '呼吸法');
  assert.equal(created.color, '#E8637A');
  assert.equal(created.user_id, 'local');

  const types = annotations.getTypes();
  assert.equal(types.length, 1);
  assert.equal(types[0].label, '呼吸法');
});

test('创建多个标注类型并验证数量限制', () => {
  for (let i = 0; i < 3; i++) {
    annotations.createType(`类型${i}`, '#E8637A');
  }
  assert.equal(annotations.getTypes().length, 3);
});

test('编辑标注类型', () => {
  const created = annotations.createType('旧名称', '#2DB5B5');
  const updated = annotations.updateType(created.id, { label: '新名称', color: '#D94F4F' });
  assert.equal(updated.label, '新名称');
  assert.equal(updated.color, '#D94F4F');

  const types = annotations.getTypes();
  assert.equal(types.length, 1);
  assert.equal(types[0].label, '新名称');
  assert.equal(types[0].color, '#D94F4F');
});

test('编辑不存在的类型抛异常', () => {
  assert.throws(() => annotations.updateType('non-existent', { label: 'x' }), /没有找到/);
});

test('删除标注类型', () => {
  annotations.createType('待删除', '#EF4444');
  const keep = annotations.createType('保留', '#5B8FE8');
  assert.equal(annotations.getTypes().length, 2);

  annotations.deleteType(keep.id);
  const types = annotations.getTypes();
  assert.equal(types.length, 1);
  assert.equal(types[0].label, '待删除');
});

test('删除类型时同时删除该类型的所有标注分配', () => {
  const t1 = annotations.createType('类型A', '#E8637A');
  const t2 = annotations.createType('类型B', '#2DB5B5');

  annotations.addAnnotation(t1.id, '2026-07-10');
  annotations.addAnnotation(t1.id, '2026-07-11');
  annotations.addAnnotation(t2.id, '2026-07-10');

  // 确认分配存在
  let monthAssignments = annotations.getMonthAssignments(2026, 7);
  assert.equal(monthAssignments.length, 3);

  annotations.deleteType(t1.id);

  // 确认 t1 的分配被删除，t2 的保留
  monthAssignments = annotations.getMonthAssignments(2026, 7);
  assert.equal(monthAssignments.length, 1);
  assert.equal(monthAssignments[0].annotation_type_id, t2.id);
});

test('添加标注（幂等）', () => {
  const t = annotations.createType('测试', '#9B72CF');

  const a1 = annotations.addAnnotation(t.id, '2026-07-15');
  assert.ok(a1);

  // 重复添加应返回 null（幂等）
  const a2 = annotations.addAnnotation(t.id, '2026-07-15');
  assert.equal(a2, null);

  const assignments = annotations.getMonthAssignments(2026, 7);
  assert.equal(assignments.length, 1);
});

test('移除标注', () => {
  const t = annotations.createType('测试', '#9B72CF');
  annotations.addAnnotation(t.id, '2026-07-15');
  assert.equal(annotations.getMonthAssignments(2026, 7).length, 1);

  annotations.removeAnnotation(t.id, '2026-07-15');
  assert.equal(annotations.getMonthAssignments(2026, 7).length, 0);
});

test('构建月标注地图', () => {
  const t1 = annotations.createType('呼吸法', '#E8637A');
  const t2 = annotations.createType('冥想', '#2DB5B5');

  annotations.addAnnotation(t1.id, '2026-07-10');
  annotations.addAnnotation(t1.id, '2026-07-11');
  annotations.addAnnotation(t2.id, '2026-07-10');

  const map = annotations.buildAnnotationMap(2026, 7);
  assert.deepEqual(Object.keys(map).sort(), ['2026-07-10', '2026-07-11']);
  assert.equal(map['2026-07-10'].length, 2);
  assert.equal(map['2026-07-10'][0].color, '#E8637A');
  assert.equal(map['2026-07-10'][1].color, '#2DB5B5');
  assert.equal(map['2026-07-11'].length, 1);
  assert.equal(map['2026-07-11'][0].color, '#E8637A');
});

test('构建标注日期索引', () => {
  const t1 = annotations.createType('呼吸法', '#E8637A');
  const t2 = annotations.createType('冥想', '#2DB5B5');

  annotations.addAnnotation(t1.id, '2026-07-10');
  annotations.addAnnotation(t1.id, '2026-07-11');
  annotations.addAnnotation(t2.id, '2026-07-10');

  const indexed = annotations.buildAnnotatedDates(2026, 7);
  assert.ok(indexed[t1.id] instanceof Set);
  assert.ok(indexed[t1.id].has('2026-07-10'));
  assert.ok(indexed[t1.id].has('2026-07-11'));
  assert.ok(indexed[t2.id].has('2026-07-10'));
  assert.equal(indexed[t2.id].size, 1);
});

test('获取某日期标注颜色', () => {
  const t1 = annotations.createType('呼吸法', '#E8637A');
  const t2 = annotations.createType('冥想', '#2DB5B5');

  annotations.addAnnotation(t1.id, '2026-07-10');
  annotations.addAnnotation(t2.id, '2026-07-10');

  const colors = annotations.getColorsForDate('2026-07-10');
  assert.deepEqual(colors.sort(), ['#2DB5B5', '#E8637A'].sort());
  assert.equal(annotations.getColorsForDate('2026-07-11').length, 0);
});

test('导出全部标注数据', () => {
  annotations.createType('呼吸法', '#E8637A');
  const data = annotations.getAllAnnotations();
  assert.ok(Array.isArray(data.types));
  assert.ok(Array.isArray(data.assignments));
  assert.equal(data.types.length, 1);
});
