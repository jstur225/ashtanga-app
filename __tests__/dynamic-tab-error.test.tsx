import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DynamicTabShell } from '@/components/practice/DynamicTabWrapper'
import React from 'react'

describe('DynamicTabShell', () => {
  it('正常渲染子组件', () => {
    const GoodTab = () => <div role="tabpanel">正常内容</div>
    const Wrapped = DynamicTabShell(GoodTab)
    const { container } = render(<Wrapped />)
    expect(container.textContent).toBe('正常内容')
  })

  it('子组件崩溃时显示重试按钮', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // 屏蔽 React 错误日志

    const BadTab = () => {
      throw new Error('模拟加载失败')
    }
    const Wrapped = DynamicTabShell(BadTab)
    render(<Wrapped />)
    expect(screen.getByText('点击重试')).toBeDefined()
    expect(screen.getByText('页面加载失败')).toBeDefined()

    vi.restoreAllMocks()
  })
})
