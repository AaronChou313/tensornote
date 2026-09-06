---
name: TensorNote
description: 白色为主、淡绿色点缀的 Markdown 知识工作台
colors:
  surface: "#ffffff"
  surface-muted: "#f4f7f4"
  ink: "#202923"
  muted: "#606a63"
  line: "#e3e9e4"
  accent: "#4f8061"
  accent-hover: "#376a4b"
  accent-soft: "#e4f1e7"
  accent-pale: "#f1f8f2"
rounded:
  panel: "12px"
  large: "18px"
---

## Overview

TensorNote 用于长期阅读、写作与运行实验。界面沿用现有白绿品牌：工作内容占据视觉中心，品牌标识集中在导航和 Workspace 身份区。启动页是工作入口，概览是内容目录。

本规范记录首批 Home / Workspace 优化与现有共享主题。其余工作台区域分批迁移，不能将本文件视为全产品样式重构已完成。

## Colors

颜色实现统一位于 `src/styles/tokens.css`。白色用于主体表面；浅绿用于选中、Hover 和图标底色；深绿用于可操作内容。正文和辅助说明使用 ink / muted，不能用浅绿或 faint 承载必要说明。

暗色主题使用相同语义 Token。主按钮的文字使用 on-accent：浅色主题为白色，暗色主题为深色，以匹配各自按钮底色。错误、警告、执行状态保留独立语义与文字说明。

## Typography

沿用 Avenir Next / Avenir / PingFang SC / Microsoft YaHei / sans-serif 系统栈，无远程字体依赖。启动标题 28～36px、概览标题 28～40px；列表主文字约 14px、辅助文字约 12px。字体层级区分标题、操作与说明，避免通过过度留白或巨大标题制造层级。

## Layout

Home 内容最大宽度 840px；Workspace 概览最大宽度 860px。主要分组间隔 24～28px，控件内保持紧凑间距。最近打开位于来源操作之后、GitHub 表单之前。

概览采用紧凑身份区、横排统计和连续文档列表。发布者 Logo 保留在桌面标题右侧；窄屏回到正常文档流。680px 以下表单单列、统计两列。长标题换行，列表长内容截断但不撑破容器。

## Elevation & Depth

Home 与概览使用白底、分隔线和轻选中背景，不使用装饰渐变、网格底纹和悬浮卡片阴影。浮层继续使用既有阴影系统。

## Shapes

保留已有 panel / large 圆角 Token；Home 来源操作使用 panel，紧凑图标底板使用 8px。信息行不再逐项包裹统计卡片。

## Components

共享 Button 保留 primary / secondary / ghost / danger 变体与现有尺寸。primary 使用 accent / on-accent，Hover 使用 accent-hover。键盘焦点沿用可见轮廓，不以 Hover 代替焦点。

Home 来源操作在加载中禁用，错误就地显示。文档列表保留链接语义和可见焦点，统计仅展示信息。Workspace 来源、只读能力、发布标题与 Logo 均来自原有数据模型。

## Do's and Don'ts

- 在现有规则处修改或提取样式，避免在文件末尾重复覆盖。
- 浅色与暗色一同验证；保留用户主题偏好。
- 不让视觉简化隐藏只读、执行授权、Revision 信任或未保存状态。
- 不用修改内容格式、Provider 或 Compute 生命周期来实现外观调整。

<!-- 2026-09-06 workbench interaction refinement -->

工作台交互补充：命令面板和设置统一使用受约束的模态焦点与背景隔离。命令列表以淡绿标识键盘选中项，保留长命令说明与空结果状态。多标签在标签条内滚动，不驱动正文滚动；阅读区不足 800px 时保留双 Pane 状态并展示活动 Pane，使用当前窗格选择器切换。窄屏顶栏将窗格操作放到第二行。

文件菜单使用 Radix Portal 和边缘避让，禁止依赖更高 z-index 绕过滚动容器裁切。文件操作与其他工作台弹窗共享焦点管理；进行中的写入不因重复 Enter 或 Esc 被重复触发或隐去。上下文栏采用单层视图切换，同一图谱只渲染一次。
