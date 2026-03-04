# MyOpenClaw MVP 需求文档（汇总版）

最后更新：2026-03-04

---

## 1. 产品目标

构建 MyOpenClaw 桌面客户端（Windows / Mac），让非技术用户无需命令行即可使用 OpenClaw。

核心原则：
- 开箱即用（Out-of-the-box）
- 尽量减少用户安装复杂度
- 保留 OpenClaw 核心能力
- 通过 GUI 完成主要配置和使用

---

## 2. 打包与分发要求

### 2.1 双版本打包
每次打包必须同时产出：
1. **simple**：不包含 openclaw runtime 大文件（轻量包）
2. **full**：包含完整 runtime（离线可用）

### 2.2 产物命名
产物文件名必须包含：
- 版本类型（simple/full）
- 平台标识：
  - windows
  - mac_silicon
  - mac_intel

### 2.3 历史版本归档
每次打包在 `dist/` 下创建新时间戳目录，例如：
- `dist/YYYYMMDD-HHmmss/`

并在该目录下放置本次全部构建产物，保留历史版本。

### 2.4 simple 版本运行时策略
simple 版本不内置 runtime 时，应用启动需支持：
- 自动检查 runtime 是否存在
- 缺失时自动下载并解压 runtime
- 不要求用户手动去下载页面

---

## 3. UI/UX 总体要求

### 3.1 风格要求
- 参考：`homepage-final.html` 的视觉语言
- 目标风格：专业、优雅、科技感
- 使用统一字体、间距、颜色体系
- 不能“粗糙原型感”

### 3.2 文案语言
- App 内界面文案使用 **英文**（用户后续可再加多语言）

### 3.3 Logo 要求
- 使用老板提供的最新 logo（透明背景 PNG 优先）
- 品牌区与状态区保持统一视觉

---

## 4. 信息架构（Tabs）

侧边栏主导航：
1. Chat
2. Agents
3. API Keys（原 Settings 改名）
4. Account（原 Premium 改名）

其中：
- 主界面（Chat/Agents/API Keys）不显示“余额/额度”信息
- 额度/套餐信息集中在 Account 页面展示

---

## 5. Chat 功能需求

1. 支持与 Agent 对话
2. 默认 Main Agent
3. 可切换不同 Agent 进行对话
4. 切换 Agent 后，右侧聊天区必须切换到对应 Agent 的会话内容（不可始终是 main）
5. 支持 Premium 拦截逻辑（超权益操作时弹窗）

---

## 6. Agent 管理需求

### 6.1 基础能力
- 新增 Agent
- 重命名 Agent
- 删除 Agent（main 不可删除）

### 6.2 对话切换位置
- 不使用“难理解”的侧边折叠 switcher 文案
- Agent 切换要放在用户易理解位置（Chat 区明确下拉）

### 6.3 Channels 配置
- 点击 Channels 打开配置弹窗
- 根据不同渠道动态展示不同参数输入项（不是统一一坨 JSON）
- 示例：Telegram 要提示 `bot token`
- 其他渠道按 OpenClaw 要求提供相应字段
- 保存后写入内嵌 OpenClaw 实例配置

---

## 7. API Keys 页面需求

### 7.1 表单要求
- 默认输入项：
  - Base URL
  - API Key
  - Model（可搜索下拉）
- 去掉：
  - custom provider 自由输入框
  - openai-completions 手工输入框

### 7.2 模型选择
- Model 下拉需包含 OpenClaw 默认支持模型
- 支持搜索

### 7.3 配置落地
- 用户提交后写入内嵌 OpenClaw 配置（openclaw.json）

---

## 8. Account（套餐）页面需求

展示内容：
1. 当前套餐信息（free/premium/pro）
2. 已发送消息统计
3. Free / Premium / Premium Pro 权益对比
4. 升级入口（Premium / Pro）

---

## 9. Premium 业务规则

### 9.1 对话额度
1. 新用户默认免费对话 10 次
2. 超过 10 次后，提示：
   - 输入自己的 API key
   - 或购买 Premium
3. 使用用户 API key 后，最多再用 300 次
4. 300 次后，必须购买 Premium 才能继续

### 9.2 拦截弹窗
当用户执行超出权益操作时弹窗，弹窗需展示：
- 不同套餐级别
- 对应价值点（如 Agent 数量、设备数、云同步、团队协作）

---

## 10. OpenClaw Gateway 与安全可见性

1. 界面显示本地网关安全运行状态：
   - 绿色状态点
   - 文案：本地安全运行
2. 状态区不要显示 IP 与端口
3. 状态区可展示 OpenClaw logo

---

## 11. Dashboard 访问策略

需求：尽可能禁用或隐藏 OpenClaw 原生 dashboard 直接访问路径，避免用户绕过 MyOpenClaw 界面。

说明：
- 需要基于 OpenClaw 官方能力确认可执行方式（配置层/路由层/入口层）
- 在不破坏核心功能前提下实现“默认不可见或不可达”

---

## 12. 开发流程约定

1. 每次修改一个版本后，默认自动启动新版本供验收
2. 重要改动后同步更新任务与进度文档
3. 打包按“simple + full + 时间戳目录”固定流程执行

---

## 13. 后续待完善项（建议）

1. Channels 动态表单完善（字段校验、帮助文本、必填提示）
2. API Keys 模型列表与 OpenClaw 官方配置深度对齐
3. Premium 购买回调闭环（支付成功自动升级）
4. Dashboard 禁用方案验证并落地
5. setup / loading 页面视觉统一为同一设计系统

---

## 14. 验收要点（Checklist）

- [ ] UI 全英文
- [ ] 视觉风格达到首页级别（非粗糙原型）
- [ ] Chat 可切换 Agent 且会话内容正确隔离
- [ ] Agent 支持新增/改名/删除
- [ ] Channels 按渠道动态参数配置并写入 openclaw.json
- [ ] API Keys 页支持 URL + API key + 可搜索模型下拉
- [ ] Account 页显示套餐与消息统计
- [ ] Premium 拦截与权益弹窗生效
- [ ] Gateway 绿色状态显示（不含 IP/端口）
- [ ] simple/full 双版本打包 + 时间戳归档
- [ ] 每次改动后自动启动新版本
