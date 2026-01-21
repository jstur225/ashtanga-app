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
  { id: '1', created_at: new Date().toISOString(), label: 'Primary Series', label_zh: '初级序列', is_custom: false },
  { id: '2', created_at: new Date().toISOString(), label: 'Mysore Style', label_zh: '迈索尔风格', is_custom: false },
  { id: '3', created_at: new Date().toISOString(), label: 'Led Class', label_zh: '领课', is_custom: false },
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
      if (data.records) setRecords(data.records);
      if (data.options) setOptions(data.options);
      if (data.profile) setProfile(data.profile);
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
