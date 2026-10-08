const TYPES_KEY = 'weapp_annotation_types_v1';
const ASSIGNMENTS_KEY = 'weapp_annotations_v1';

function readArray(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function writeArray(key, data) {
  wx.setStorageSync(key, data);
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ===== 标注类型 CRUD =====

function getTypes() {
  return readArray(TYPES_KEY);
}

function createType(label, color) {
  const types = getTypes();
  const now = new Date().toISOString();
  const type = {
    id: createUuid(),
    user_id: 'local',
    label,
    color,
    sort_order: types.length,
    created_at: now,
    updated_at: now
  };
  writeArray(TYPES_KEY, [...types, type]);
  return type;
}

function updateType(id, updates) {
  let updated = null;
  const types = getTypes().map((t) => {
    if (t.id !== id) return t;
    updated = {
      ...t,
      label: updates.label !== undefined ? updates.label : t.label,
      color: updates.color !== undefined ? updates.color : t.color,
      updated_at: new Date().toISOString()
    };
    return updated;
  });
  if (!updated) throw new Error('没有找到这个标注类型');
  writeArray(TYPES_KEY, types);
  return updated;
}

function deleteType(id) {
  const types = getTypes().filter((t) => t.id !== id);
  writeArray(TYPES_KEY, types);
  // 同时删除该类型的所有标注分配
  const assignments = getAssignments().filter((a) => a.annotation_type_id !== id);
  writeArray(ASSIGNMENTS_KEY, assignments);
}

// ===== 标注分配 CRUD =====

function getAssignments() {
  return readArray(ASSIGNMENTS_KEY);
}

function getMonthAssignments(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return getAssignments().filter((a) => a.date.startsWith(monthStr));
}

function addAnnotation(typeId, date) {
  const assignments = getAssignments();
  // 幂等：不重复添加
  const exists = assignments.some((a) => a.annotation_type_id === typeId && a.date === date);
  if (exists) return null;
  const annotation = {
    id: createUuid(),
    annotation_type_id: typeId,
    date,
    created_at: new Date().toISOString()
  };
  writeArray(ASSIGNMENTS_KEY, [...assignments, annotation]);
  return annotation;
}

function removeAnnotation(typeId, date) {
  const assignments = getAssignments().filter(
    (a) => !(a.annotation_type_id === typeId && a.date === date)
  );
  writeArray(ASSIGNMENTS_KEY, assignments);
}

// ===== 查询方法 =====

function buildAnnotationMap(year, month) {
  const types = getTypes();
  const typeMap = {};
  types.forEach((t) => { typeMap[t.id] = t; });

  const assignments = getMonthAssignments(year, month);
  const map = {};
  assignments.forEach((a) => {
    const typeInfo = typeMap[a.annotation_type_id];
    if (!typeInfo) return;
    if (!map[a.date]) map[a.date] = [];
    map[a.date].push({ label: typeInfo.label, color: typeInfo.color });
  });
  return map;
}

function buildAnnotatedDates(year, month) {
  const assignments = getMonthAssignments(year, month);
  const map = {};
  assignments.forEach((a) => {
    if (!map[a.annotation_type_id]) map[a.annotation_type_id] = new Set();
    map[a.annotation_type_id].add(a.date);
  });
  return map;
}

// 获取某个日期所有标注的颜色（用于日历渲染）
function getColorsForDate(dateStr) {
  const monthKey = dateStr.slice(0, 7);
  const [year, month] = monthKey.split('-').map(Number);
  const types = getTypes();
  const typeMap = {};
  types.forEach((t) => { typeMap[t.id] = t; });

  return getMonthAssignments(year, month)
    .filter((a) => a.date === dateStr && typeMap[a.annotation_type_id])
    .map((a) => typeMap[a.annotation_type_id].color);
}

// 获取所有标注数据（用于数据导出）
function getAllAnnotations() {
  return {
    types: getTypes(),
    assignments: getAssignments()
  };
}

function replaceAnnotations(input = {}) {
  const types = Array.isArray(input.types) ? input.types : [];
  const assignments = Array.isArray(input.assignments) ? input.assignments : [];
  writeArray(TYPES_KEY, types);
  writeArray(ASSIGNMENTS_KEY, assignments);
  return getAllAnnotations();
}

function clearAnnotations() {
  writeArray(TYPES_KEY, []);
  writeArray(ASSIGNMENTS_KEY, []);
}

module.exports = {
  TYPES_KEY,
  ASSIGNMENTS_KEY,
  getTypes,
  createType,
  updateType,
  deleteType,
  getMonthAssignments,
  addAnnotation,
  removeAnnotation,
  buildAnnotationMap,
  buildAnnotatedDates,
  getColorsForDate,
  getAllAnnotations,
  replaceAnnotations,
  clearAnnotations
};
