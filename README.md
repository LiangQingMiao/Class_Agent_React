# 课程教材更新智能体

这是一个基于Qwen实现的课程教材更新智能体。

## 功能特点

-智能辅助更新教材文档内容
-编写教学教案，提供专业建议
-深入解析教材内容，解答教学疑问


## 安装步骤

1. 克隆项目到本地
2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
3. 在项目根目录创建 `.env` 文件，并添加你的通义千问API密钥：
   ```
   DASHSCOPE_API_KEY=your_api_key_here
   ```

## 使用方法

运行以下命令启动对话Agent：
```bash
 python .\websocket_server.py
```

- 输入问题与Agent对话
- 输入"退出"、"exit"或"quit"结束对话

## 注意事项

- 请确保你有有效的通义千问API密钥
- API密钥请妥善保管，不要泄露
- 建议在虚拟环境中运行项目 