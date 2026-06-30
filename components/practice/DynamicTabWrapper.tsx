'use client'

import React, { useState, type ReactNode, type ComponentType } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((retry: () => void) => ReactNode)
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryProps & { onError: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onError: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return (this.props.fallback as (retry: () => void) => ReactNode)(() => {
          this.setState({ hasError: false })
        })
      }
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}

/**
 * 包裹 next/dynamic Tab，实现 error → 重试 → remount 闭环。
 *
 * 核心原理：catch 到错误后用 key 递增强制 React 卸载/重建组件，
 * 触发 next/dynamic 重新执行 import()。
 */
export function DynamicTabShell(
  TabComponent: ComponentType<any>,
): ComponentType<any> {
  const Wrapped = (props: Record<string, unknown>) => {
    const [mountKey, setMountKey] = useState(0)

    return (
      <ErrorBoundaryInner
        key={mountKey}
        onError={() => {
          // 错误已被 catch，ErrorBoundaryInner 的 fallback 会显示
        }}
        fallback={(retry: () => void) => (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3 p-8"
            role="alert"
          >
            <p className="text-sm text-muted-foreground">页面加载失败</p>
            <button
              onClick={() => {
                setMountKey((k) => k + 1) // 强制重新挂载
                retry()
              }}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
              type="button"
            >
              点击重试
            </button>
          </div>
        )}
      >
        <TabComponent {...props} />
      </ErrorBoundaryInner>
    )
  }
  Wrapped.displayName = `DynamicTabShell(${TabComponent.displayName || TabComponent.name || 'Tab'})`
  return Wrapped
}
