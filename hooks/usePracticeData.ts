"use client"

import { useState, useEffect } from 'react';
import { useLocalStorage } from 'react-use';
import { v4 as uuidv4 } from 'uuid';

export interface PracticeRecord {
  id: string;
  created_at: string;
  updated_at: string; // ⭐ 新增：最后修改时间，用于同步时判断最新版本
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
  updated_at: string; // ⭐ 新增：最后修改时间，用于同步时判断最新版本
  name: string;
  signature: string;
  avatar: string | null;
  phone?: string;
  email?: string;
  is_pro: boolean;
  // 新增：历史练习数据校准
  historical_days?: number;           // 历史练习天数
  historical_avg_minutes?: number;    // 历史平均每次时长（分钟）
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
    updated_at: new Date().toISOString(),
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
      // ⭐ 数据迁移：将旧版本的英文选项转换为中文
      try {
        const parsedOptions: PracticeOption[] = JSON.parse(stored);
        const hasEnglishLabels = parsedOptions.some(opt =>
          ['Mysore', 'Led', 'Led Class', 'Half', 'Rest'].some(en =>
            opt.label?.includes(en) || opt.notes?.includes(en)
          )
        );

        if (hasEnglishLabels) {
          console.log('🔄 [数据迁移] 检测到旧版本英文选项，自动转换为中文...');
          const migratedOptions = parsedOptions.map(opt => {
            // 只转换 label 为中文，保留原有的 notes 不变
            const label = opt.label?.toLowerCase() || '';
            const notes = opt.notes || '';

            // 根据 label 和 notes 判断类型，只改 label
            if (label.includes('rest') || label.includes('休息日')) {
              return { ...opt, label: '休息日' };
            } else if (label.includes('half') || label.includes('半序列')) {
              return { ...opt, label: '半序列' };
            } else if (label.includes('二序列') || label.includes('second') || label.includes('2')) {
              return { ...opt, label: '二序列' };
            } else if (label.includes('一序列') || label.includes('first') || label.includes('1') || label.includes('primary')) {
              return { ...opt, label: '一序列' };
            }
            // 如果无法识别，保持原样
            return opt;
          });
          setOptions(migratedOptions);
          console.log('✅ [数据迁移] 选项 label 已转换为中文格式');
        }
      } catch (e) {
        console.error('❌ [数据迁移] 解析选项失败:', e);
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
    record: Omit<PracticeRecord, 'id' | 'created_at' | 'updated_at' | 'photos'>,
    onSync?: (record: PracticeRecord) => void // ⭐ 新增：同步回调
  ) => {
    const now = new Date().toISOString();
    const newRecord: PracticeRecord = {
      ...record,
      id: uuidv4(),
      created_at: now,
      updated_at: now, // ⭐ 创建时设置更新时间
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
    const now = new Date().toISOString();

    // ⭐ 修复：直接从 localStorage 读取最新记录，避免 React 状态延迟
    let latestRecords: PracticeRecord[] = [];
    try {
      const recordsStr = localStorage.getItem('ashtanga_records');
      if (recordsStr) {
        latestRecords = JSON.parse(recordsStr);
      }
    } catch (e) {
      console.error('[updateRecord] 读取 localStorage 失败:', e);
    }

    // ⭐ UI 诊断：用 toast 显示关键信息
    import('sonner').then(({ toast }) => {
      toast.info(`开始更新，ID:${id?.substring(0, 8)}，localStorage:${latestRecords.length}条`, { duration: 2000 })
    })
    console.error('[updateRecord] ========== 开始更新 ==========')
    console.error('[updateRecord] 传入 id:', id)
    console.error('[updateRecord] localStorage records 数:', latestRecords.length)

    // 在 localStorage 数据中查找并更新
    const targetRecord = latestRecords.find(r => r.id === id);
    if (!targetRecord) {
      console.error('[updateRecord] ❌ localStorage 中找不到记录:', id)
      import('sonner').then(({ toast }) => {
        toast.error(`localStorage找不到:${id?.substring(0, 8)}`, { duration: 3000 })
      })
      return;
    }

    // 更新记录
    const updatedRecord: PracticeRecord = { ...targetRecord, ...data, updated_at: now };
    const updatedRecords = latestRecords.map(r => r.id === id ? updatedRecord : r);

    // 按日期倒序排序
    const sortedRecords = updatedRecords.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // 直接写入 localStorage
    try {
      localStorage.setItem('ashtanga_records', JSON.stringify(sortedRecords));
      console.error('[updateRecord] ✅ 直接写入 localStorage 成功')
      import('sonner').then(({ toast }) => {
        toast.success(`已更新，共${sortedRecords.length}条`, { duration: 2000 })
      })
    } catch (e) {
      console.error('[updateRecord] ❌ 写入 localStorage 失败:', e)
      import('sonner').then(({ toast }) => {
        toast.error('写入失败', { duration: 3000 })
      })
      return;
    }

    // 同时更新 React 状态（异步，但不依赖它）
    setRecords(sortedRecords);

    // 触发同步回调
    setTimeout(() => {
      onSync?.(updatedRecord);
    }, 100);
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
    const now = new Date().toISOString();
    const updatedProfile = {
      ...profile!,
      ...data,
      updated_at: now // ⭐ 自动更新时间戳
    };
    setProfile(updatedProfile);

    // ⭐ 触发同步回调
    onSync?.(updatedProfile);

    return updatedProfile;
  };

  const addOption = (label: string, label_zh?: string, notes?: string) => {
    const newOption: PracticeOption = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      label: label_zh || label,
      notes,
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

      // 修复：迁移旧的选项数据结构
      if (data.options) {
        const migratedOptions = data.options.map((opt: any) => {
          const { label_zh, isCustom, ...rest } = opt;  // 移除旧字段
          return {
            ...rest,
            // 如果有 label_zh，用它替换 label（中文覆盖英文）
            label: label_zh || opt.label || '',
            // 迁移 isCustom → is_custom
            is_custom: isCustom !== undefined ? isCustom : (opt.is_custom !== undefined ? opt.is_custom : true),
            // 确保 notes 字段存在
            notes: opt.notes || '',
          };
        });
        setOptions(migratedOptions);
      }

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
      updated_at: new Date().toISOString(),
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
