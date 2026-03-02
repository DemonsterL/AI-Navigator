# AI-Navigator

一款 AI 对话快速跳转浏览器扩展，用于提升多模型长对话场景下的浏览与定位效率，适用于 ChatGPT、Claude、Gemini、Kimi、通义千问、豆包、Khoj 等主流 AI 平台。

## 功能特点

### 核心功能
- **悬浮式导航面板** — 在页面侧边提供导航面板，默认半隐藏，鼠标悬停即可展开，不影响正常阅读
- **智能识别问题** — 自动识别并汇总用户提出的每一条问题，生成清晰的对话索引列表
- **快速跳转** — 点击任意条目即可平滑滚动至对应对话位置
- **自动高亮** — 实时检测当前可视区域，对正在阅读的对话项进行自动高亮，帮助用户保持上下文感知
- **搜索过滤** — 支持关键词搜索，快速定位历史对话
- **实时更新** — 自动检测新消息，对话持续增长时自动更新导航内容，无需刷新页面

### 面板控制
- **拖动移动** — 通过拖动手柄自由调整面板垂直位置
- **左右吸附** — 双击拖动手柄可切换面板到左侧或右侧，拖动释放时自动吸附到最近的边缘
- **固定面板** — 在设置中开启固定模式，面板将始终保持展开状态
- **透明度调节** — 支持 10%~100% 透明度无级调节，搭配毛玻璃背景模糊效果
- **面板缩放** — 通过上下边缘拖拽调整面板高度
- **输入框自动收缩** — 聚焦聊天输入框时面板自动收起，避免遮挡

### 智能特性
- **上下文用量估算** — 实时估算当前对话的 Token 用量，以进度条形式展示（绿/黄/橙/红四级颜色）
- **图片消息识别** — 图片消息自动显示为 `[图片]` 标记
- **完整文字提示** — 鼠标悬停导航条目时，以浮动提示框显示完整对话内容
- **深色模式** — 自动适配系统深色模式，同时支持各平台自身的主题切换
- **平台主题色** — 每个平台使用独立的高亮主题色，视觉风格与原平台保持一致
- **设置持久化** — 面板位置、边缘、透明度、高度、固定状态等设置自动保存，刷新页面后自动恢复
- **SPA 导航支持** — 自动检测页面 URL 变化，切换对话时自动刷新导航内容

## 支持平台

| 平台 | 网址 |
|------|------|
| **ChatGPT** | chatgpt.com / chat.openai.com |
| **Claude** | claude.ai |
| **Gemini** | gemini.google.com |
| **Kimi** | kimi.com / www.kimi.com / kimi.moonshot.cn |
| **通义千问** | tongyi.aliyun.com / qianwen.aliyun.com / qianwen.com |
| **豆包** | doubao.com / www.doubao.com |
| **Khoj** | app.khoj.dev |

## 安装方法

### Chrome / Edge
1. 打开浏览器，访问 `chrome://extensions/`（Edge 访问 `edge://extensions/`）
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择插件文件夹

### Firefox
1. 访问 `about:debugging#/runtime/this-firefox`
2. 点击 **加载临时附加组件**
3. 选择 `manifest.json` 文件

## 使用说明

- 插件会在对话页面侧边显示浮动导航面板
- 鼠标悬停时面板完全展开，移开后自动收起
- 点击条目可平滑跳转到对应对话位置
- 当前正在阅读的对话会自动高亮
- 使用搜索框可快速过滤历史对话
- 点击设置按钮（齿轮图标）可调整固定、透明度等选项
- 拖动面板顶部手柄可移动位置，双击可切换左右边缘

---

## 🔧 如何查看 DOM 选择器（详细教程）

如果插件无法识别用户消息，你需要手动查找正确的选择器。

### 步骤 1：打开开发者工具
- **快捷键**：按 `F12` 或 `Ctrl+Shift+I`（Mac: `Cmd+Option+I`）
- 或右键页面 → 选择「检查」/「Inspect」

### 步骤 2：选择元素
1. 点击开发者工具左上角的 **选择元素按钮**（箭头图标）或按 `Ctrl+Shift+C`
2. 在页面上点击你发送的 **用户消息**（不是 AI 回复）
3. 开发者工具会自动定位到该元素的 HTML 代码

### 步骤 3：分析元素特征
在 Elements 面板中，找到用户消息的父容器，观察它的特征：

```html
<!-- 示例：假设你看到这样的结构 -->
<div class="chat-message user-message" data-role="user">
  <div class="message-content">你好</div>
</div>
```

可以使用的选择器格式：
- **class 属性**：`.user-message` 或 `[class*="user"]`（包含 user 的类名）
- **data 属性**：`[data-role="user"]`
- **组合选择器**：`.chat-message.user-message`

### 步骤 4：测试选择器
在开发者工具的 Console 面板中输入：
```javascript
document.querySelectorAll('你的选择器')
```
如果返回的元素数量等于你发送的消息数，说明选择器正确。

### 步骤 5：更新代码
打开 `content.js`，找到对应平台的 `selectors` 数组，添加新选择器：
```javascript
kimi: {
  selectors: [
    '你找到的新选择器',  // 添加到这里
    // ... 其他选择器
  ],
}
```

> 💡 **调试提示**：在浏览器控制台输入 `aiNavDebug()` 可查看当前平台的选择器匹配情况。

---

## 📦 插件上架指南

### Chrome Web Store

1. **注册开发者账号**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - 需要支付 **$5 一次性注册费**（需要信用卡）

2. **准备材料**
   - 插件 ZIP 包（将整个文件夹打包）
   - 128×128 图标
   - 至少 1 张 1280×800 或 640×400 的截图
   - 详细描述（支持多语言）

3. **提交审核**
   - 登录后点击「New Item」上传 ZIP
   - 填写商品详情、截图、定价（免费）
   - 提交审核，通常 1-3 个工作日

### Microsoft Edge Add-ons

1. **注册开发者账号**
   - 访问 [Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge)
   - **免费注册**，使用 Microsoft 账号

2. **准备材料**
   - 与 Chrome 相同，Manifest V3 插件可直接使用
   - 需要隐私政策 URL（可用 GitHub Gist 创建）

3. **提交审核**
   - 上传 ZIP，填写信息
   - 审核时间约 1-7 个工作日

### Firefox Add-ons (AMO)

1. **注册开发者账号**
   - 访问 [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - **免费注册**，使用 Firefox 账号

2. **修改 manifest.json**
   Firefox 需要添加 `browser_specific_settings`：
   ```json
   {
     "browser_specific_settings": {
       "gecko": {
         "id": "ai-navigator@rey_leen.com",
         "strict_min_version": "109.0"
       }
     }
   }
   ```

3. **提交审核**
   - 上传 ZIP，可选择「Listed」（公开）或「Unlisted」（仅链接访问）
   - 自动审核通常几分钟，人工审核 1-2 周

---

## 许可证

MIT License
