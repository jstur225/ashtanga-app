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
  { id: '1', created_at: new Date().toISOString(), label: '一序列', notes: 'Mysore', is_custom: false },
  { id: '2', created_at: new Date().toISOString(), label: '一序列', notes: 'Led class', is_custom: false },
  { id: '3', created_at: new Date().toISOString(), label: '二序列', notes: 'Mysore', is_custom: false },
  { id: '4', created_at: new Date().toISOString(), label: '二序列', notes: 'Led class', is_custom: false },
  { id: '5', created_at: new Date().toISOString(), label: '半序列', notes: '站立+休息', is_custom: false },
  { id: '6', created_at: new Date().toISOString(), label: '休息日', notes: '满月/新月', is_custom: false },
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

  const addRecord = (
    record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>,
    onSync?: (record: PracticeRecord) => void // ⭐ 新增：同步回调
  ) => {
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

    // ⭐ 触发同步回调
    onSync?.(newRecord);

    return newRecord;
  };

  const updateRecord = (
    id: string,
    data: Partial<PracticeRecord>,
    onSync?: (record: PracticeRecord) => void // ⭐ 新增：同步回调
  ) => {
    setRecords((records || []).map(r => r.id === id ? { ...r, ...data } : r));

    // ⭐ 触发同步回调
    const updatedRecord = records?.find(r => r.id === id);
    if (updatedRecord) {
      onSync?.({ ...updatedRecord, ...data });
    }
  };

  const deleteRecord = (
    id: string,
    onSync?: (id: string) => void // ⭐ 新增：同步回调
  ) => {
    setRecords((records || []).filter(r => r.id !== id));

    // ⭐ 触发同步回调
    onSync?.(id);
  };

  const updateProfile = (
    data: Partial<UserProfile>,
    onSync?: (profile: UserProfile) => void // ⭐ 新增：同步回调
  ) => {
    const updatedProfile = { ...profile!, ...data };
    setProfile(updatedProfile);

    // ⭐ 触发同步回调
    onSync?.(updatedProfile);

    return updatedProfile;
  };

  const addOption = (label: string) => {
    const newOption: PracticeOption = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      label,
      is_custom: true,
    };
    setOptions([...(options || []), newOption]);
    return newOption;
  };

  const updateOption = (id: string, label: string, notes?: string) => {
    setOptions((options || []).map(o =>
      o.id === id ? { ...o, label, notes } : o
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

  const clearAllData = () => {
    // 清空所有数据，但保留默认选项
    setRecords([]);
    setOptions(DEFAULT_OPTIONS);
    setProfile({
      id: '',
      created_at: new Date().toISOString(),
      name: '阿斯汤加习练者',
      signature: '练习、练习，一切随之而来。',
      avatar: null,
      is_pro: false,
    });
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
    clearAllData,
  };
};
