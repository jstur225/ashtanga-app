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
  { id: '1', created_at: new Date().toISOString(), label: 'Option 1', label_zh: '一序列 Mysore', notes: 'Primary Series Mysore', is_custom: false },
  { id: '2', created_at: new Date().toISOString(), label: 'Option 2', label_zh: '一序列 Led Class', notes: 'Primary Series Led Class', is_custom: false },
  { id: '3', created_at: new Date().toISOString(), label: 'Option 3', label_zh: '二序列 Mysore', notes: 'Intermediate Series Mysore', is_custom: false },
  { id: '4', created_at: new Date().toISOString(), label: 'Option 4', label_zh: '二序列 Led Class', notes: 'Intermediate Series Led Class', is_custom: false },
  { id: '5', created_at: new Date().toISOString(), label: 'Option 5', label_zh: '半序列', notes: 'Half Sequence, 站立+休息体式', is_custom: false },
  { id: '6', created_at: new Date().toISOString(), label: 'Option 6', label_zh: '休息日', notes: 'Rest Day, 满月/新月', is_custom: false },
];

export const usePracticeData = () => {
  const [records, setRecords] = useLocalStorage<PracticeRecord[]>('ashtanga_records', []);
  const [options, setOptions] = useLocalStorage<PracticeOption[]>('ashtanga_options', DEFAULT_OPTIONS);
  const [profile, setProfile] = useLocalStorage<UserProfile>('ashtanga_profile', {
    id: '',
    created_at: new Date().toISOString(),
    name: '阿斯汤加习练者',
    signature: '练习阿斯汤加是一场修行',
    avatar: null,
    is_pro: false,
  });

  // Ensure options always has defaults
  useEffect(() => {
    if (!options || options.length === 0) {
      setOptions(DEFAULT_OPTIONS);
    }
  }, [options, setOptions]);

  const addRecord = (record: Omit<PracticeRecord, 'id' | 'created_at' | 'photos'>) => {
    const newRecord: PracticeRecord = {
      ...record,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      photos: [], // MVP doesn't support photos
    };
    setRecords([newRecord, ...(records || [])]);
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

  const exportData = () => {
    const data = {
      records,
      options,
      profile,
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

      if (data.records) setRecords(data.records);
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
    exportData,
    importData,
  };
};
