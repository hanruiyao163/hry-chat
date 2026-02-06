# HRY Chat

一个类 ChatGPT 的 AI 对话应用，支持 Markdown 渲染和自定义引用语法。

## 功能特性

- **对话界面**：类 ChatGPT 的聊天界面，支持会话管理
- **Markdown 渲染**：支持完整的 Markdown 语法，包括代码高亮、表格等
- **引用标注**：支持 `[^1]` 和 `[[文档名]]` 格式的引用，鼠标悬浮显示原文
- **流式响应**：打字机效果，实时显示 AI 回复
- **Mock 模式**：内置测试数据，方便 UI 开发和调试
- **状态持久化**：对话历史自动保存到本地存储

## 技术栈

### 前端
- Next.js 16 (App Router)
- React 19
- shadcn/ui
- Jotai (状态管理)
- react-markdown

### 后端
- FastAPI
- Pydantic v2
- SSE (Server-Sent Events)

## 项目结构

```
hry-chat/
├── frontend/                    # Next.js 前端
│   ├── app/                     # 页面
│   ├── components/
│   │   ├── chat/               # 聊天组件
│   │   ├── cards/              # 自定义卡片（扩展）
│   │   └── ui/                 # shadcn 组件
│   ├── lib/
│   │   ├── markdown/           # Markdown 渲染
│   │   ├── atoms.ts            # Jotai 状态
│   │   └── api.ts              # API 调用
│   └── types/                  # TypeScript 类型
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口
│   │   ├── routers/            # API 路由
│   │   ├── models/             # 数据模型
│   │   ├── services/           # 业务逻辑
│   │   └── core/               # 核心配置
│   └── pyproject.toml          # Python 依赖
│
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.12+
- uv (Python 包管理器)

### 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖（uv 会自动创建虚拟环境）
uv sync

# 启动服务（默认 Mock 模式）
uv run uvicorn app.main:app --reload --port 8000
```

后端服务启动后：
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务启动后访问: http://localhost:3000

## 环境配置

### 后端配置 (`backend/.env`)

```bash
# 应用配置
APP_NAME=HRY Chat
DEBUG=false

# LLM 配置
LLM_PROVIDER=openai          # openai / azure / anthropic / mock
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Mock 模式（设为 true 使用固定回复，用于 UI 测试）
MOCK_MODE=true

# CORS 配置
CORS_ORIGINS=["http://localhost:3000"]
```

### 前端配置 (`frontend/.env.local`)

```bash
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:8000

# 是否显示模型配置
NEXT_PUBLIC_SHOW_MODEL_CONFIG=true
```

## API 接口

### POST /api/chat
流式聊天接口，返回 SSE 事件流。

**请求体：**
```json
{
  "messages": [
    {"id": "1", "role": "user", "content": "你好", "created_at": "2024-01-01T00:00:00Z"}
  ],
  "conversation_id": "optional-id",
  "temperature": 0.7
}
```

**响应（SSE）：**
```
event: message
data: {"content": "你", "done": false}

event: message
data: {"content": "你好", "done": false}

event: message
data: {"content": "", "done": true, "message_id": "xxx", "citations": [...]}
```

### GET /api/config
获取应用配置（安全信息，不包含 API Key）。

**响应：**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "mock_mode": true,
  "app_name": "HRY Chat"
}
```

### 会话管理接口

- `GET /api/conversations` - 获取会话列表
- `POST /api/conversations` - 创建会话
- `GET /api/conversations/{id}` - 获取会话详情
- `PUT /api/conversations/{id}` - 更新会话
- `DELETE /api/conversations/{id}` - 删除会话

## 自定义引用语法

支持两种引用格式：

1. **脚注格式**: `[^1]`, `[^2]` 等
2. **双括号格式**: `[[文档名称]]`, `[[参考资料]]` 等

示例：
```markdown
根据官方文档[^1]，这个功能非常强大。
另外，[[技术报告]]中也提到了相关内容。
```

渲染后，引用会显示为带下划线的可交互元素，鼠标悬浮时显示原文气泡。

解析说明：
- 使用 remark AST 插件在解析阶段识别引用语法，再交给渲染组件处理。
- 引用解析只作用于普通文本节点，避免影响代码块/行内代码。
- 引用可以出现在加粗、斜体、链接等内联标记中，都会被正确识别。

## 开发模式

### Mock 模式

默认开启 Mock 模式（`MOCK_MODE=true`），后端会返回固定的测试内容，包含各种 Markdown 格式，方便测试 UI 渲染效果。

### 真实 API 模式

1. 设置 `MOCK_MODE=false`
2. 配置 `LLM_API_KEY` 为你的 API 密钥
3. 根据需要配置 `LLM_PROVIDER` 和 `LLM_MODEL`

## UI 注意事项

- Tooltip 外层不要设置 `overflow-hidden`，否则箭头会被裁切并出现延迟显示。若需要裁切内容，请把 `overflow-hidden` 放在内部容器上。
- 流式消息滚动建议：仅在接近底部时自动跟随，避免打断阅读；滚动锚点已关闭，减少内容增量时的跳动。

## 后续扩展

- [ ] 知识库管理页面
- [ ] 用户认证系统
- [ ] LangChain/LangGraph 智能体集成
- [ ] 多模型切换
- [ ] 自定义组件卡片系统
- [ ] 数据库持久化

## 许可证

MIT License
