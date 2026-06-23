"use client"

import { useMemo, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import {
  MAX_SLOTS_FREE,
  MAX_SLOTS_PRO,
  type PracticeOption,
  type PracticeRecord,
} from "@/hooks/usePracticeData"
import { trackEvent, setUserProfile } from "@/lib/analytics"
import { deletePracticeRecord } from "@/lib/database"
import { supabase } from "@/lib/supabase"

type NewPracticeRecord = Omit<PracticeRecord, "id" | "created_at" | "updated_at" | "photos">
type AutoSync = (reason: string) => Promise<unknown>

interface UsePracticeCommandsArgs {
  user: User | null
  practiceOptions: PracticeOption[]
  selectedOption: string | null
  membershipIsPro: boolean
  chantEnabled: boolean | undefined
  chantDelaySeconds: number
  setPracticeOptions: Dispatch<SetStateAction<PracticeOption[]>>
  setSelectedOption: (value: string | null) => void
  setCustomPracticeName: (value: string) => void
  setChantEnabled: (value: boolean) => void
  setChantMins: (value: number) => void
  setChantSecs: (value: number) => void
  setShowChantSettings: (value: boolean) => void
  setEditingOption: (value: PracticeOption | null) => void
  setShowEditModal: (value: boolean) => void
  setShowCustomModal: (value: boolean) => void
  setMembershipPromptReason: (value: "options_full" | "locked_option") => void
  setShowMembershipPrompt: (value: boolean) => void
  fetchTodayCount: () => void
  updateOption: (id: string, label: string, notes?: string, colorLevel?: number) => void
  deleteOption: (id: string) => void
  addOption: (
    label: string,
    labelZh?: string,
    notes?: string,
    onSync?: () => void,
    isPro?: boolean,
    colorLevel?: number,
  ) => PracticeOption | null
  updateRecord: (id: string, data: Partial<PracticeRecord>, onSync?: (record: PracticeRecord) => void) => void
  deleteRecord: (id: string) => void
  addRecord: (record: NewPracticeRecord) => PracticeRecord
  autoSync: AutoSync
}

export function normalizeOptionColorLevel(isPro: boolean, colorLevel?: number) {
  return !isPro && (colorLevel === 1 || colorLevel === 4) ? 3 : (colorLevel ?? 3)
}

export function getPracticeOptionRules(practiceOptions: PracticeOption[], isPro: boolean) {
  const userOptions = practiceOptions.filter((option) => !option.is_fixed && option.id !== "custom")
  const maxSlots = isPro ? MAX_SLOTS_PRO : MAX_SLOTS_FREE
  return {
    canDeleteOption: userOptions.length > 1,
    isOptionsFull: userOptions.length >= maxSlots,
    lockedOptionIds: isPro
      ? new Set<string>()
      : new Set(userOptions.slice(MAX_SLOTS_FREE).map((option) => option.id)),
  }
}

export function usePracticeCommands(args: UsePracticeCommandsArgs) {
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)
  const optionRules = useMemo(
    () => getPracticeOptionRules(args.practiceOptions, args.membershipIsPro),
    [args.practiceOptions, args.membershipIsPro],
  )

  const handleOptionTap = (option: PracticeOption) => {
    const now = Date.now()
    const lastTap = lastTapRef.current

    if (lastTap && lastTap.id === option.id && now - lastTap.time < 300) {
      lastTapRef.current = null
      if (option.is_fixed) {
        if (option.id === "chant_switch") {
          args.setChantMins(Math.floor(args.chantDelaySeconds / 60))
          args.setChantSecs(args.chantDelaySeconds % 60)
          args.setShowChantSettings(true)
        }
        return
      }
      if (option.id !== "custom" && !option.is_preset && option.can_edit !== false) {
        args.setEditingOption(option)
        args.setShowEditModal(true)
      } else if (option.is_preset || option.can_edit === false) {
        toast("预设按钮暂不支持编辑")
      }
      return
    }

    lastTapRef.current = { id: option.id, time: now }
    if (option.is_fixed) {
      handleFixedOptionTap(option.id)
      return
    }
    if (option.id === "custom") {
      if (optionRules.isOptionsFull && !args.membershipIsPro) {
        showMembershipPrompt("options_full")
      } else {
        args.setShowCustomModal(true)
      }
    } else if (optionRules.lockedOptionIds.has(option.id)) {
      showMembershipPrompt("locked_option")
    } else {
      args.setSelectedOption(option.id)
      args.setCustomPracticeName("")
    }
  }

  const handleFixedOptionTap = (optionId: string) => {
    if (optionId === "guided_audio") {
      if (args.chantEnabled) {
        args.setChantEnabled(false)
        toast("已关闭唱诵")
      }
      args.setSelectedOption("guided_audio")
      args.setCustomPracticeName("")
    } else if (optionId === "today_count") {
      args.fetchTodayCount()
      toast("今天你熬汤了吗？")
    } else if (optionId === "chant_switch") {
      const enabled = !args.chantEnabled
      args.setChantEnabled(enabled)
      if (enabled) {
        toast("唱诵已开启")
        if (args.selectedOption === "guided_audio") {
          args.setSelectedOption(null)
          toast("已关闭口令跟练")
        }
      } else {
        toast("唱诵已关闭")
      }
    }
  }

  const showMembershipPrompt = (reason: "options_full" | "locked_option") => {
    args.setMembershipPromptReason(reason)
    args.setShowMembershipPrompt(true)
  }

  const handleEditSave = (id: string, name: string, notes: string, colorLevel?: number) => {
    const safeColorLevel = normalizeOptionColorLevel(args.membershipIsPro, colorLevel)
    args.updateOption(id, name, notes, safeColorLevel)
    args.setPracticeOptions((options) => options.map((option) =>
      option.id === id ? { ...option, label: name, notes, color_level: safeColorLevel } : option
    ))
    toast.success("已保存修改")
    if (args.user) scheduleSync(args.autoSync, "编辑选项后同步")
  }

  const handleEditDelete = async (id: string) => {
    const remainingOptions = args.practiceOptions.filter((option) => option.id !== "custom")
    if (remainingOptions.length <= 2) {
      toast.error("至少需要保留2个练习选项")
      return
    }

    args.deleteOption(id)
    args.setPracticeOptions((options) => options.filter((option) => option.id !== id))
    if (args.selectedOption === id) args.setSelectedOption(null)
    toast.success("已删除选项")
    if (!args.user) return

    try {
      const { error } = await supabase.from("practice_options").delete().eq("id", id).eq("user_id", args.user.id)
      if (error) {
        console.error("[handleEditDelete] 云端删除失败:", error)
        toast.error("云端删除失败，选项仅在本设备删除")
      } else {
        await args.autoSync("删除选项后同步")
      }
    } catch (error) {
      console.error("[handleEditDelete] 删除异常:", error)
      toast.error("删除同步失败，选项仅在本设备删除")
    }
  }

  const handleEditRecord = (id: string, data: Partial<PracticeRecord>) => {
    args.updateRecord(id, data, () => {
      if (args.user) void args.autoSync("编辑记录后同步")
    })
    toast.success("更新成功")
  }

  const handleDeleteRecord = async (id: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm("确定要删除这条记录吗？")) return
    args.deleteRecord(id)
    const success = await deletePracticeRecord(id)
    if (!success) {
      toast.error("删除同步失败，记录仅在本设备删除")
      return
    }
    if (!skipConfirm) toast.success("已删除记录")
    if (args.user) void args.autoSync("删除记录后同步")
  }

  const handleAddRecord = (record: NewPracticeRecord) => {
    const newRecord = args.addRecord(record)
    trackEvent("add_record", {
      type: record.type,
      duration: record.duration,
      date: record.date,
      has_breakthrough: !!record.breakthrough,
      has_notes: !!record.notes && record.notes.length > 0,
    })
    scheduleAnalyticsProfileUpdate()
    if (record.type !== "草稿") toast.success("补卡成功！")
    recordPracticeActivity()
    if (args.user?.email) scheduleSync(args.autoSync, "添加记录后同步")
    return newRecord
  }

  const handleAddOption = async (name: string, notes: string, colorLevel?: number) => {
    if (optionRules.isOptionsFull) {
      showMembershipPrompt("options_full")
      return
    }
    const result = args.addOption(name, name, notes, undefined, args.membershipIsPro, colorLevel)
    if (!result) {
      toast.error("添加选项失败，可能已达到上限")
      return
    }
    toast.success("已添加自定义选项")
    if (args.user) scheduleSync(args.autoSync, "添加自定义选项后同步")
  }

  return {
    ...optionRules,
    handleOptionTap,
    handleEditSave,
    handleEditDelete,
    handleEditRecord,
    handleDeleteRecord,
    handleAddRecord,
    handleAddOption,
  }
}

function scheduleSync(autoSync: AutoSync, reason: string) {
  setTimeout(() => { void autoSync(reason) }, 500)
}

function scheduleAnalyticsProfileUpdate() {
  setTimeout(() => {
    try {
      const records = JSON.parse(localStorage.getItem("ashtanga_records") || "[]")
      if (!Array.isArray(records)) return
      const recordsWithNotes = records.filter((record) => record.notes?.trim()).length
      const recordsWithBreakthrough = records.filter((record) => record.breakthrough?.trim()).length
      setUserProfile({
        total_records: records.length,
        records_with_notes: recordsWithNotes,
        records_with_breakthrough: recordsWithBreakthrough,
        notes_rate: records.length > 0 ? Math.round((recordsWithNotes / records.length) * 100) : 0,
        last_patch_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[add_record] 更新 Mixpanel Profile 失败:", error)
    }
  }, 100)
}

function recordPracticeActivity() {
  const uuid = localStorage.getItem("ashtanga_uuid")
  if (!uuid) return
  fetch("/api/stats/record-practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid }),
  }).catch(() => {})
}
