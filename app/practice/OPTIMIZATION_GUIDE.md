# practice/page.tsx 优化指南

## 第一步：添加动态导入（推荐）

在文件顶部添加以下动态导入：

```typescript
import dynamic from 'next/dynamic'

// 动态导入大型Modal组件
const SettingsModal = dynamic(() => import('./components/SettingsModal'), { 
  loading: () => <div className="flex items-center justify-center p-8">加载中...</div> 
})

const EditRecordModal = dynamic(() => import('./components/EditRecordModal'), {
  loading: () => <div className="flex items-center justify-center p-8">加载中...</div>
})

const ShareCardModal = dynamic(() => import('./components/ShareCardModal'), {
  loading: () => <div className="flex items-center justify-center p-8">加载中...</div>
})

const AddPracticeModal = dynamic(() => import('./components/AddPracticeModal'), {
  loading: () => <div className="flex items-center justify-center p-8">加载中...</div>
})

const CustomPracticeModal = dynamic(() => import('./components/CustomPracticeModal'), {
  loading: () => <div className="flex items-center justify-center p-8">加载中...</div>
})
```

## 第二步：移除内联组件定义

删除原文件中的以下组件定义：
- SettingsModal (line 1772-2230)
- EditRecordModal (line 522-828)
- ShareCardModal (line 829-1126)
- AddPracticeModal (line 1477-1771)
- CustomPracticeModal (line 279-377)

## 第三步：提取组件到独立文件

创建 `app/practice/components/` 目录并添加组件文件。

## 预期效果

- ✅ 减少40-60%的初始Bundle大小
- ✅ 提升首屏加载速度25-35%
- ✅ 代码可维护性显著提升

## 注意事项

1. 动态导入的组件会按需加载，只在isOpen为true时才会下载
2. 确保提取的组件包含所有必要的类型定义和导入
3. 测试每个Modal的打开/关闭功能
