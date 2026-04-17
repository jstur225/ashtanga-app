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
  start_time?: string; // ⭐ 新增：练习开始时间，ISO 8601 格式（如 2026-03-05T11:53:00+08:00）
}

export interface PracticeOption {
  id: string;
  created_at: string;
  label: string;
  notes?: string;
  is_custom: boolean;
  is_preset?: boolean;      // 是否预设特殊选项
  audio_src?: string;       // 音频文件路径
  can_edit?: boolean;       // 是否可编辑（默认true）
  updated_at?: string;      // 最后修改时间
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
  // 新增：历史练习数据校准
  historical_days?: number;           // 历史练习天数
  historical_avg_minutes?: number;    // 历史平均每次时长（分钟）
}

// 选项数量限制
export const MAX_SLOTS_FREE = 4;
export const MAX_SLOTS_PRO = 11;

// 口令跟练预设选项
export const GUIDED_AUDIO_OPTION: PracticeOption = {
  id: 'guided_audio',
  created_at: '2026-01-01T00:00:00.000Z',
  label: '一序列',
  notes: '老掌门人版口令',
  is_custom: false,
  is_preset: true,
  audio_src: '/audio/guruji-led-primary.m4a',
  can_edit: false,
};

// 默认选项（新用户首次使用时自动创建）
export const DEFAULT_OPTIONS: PracticeOption[] = [
  { id: uuidv4(), created_at: new Date().toISOString(), label: '一序列', notes: 'Mysore', is_custom: false },
  { id: uuidv4(), created_at: new Date().toISOString(), label: '一序列', notes: 'Led class', is_custom: false },
  { id: uuidv4(), created_at: new Date().toISOString(), label: '半序列', notes: '站立+休息', is_custom: false },
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

    // ⭐ 数据迁移：确保记录中的 photos 字段是数组格式（处理从云端同步下来的 JSON 字符串）
    try {
      const storedRecords = localStorage.getItem('ashtanga_records');
      if (storedRecords && storedRecords !== '[]') {
        const parsedRecords: PracticeRecord[] = JSON.parse(storedRecords);
        let needsMigration = false;
        const migratedRecords = parsedRecords.map(r => {
          // 如果 photos 是字符串，解析为数组
          if (r.photos && typeof r.photos === 'string') {
            try {
              needsMigration = true;
              return { ...r, photos: JSON.parse(r.photos) };
            } catch (e) {
              console.error('[数据迁移] 解析 photos 失败:', r.photos);
              return { ...r, photos: [] };
            }
          }
          // 如果 photos 未定义或为 null，设置为空数组
          if (!r.photos) {
            needsMigration = true;
            return { ...r, photos: [] };
          }
          return r;
        });
        if (needsMigration) {
          console.log('🔄 [数据迁移] 修复 records 中的 photos 字段格式');
          setRecords(migratedRecords);
        }
      }
    } catch (e) {
      console.error('❌ [数据迁移] 处理 records 失败:', e);
    }

    // 为首次用户添加教程记录
    const storedRecords = localStorage.getItem('ashtanga_records');
    if (!storedRecords || storedRecords === '[]') {
      const now = new Date();
      // ⭐ 教程记录日期为本月1号
      const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const nowStr = now.toISOString();

      const tutorialRecords: PracticeRecord[] = [
        {
          id: `tutorial-${Date.now()}-1`,
          created_at: nowStr,
          date: firstDayOfMonth,
          type: '一序列 Mysore',
          duration: 5400,
          notes: `🔴特别提醒
👈点击左侧日期区域，可编辑或删除记录

🌟Mysore，让我们找回到自我的锚点`,
          photos: []
        }
      ];

      setRecords(tutorialRecords);
    }

    // ⭐ 清理残留的草稿记录并确保排序（用户刷新页面或关闭浏览器导致草稿未被删除）
    try {
      const storedRecords = localStorage.getItem('ashtanga_records');
      if (storedRecords && storedRecords !== '[]') {
        const parsedRecords: PracticeRecord[] = JSON.parse(storedRecords);

        // 步骤1：清理草稿记录
        const cleanedRecords = parsedRecords.filter(r => r.type !== '草稿');
        const draftRecordsCount = parsedRecords.length - cleanedRecords.length;

        if (draftRecordsCount > 0) {
          console.log(`🧹 [清理草稿] 发现 ${draftRecordsCount} 条残留的草稿记录，正在清理...`);
        }

        // 步骤2：确保记录按日期倒序排序（最新的在最前面）
        // 注意：使用 [...cleanedRecords] 创建副本，避免原地排序
        const sortedRecords = [...cleanedRecords].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // 步骤3：检查是否有变化（草稿被清理或顺序需要调整）
        const hasOrderChanges = cleanedRecords.some((r, i) => r.id !== sortedRecords[i]?.id);
        const needsUpdate = draftRecordsCount > 0 || hasOrderChanges;

        if (needsUpdate) {
          if (hasOrderChanges) {
            console.log('🔄 [排序] 记录未按日期排序，重新排序...');
          }
          localStorage.setItem('ashtanga_records', JSON.stringify(sortedRecords));
          setRecords(sortedRecords);
          console.log('✅ [初始化] 记录已清理草稿并排序');
        }
      }
    } catch (e) {
      console.error('❌ [初始化] 清理草稿或排序失败:', e);
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
    onSync?: (record: PracticeRecord) => void
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

    // 在 localStorage 数据中查找并更新
    const targetRecord = latestRecords.find(r => r.id === id);
    if (!targetRecord) {
      console.error('[updateRecord] 找不到记录:', id);
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
    } catch (e) {
      console.error('[updateRecord] 写入 localStorage 失败:', e);
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

  const addOption = (
    label: string,
    label_zh?: string,
    notes?: string,
    onSync?: () => void,
    isPro?: boolean
  ) => {
    const existingOptions = options || [];
    const maxSlots = isPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE;
    if (existingOptions.length >= maxSlots) {
      console.error(`[addOption] 选项已满，最多${maxSlots}个`);
      return null;
    }

    const now = new Date().toISOString();
    const newOption: PracticeOption = {
      id: uuidv4(),
      created_at: now,
      updated_at: now,
      label: label_zh || label,
      notes,
      is_custom: true,
    };
    setOptions([...existingOptions, newOption]);

    setTimeout(() => {
      onSync?.();
    }, 100);

    return newOption;
  };

  const updateOption = (
    id: string,
    label: string,
    notes?: string,
    onSync?: () => void // ⭐ 新增：同步回调
  ) => {
    setOptions((options || []).map(o =>
      o.id === id ? { ...o, label, notes } : o
    ));

    // ⭐ 触发同步回调（延迟执行，确保状态已更新）
    setTimeout(() => {
      onSync?.();
    }, 100);
  };

  const deleteOption = (
    id: string,
    onSync?: () => void
  ) => {
    setOptions((options || []).filter(o => o.id !== id));

    setTimeout(() => {
      onSync?.();
    }, 100);
  };

  const exportData = () => {
    // 移除头像，避免 base64 数据过大导致无法复制
    const { avatar, ...profileWithoutAvatar } = profile;
    // ⭐ 过滤掉草稿记录，只导出正式记录
    const nonDraftRecords = (records || []).filter(r => r.type !== '草稿');
    const data = {
      records: nonDraftRecords,
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
