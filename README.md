# Teach Agent React

一个基于 React 和 FastAPI 的智能教学助手系统，支持文件上传、代码分析和智能问答功能。

## 功能特点

- 支持多种文件格式上传（PDF、Word、Excel、图片等）
- 智能代码分析和解释
- 实时对话交互
- 响应式设计，支持移动端和桌面端
- 美观的用户界面

## 技术栈

### 前端
- React 18
- TypeScript
- Tailwind CSS
- Ant Design
- WebSocket

### 后端
- FastAPI
- Python 3.8+
- LangChain
- ChromaDB

## 启动方式

### 前端启动

1. 进入前端项目目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

前端服务将在 http://localhost:5173 运行

### 后端启动

1. 进入后端项目目录：
```bash
cd backend
```

2. 创建并激活虚拟环境（推荐）：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 启动后端服务：
```bash
uvicorn main:app --reload
```

后端服务将在 http://localhost:8000 运行

## 注意事项

1. 环境要求
   - Node.js 16+
   - Python 3.8+
   - 确保已安装所有必要的系统依赖

2. 文件上传
   - 支持的文件格式：PDF、Word、Excel、图片等
   - 单个文件大小限制：10MB
   - 建议上传清晰、格式规范的文件以获得最佳效果

3. 开发注意事项
   - 前端开发时注意保持 WebSocket 连接的稳定性
   - 后端服务需要保持运行状态
   - 确保环境变量配置正确

4. 常见问题解决
   - 如果遇到文件上传失败，请检查文件大小和格式
   - 如果对话响应较慢，请检查网络连接
   - 如果遇到 WebSocket 连接问题，可以尝试刷新页面

## 项目结构

```
Teach_Agent_React/
├── frontend/                # 前端项目目录
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── styles/        # 样式文件
│   │   └── App.tsx        # 主应用组件
│   └── package.json
└── backend/                # 后端项目目录
    ├── app/
    │   ├── routers/       # API 路由
    │   ├── services/      # 业务逻辑
    │   └── main.py        # 主程序入口
    └── requirements.txt
```

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License #