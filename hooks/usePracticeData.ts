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
      // 数据迁移：将旧的 labelZh 字段转换为 label_zh
      try {
        const parsedOptions = JSON.parse(stored);
        const needsMigration = parsedOptions.some((opt: any) => opt.labelZh && !opt.label_zh);

        if (needsMigration) {
          const migratedOptions = parsedOptions.map((opt: any) => ({
            ...opt,
            label_zh: opt.label_zh || opt.labelZh || '',
          }));
          setOptions(migratedOptions);
        }
      } catch (e) {
        console.error('Failed to migrate options data:', e);
      }
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
          notes: '👋 欢迎使用熬汤日记！\n\n功能说明：\n• 点击记录卡片可编辑或删除\n• 点击底部"+"添加新练习\n• 底部切换三个标签页：今日练习/觉察日记/我的数据\n\n记录你的每一次练习，看见进步。✨',
          photos: []
        },
        {
          id: `tutorial-${Date.now()}-2`,
          created_at: now,
          date: '2026-01-01',
          type: '休息日',
          duration: 0,
          notes: '🌿 休息日也是练习的一部分\n\n记录休息日可以帮助你：\n• 回顾整个练习周期\n• 观察身体恢复状态\n• 保持练习的连贯性\n\n休息也是瑜伽。🧘‍♂️',
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

  const addOption = (label: string, label_zh: string) => {
    const newOption: PracticeOption = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      label,
      label_zh,
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
