"use client"

import { useState, useEffect } from 'react';
import { useLocalStorage } from 'react-use';
import { v4 as uuidv4 } from 'uuid';

export interface PracticeRecord {
  id: string;
  created_at: string;
  date: string;
  type: string;
  duration: number;
  notes: string;
  photos: string[];
  breakthrough?: string;
}

export interface PracticeOption {
  id: string;
  created_at: string;
  label: string;
  label_zh: string;
  notes?: string;
  is_custom: boolean;
}

export interface UserProfile {
  id: string;
  created_at: string;
  name: string;
  signature: string;
  avatar: string | null;
  phone?: string;
  email?: string;
  is_pro: boolean;
}

const DEFAULT_OPTIONS: PracticeOption[] = [
  { id: '1', created_at: new Date().toISOString(), label: 'Primary 1', label_zh: '一序列', notes: 'Mysore', is_custom: false },
  { id: '2', created_at: new Date().toISOString(), label: 'Primary 2', label_zh: '一序列', notes: 'Led class', is_custom: false },
  { id: '3', created_at: new Date().toISOString(), label: 'Intermediate 1', label_zh: '二序列', notes: 'Mysore', is_custom: false },
  { id: '4', created_at: new Date().toISOString(), label: 'Intermediate 2', label_zh: '二序列', notes: 'Led class', is_custom: false },
  { id: '5', created_at: new Date().toISOString(), label: 'Half', label_zh: '半序列', notes: '站立+休息', is_custom: false },
  { id: '6', created_at: new Date().toISOString(), label: 'Rest', label_zh: '休息日', notes: '满月/新月', is_custom: false },
];

