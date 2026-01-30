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
          notes: '🎉 开始记录你的阿斯汤加之旅！\n\n📝 如何记录觉察：\n• 记录练习中的身体感受\n• 回忆呼吸的起伏状态\n• 分享内心的思绪或念头\n• 每一次记录都是对自己的诚实内观\n\n💡 小贴士：点击记录可以编辑或分享，🔴删除记录或完整编辑点击左侧区域',
          photos: []
        },
        {
          id: `tutorial-${Date.now()}-2`,
          created_at: now,
          date: '2026-01-01',
          type: '一序列 Led class',
          duration: 7200,
          notes: '🌟 突破时刻功能：\n• 记录你的里程碑\n• 看到进步时为自己庆祝\n• 激励自己继续保持\n\n✨ Practice, practice, and all is coming.',
          breakthrough: '马里奇D终于可以自己绑上了',
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
