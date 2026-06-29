"use client"

import { useEffect, useState } from "react"
import { supabase } from '../../lib/supabase'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<{
    loading: boolean
    envVars: boolean
    connection: boolean
    database: boolean
    storage: boolean
    error?: string
  }>({
    loading: true,
    envVars: false,
    connection: false,
    database: false,
    storage: false,
  })

  useEffect(() => {
    async function testConnection() {
      const results: typeof status = {
        loading: false,
        envVars: false,
        connection: false,
        database: false,
        storage: false,
      }

      try {
        // 1. 检查环境变量
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        results.envVars = !!(url && key)

        console.log('✓ 环境变量:', results.envVars ? '已配置' : '缺失')
        console.log('  URL:', url?.substring(0, 30) + '...')
        console.log('  Key:', key?.substring(0, 30) + '...')

        if (!results.envVars) {
          results.error = '环境变量未配置'
          setStatus(results)
          return
        }

        // 2. 测试基本连接
        const { data: testData, error: testError } = await supabase
          .from('practice_records')
          .select('count')
          .limit(1)

        results.connection = !testError
        console.log('✓ 连接测试:', results.connection ? '成功' : '失败')
        if (testError) {
          console.error('  错误:', testError.message)
          results.error = `连接失败: ${testError.message}`
        }

        // 3. 测试数据库查询
        const { data: records, error: dbError } = await supabase
          .from('practice_records')
          .select('*')
          .limit(1)

        results.database = !dbError
        console.log('✓ 数据库测试:', results.database ? '成功' : '失败')
        console.log('  记录数:', records?.length || 0)
        if (dbError) {
          console.error('  错误:', dbError.message)
          if (!results.error) results.error = `数据库错误: ${dbError.message}`
        }

        // 4. 测试Storage
        try {
          const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
          results.storage = !storageError
          console.log('✓ Storage测试:', results.storage ? '成功' : '失败')
          console.log('  Buckets:', buckets?.map(b => b.name).join(', ') || '无')

          if (storageError) {
            console.error('  错误:', storageError.message)
            if (!results.error) results.error = `Storage错误: ${storageError.message}`
          } else {
            const hasPracticePhotos = buckets?.some(b => b.name === 'practice-photos')
            console.log('  practice-photos bucket:', hasPracticePhotos ? '存在' : '不存在')
          }
        } catch (err) {
          console.error('  Storage异常:', err)
          results.storage = false
        }

      } catch (err) {
        console.error('测试异常:', err)
        results.error = `测试异常: ${err instanceof Error ? err.message : String(err)}`
      }

      setStatus(results)
    }

    testConnection()
  }, [])

  if (status.loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🔍 Supabase 连接测试</h1>
        <p>测试中...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1>🔍 Supabase 连接测试</h1>

      <div style={{ marginTop: '20px' }}>
        <TestItem
          name="环境变量"
          status={status.envVars}
          description="NEXT_PUBLIC_SUPABASE_URL 和 ANON_KEY"
        />
        <TestItem
          name="Supabase连接"
          status={status.connection}
          description="基本HTTP连接"
        />
        <TestItem
          name="数据库查询"
          status={status.database}
          description="practice_records 表访问"
        />
        <TestItem
          name="Storage"
          status={status.storage}
          description="practice-photos bucket"
        />
      </div>

      {status.error && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #f88',
          borderRadius: '4px'
        }}>
          <strong>❌ 错误:</strong> {status.error}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p><strong>📋 环境变量:</strong></p>
        <pre style={{ fontSize: '12px' }}>
          URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40)}...
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#0066cc' }}>← 返回首页</a>
      </div>
    </div>
  )
}

function TestItem({ name, status, description }: { name: string; status: boolean; description: string }) {
  return (
    <div style={{
      marginBottom: '10px',
      padding: '10px',
      backgroundColor: status ? '#efe' : '#fee',
      border: `1px solid ${status ? '#8c8' : '#f88'}`,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <span style={{ fontSize: '20px' }}>{status ? '✅' : '❌'}</span>
      <div>
        <div style={{ fontWeight: 'bold' }}>{name}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{description}</div>
      </div>
    </div>
  )
}