export const usePracticeData = () => {
  const [records, setRecords] = useLocalStorage<PracticeRecord[]>('ashtanga_records', []);
  // 使用空数组作为默认值，然后在 useEffect 中初始化
  const [options, setOptions] = useLocalStorage<PracticeOption[]>('ashtanga_options', []);
  const [profile, setProfile] = useLocalStorage<UserProfile>('ashtanga_profile', {
    id: '',
    created_at: new Date().toISOString(),
    name: '阿斯汤加习练者',
    signature: '练习、练习，一切随之而来。',
    avatar: null,
    is_pro: false,
  });

  // 只在第一次初始化时设置默认值（如果 localStorage 为空）
  useEffect(() => {
    const stored = localStorage.getItem('ashtanga_options');
    if (!stored || stored === '[]') {
      setOptions(DEFAULT_OPTIONS);
    } else {
      // 数据迁移：处理旧数据格式（驼峰命名、缺失字段等）
      try {
        const parsedOptions = JSON.parse(stored);

        // ⭐ 健壮性检查：确保是数组
        if (!Array.isArray(parsedOptions)) {
          console.error('[数据迁移] 数据格式错误，不是数组:', parsedOptions);
          setOptions(DEFAULT_OPTIONS);
          return;
        }

        // ⭐ 健壮性检查：处理空数组
        if (parsedOptions.length === 0) {
          setOptions(DEFAULT_OPTIONS);
          return;
        }

        const needsMigration = parsedOptions.some((opt: any) =>
          opt && (
            opt.labelZh !== undefined ||              // 旧字段名（驼峰）
            opt.isCustom !== undefined ||             // 旧字段名（驼峰）
            opt.is_custom === undefined ||            // 缺失 is_custom
            opt.label === undefined                   // 缺失 label
          )
        );

        if (needsMigration) {
          const migratedOptions = parsedOptions.map((opt: any) => {
            // ⭐ 健壮性处理：如果 opt 是 null/undefined，使用默认值
            if (!opt) {
              return {
                id: uuidv4(),
                created_at: new Date().toISOString(),
                label: '一序列',
                label_zh: '一序列',
                notes: 'Mysore',
                is_custom: false,
              };
            }

            return {
              id: opt.id || uuidv4(),
              created_at: opt.created_at || new Date().toISOString(),
              label: opt.label || '',                   // 英文 label 逐步废弃
              label_zh: opt.label_zh || opt.labelZh || opt.label || '一序列',
              notes: opt.notes,
              is_custom: opt.is_custom !== undefined ? opt.is_custom : (opt.isCustom || false),
            };
          });
          setOptions(migratedOptions);
          console.log('[数据迁移] 已修复旧数据格式:', migratedOptions);
        }
      } catch (e) {
        console.error('Failed to migrate options data:', e);
        // ⭐ 出错时使用默认选项
        setOptions(DEFAULT_OPTIONS);
      }
    }

    // ⭐ 清理本地存储中损坏的记录数据
    try {
      const storedRecordsRaw = localStorage.getItem('ashtanga_records');
      if (storedRecordsRaw) {
        const storedRecords = JSON.parse(storedRecordsRaw);
        if (Array.isArray(storedRecords)) {
          const hasDamagedRecords = storedRecords.some((record: any) =
            Object.keys(record).some(key => /^\d+$/.test(key))
          );
          if (hasDamagedRecords) {
            console.log('🧹 [数据清理] 检测到损坏的记录数据，自动修复...');
            const cleanedRecords = storedRecords.map((record: any) => {
              const hasNumericKeys = Object.keys(record).some(key => /^\d+$/.test(key));
              if (hasNumericKeys) {
                return {
                  id: record.id,
                  created_at: record.created_at,
                  date: record.date,
                  type: record.type,
                  duration: record.duration,
                  notes: typeof record.notes === 'string' ? record.notes : '',
                  photos: Array.isArray(record.photos) ? record.photos : [],
                  breakthrough: record.breakthrough,
                };
              }
              return record;
            });
            setRecords(cleanedRecords);
            console.log('✅ [数据清理] 已修复损坏的记录数据');
          }
        }
      }
    } catch (e) {
      console.error('Failed to clean records data:', e);
    }

    // 为首次用户添加教程记录
    const storedRecords = localStorage.getItem('ashtanga_records');
    if (!storedRecords || storedRecords === '[]') {
      const now = new Date().toISOString();

      const tutorialRecords: PracticeRecord[] = [
        {
          id: `tutorial-${Date.now()}-1`,
          created_at: now,
          date: '2026-01-11',
          type: '一序列 Mysore',
          duration: 5400,
          notes: `👋 同学你好，欢迎使用熬汤日记！

功能说明：
📱 Tab1 - 今日练习

• 先选择练习类型，再点击"开始练习"计时
• 练习结束后填写觉察笔记并保存
• 可标记"突破时刻"记录里程碑

📖 Tab2 - 觉察日记

• 点击记录卡片可分享或编辑
🔴 点击左侧日期区域可完整编辑或删除记录
• 点击右上角"+"添加过往练习

回顾记录，看见坚持的力量。🌟

📊 Tab3 - 我的数据

• 热力图：绿点越多=练习越多
• 练习统计：总天数、总时长、平均时长
• 个人信息：点击头像可修改昵称和签名
• 数据管理：导出/导入数据备份`,
          photos: []
        }
      ];

      setRecords(tutorialRecords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  const addRecord = (record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>) => {
    const newRecord: PracticeRecord = {
      ...record,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      photos: [], // MVP doesn't support photos
    };

    // 修复：添加记录后按日期排序，而不是直接放在最前面
    const newRecords = [...(records || []), newRecord];
    const sortedRecords = newRecords.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    setRecords(sortedRecords);

    return newRecord;
  };

  const updateRecord = (id: string, data: Partial<PracticeRecord>) => {
    setRecords((records || []).map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteRecord = (id: string) => {
    setRecords((records || []).filter(r => r.id !== id));
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile({ ...(profile!), ...data });
  };

  const addOption = (label: string, label_zh: string, notes?: string) => {
    const newOption: PracticeOption = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      label: '',        // 英文 label 逐步废弃，新选项统一为空
      label_zh,         // 中文显示名
      notes,
      is_custom: true,
    };
    setOptions([...(options || []), newOption]);
    return newOption;
  };

  const updateOption = (id: string, label: string, label_zh: string, notes?: string) => {
    setOptions((options || []).map(o =>
      o.id === id ? { ...o, label, label_zh, notes } : o
    ));
  };

  const deleteOption = (id: string) => {
    setOptions((options || []).filter(o => o.id !== id));
  };

  const exportData = () => {
    // 移除头像，避免 base64 数据过大导致无法复制
    const { avatar, ...profileWithoutAvatar } = profile;
    const data = {
      records,
      options,
      profile: profileWithoutAvatar,
      export_at: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(data, null, 2);
    return jsonString;
  };

  const importData = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      // 验证数据结构
      if (!data.records && !data.options && !data.profile) {
        console.error('Invalid data structure: missing required fields');
        return false;
      }

      // ⭐ 修复：清理损坏的记录数据（有数字键的对象）
      if (data.records) {
        const cleanedRecords = data.records.map((record: any) => {
          // 检查是否有数字键（如 "0", "1" 等），这是损坏的数据
          const hasNumericKeys = Object.keys(record).some(key => /^\d+$/.test(key));
          if (hasNumericKeys) {
            console.log('[importData] 清理损坏的记录:', record.id);
            // 只保留有效字段
            return {
              id: record.id,
              created_at: record.created_at,
              date: record.date,
              type: record.type,
              duration: record.duration,
              notes: typeof record.notes === 'string' ? record.notes : '',
              photos: Array.isArray(record.photos) ? record.photos : [],
              breakthrough: record.breakthrough,
            };
          }
          return record;
        });
        data.records = cleanedRecords;
      }

      // 修复：导入记录后按日期倒序排序（最新的日期在上面）
      if (data.records) {
        const sortedRecords = [...data.records].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setRecords(sortedRecords);
      }

      if (data.options) setOptions(data.options);
      if (data.profile) setProfile(data.profile);

      console.log('Data imported successfully');
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  };

  return {
    records: records || [],
    options: options || [],
    profile: profile!,
    addRecord,
    updateRecord,
    deleteRecord,
    updateProfile,
    addOption,
    updateOption,
    deleteOption,
    exportData,
    importData,
  };
};
