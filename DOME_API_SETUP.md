# Dome API 设置指南

## 问题

如果看到 "Failed to fetch market summaries" 或 "Authentication required" 错误，说明需要配置 Dome API Key。

## 快速设置步骤

### 1. 获取 Dome API Key

1. 访问 [Dome API Dashboard](https://dashboard.domeapi.io)
2. 注册账号（免费）
3. 在 Dashboard 中获取你的 API Key

### 2. 配置环境变量

创建或编辑 `.env.local` 文件（在项目根目录）：

```bash
# Dome API Key (required for trading analysis)
DOME_API_KEY=your_api_key_here
```

**注意**：将 `your_api_key_here` 替换为你在 Dashboard 获取的实际 API Key。

### 3. 重启开发服务器

配置完成后，需要重启开发服务器：

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

或者使用代理：

```bash
export ALL_PROXY=http://127.0.0.1:9988 && npm run dev
```

### 4. 验证配置

重启后，再次访问 Trading Analysis 页面，应该可以正常加载数据了。

## API 限制

Dome API 免费层限制：
- **QPS**: 1 请求/秒
- **每10秒**: 10 个请求

这意味着：
- 单个钱包查询：约 1-2 秒
- 多个钱包查询：会串行执行，需要等待

## 故障排查

### 问题 1: 仍然显示认证错误

**检查**：
1. `.env.local` 文件是否存在
2. `DOME_API_KEY` 是否正确设置
3. 是否重启了开发服务器
4. API Key 是否有效（可以在 Dashboard 中验证）

### 问题 2: API Key 无效

**解决方案**：
- 在 Dashboard 中重新生成 API Key
- 确保复制完整的 Key（没有多余空格）

### 问题 3: 请求很慢

**原因**：
- 免费层限制为 1 QPS
- 如果钱包有大量交易历史，需要多次分页请求

**解决方案**：
- 这是正常现象，请耐心等待
- 可以考虑升级到 Dev 层（100 QPS）

## 测试 API Key

可以使用测试脚本验证 API Key：

```bash
# 设置 API Key
export DOME_API_KEY=your_api_key_here

# 运行测试
node scripts/test-dome-api.js 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
```

如果配置正确，应该返回交易数据而不是 403 错误。
