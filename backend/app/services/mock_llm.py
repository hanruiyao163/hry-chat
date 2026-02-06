"""
Mock LLM 服务
用于 UI 开发测试，返回固定的 Markdown 内容
"""
import asyncio
import random
from typing import AsyncGenerator


# Mock 响应列表，包含各种 Markdown 格式用于测试渲染
MOCK_RESPONSES = [
    """## 深入理解现代前端架构设计

感谢你的问题！让我详细为你解答关于现代前端架构的核心概念和最佳实践。

### 1. 架构概述

根据官方文档[^1]，现代前端架构主要由以下几个核心部分组成：

- **状态管理层**：负责应用数据的集中管理
- **视图层**：负责 UI 渲染和用户交互
- **服务层**：负责与后端 API 通信
- **路由层**：负责页面导航和权限控制

### 2. 状态管理详解

根据[[技术报告]]，状态管理是现代前端应用的核心。以下是一个典型的状态管理示例：

```typescript
// 使用 Jotai 进行状态管理
import { atom, useAtom } from 'jotai';

// 定义原子状态
export const userAtom = atom<User | null>(null);
export const themeAtom = atom<'light' | 'dark'>('light');

// 派生状态
export const isLoggedInAtom = atom((get) => {
  return get(userAtom) !== null;
});

```

### 3. 组件设计原则

根据最新研究[^2]，良好的组件设计应遵循以下原则：

1. **单一职责原则**：每个组件只负责一个功能
2. **可组合性**：组件应易于组合和复用
3. **可测试性**：组件应易于单元测试
4. **性能优化**：避免不必要的重渲染

> 💡 **最佳实践提示**：始终将业务逻辑与 UI 逻辑分离，使用 Custom Hooks 封装可复用的逻辑。

### 4. 性能优化策略

根据[[最新研究]]的建议，以下是关键的性能优化策略：

| 优化策略 | 效果 | 适用场景 |
|---------|------|---------|
| 代码分割 | 减少首屏加载时间 | 大型应用 |
| 虚拟列表 | 处理大量数据 | 长列表页面 |
| 图片懒加载 | 减少带宽消耗 | 图片密集页面 |
| Memo 化 | 避免重复计算 | 复杂计算场景 |

### 5. 总结

综上所述[^3]，构建一个优秀的前端架构需要综合考虑：

- 清晰的代码组织结构
- 合理的状态管理方案
- 完善的性能优化策略
- 良好的开发体验

希望这个回答对你有帮助！如果有任何疑问，欢迎继续讨论。
""",
    """## 全栈开发最佳实践指南

非常好的问题！让我从多个角度为你分析全栈开发的关键要点。

### 1. 后端架构设计

根据官方文档[^1]，一个健壮的后端架构应该包含以下层次：

**服务层架构**：
- API 网关层：负责请求路由和认证
- 业务逻辑层：核心业务处理
- 数据访问层：数据库操作封装
- 缓存层：提升读取性能

```python
# FastAPI 服务示例
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

app = FastAPI()

```

### 2. 数据库设计原则

根据[[技术报告]]，数据库设计需要注意以下几点：

1. **规范化**：减少数据冗余
2. **索引优化**：提升查询性能
3. **分表策略**：处理大数据量
4. **读写分离**：提升并发能力

> ⚠️ **注意**：过度规范化可能导致查询复杂度增加，需要根据实际场景权衡。

### 3. API 设计规范

根据性能优化指南[^2]，RESTful API 设计应遵循：

| HTTP 方法 | 用途 | 示例 |
|----------|------|------|
| GET | 查询资源 | `GET /users/{id}` |
| POST | 创建资源 | `POST /users` |
| PUT | 更新资源 | `PUT /users/{id}` |
| DELETE | 删除资源 | `DELETE /users/{id}` |

### 4. 安全性考虑

根据[[最新研究]]，安全性是全栈开发的重中之重：

- **认证机制**：JWT Token、OAuth 2.0
- **授权控制**：RBAC 权限模型
- **数据加密**：HTTPS、敏感数据加密存储
- **输入验证**：防止 SQL 注入、XSS 攻击

```typescript
// JWT 认证中间件示例
import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

### 5. 部署与运维

最后[^3]，关于部署和运维的建议：

- 使用 Docker 容器化部署
- 配置 CI/CD 自动化流程
- 建立监控和告警系统
- 定期进行性能测试和安全审计

希望这些内容能够帮助你构建更好的全栈应用！
""",
]

# 测试用的引用数据
MOCK_CITATIONS = {
    "1": {
        "id": "1",
        "title": "官方文档 - 快速入门指南",
        "content": "本文档介绍了如何快速开始使用我们的产品。首先，您需要安装必要的依赖。推荐使用 npm 或 yarn 进行包管理，确保 Node.js 版本 >= 18.0。安装完成后，运行 npm run dev 启动开发服务器。",
        "source": "docs.example.com"
    },
    "2": {
        "id": "2", 
        "title": "性能优化最佳实践",
        "content": "通过以下方法可以显著提升系统性能：1. 使用 Redis 缓存热点数据 2. 优化数据库查询，添加合适的索引 3. 使用异步处理耗时操作 4. 实施代码分割减少首屏加载时间 5. 使用 CDN 加速静态资源分发。",
        "source": "wiki.example.com"
    },
    "3": {
        "id": "3",
        "title": "架构设计模式总结",
        "content": "现代应用架构设计需要考虑可扩展性、可维护性和可测试性。推荐采用分层架构，将表现层、业务逻辑层和数据访问层清晰分离。使用依赖注入提升代码的可测试性，使用事件驱动架构处理异步场景。",
        "source": "architecture-patterns.dev"
    },
    "技术报告": {
        "id": "tech-report",
        "title": "2024年度技术趋势报告",
        "content": "本报告总结了过去一年的技术发展趋势，包括AI、云计算、边缘计算等领域的最新进展。特别值得关注的是大语言模型在代码生成和辅助开发方面的突破性应用，以及 WebAssembly 在高性能计算领域的广泛采用。",
        "source": "research.example.com"
    },
    "最新研究": {
        "id": "latest-research",
        "title": "前沿技术研究成果",
        "content": "研究团队在自然语言处理领域取得重大突破，新模型在多项基准测试中达到领先水平。该模型采用了创新的注意力机制和高效的训练策略，在保持高精度的同时显著降低了推理延迟和内存占用。",
        "source": "arxiv.org"
    }
}


class MockLLMService:
    """Mock LLM 服务类"""
    
    def __init__(self):
        self.response_index = 0
    
    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """
        模拟流式返回内容
        
        Args:
            messages: 消息历史（在Mock模式下忽略）
            
        Yields:
            内容片段
        """
        # 选择一个响应（轮询或随机）
        response = MOCK_RESPONSES[self.response_index % len(MOCK_RESPONSES)]
        self.response_index += 1
        
        # 模拟打字机效果，逐字符或逐词返回
        words = response.split(' ')
        for i, word in enumerate(words):
            # 添加空格（除了第一个词）
            if i > 0:
                yield ' '
            yield word
            # 随机延迟模拟真实打字效果
            await asyncio.sleep(random.uniform(0.02, 0.08))
    
    def get_citations(self) -> dict:
        """获取引用数据"""
        return MOCK_CITATIONS


# 单例实例
mock_llm_service = MockLLMService()
