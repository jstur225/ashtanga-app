'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setResult({ error: '未登录', session: null })
        setLoading(false)
        return
      }

      const response = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: 'WFGJ-B5E9-J4BP' }),
      })

      const data = await response.json()
      setResult({
        status: response.status,
        data: data,
        token: token.slice(0, 20) + '...'
      })
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const testEnv = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/env')
      const data = await response.json()
      setResult({ env: data })
    } catch (err: any) {
      setResult({ error: 'Env API not found: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">会员 API 测试</h1>

      <div className="space-y-4 mb-8">
        <button
          onClick={testApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试激活 API'}
        </button>

        <button
          onClick={testEnv}
          disabled={loading}
          className="ml-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          检查环境变量
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <label className="text-sm font-medium">测试结果（可复制）:</label>
          <textarea
            readOnly
            value={JSON.stringify(result, null, 2)}
            className="w-full h-64 p-4 bg-gray-100 rounded text-sm font-mono"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}
    </div>
  )
}
