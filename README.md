# 物理社积分系统

Material Design 风格的四组积分系统，包含社员登录、邀请码注册、管理员加减积分、积分流水公示和 EdgeOne KV 兼容的数据接口。

## 快速启动

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。后端默认运行在 `http://127.0.0.1:8791`。

默认管理员账号会在首次启动后自动创建：

```text
用户名：admin
密码：Physics@2026
```

可通过环境变量覆盖：

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=your-password npm run dev
```

## 数据存储

统一 KV 接口在 `server/storage/kvStore.js`。

- 本地开发：默认使用文件系统模拟 KV，数据位于 `data/kv`。
- EdgeOne Pages KV：设置 `KV_DRIVER=edgeone`，并将 KV 命名空间绑定到 `EDGEONE_KV_BINDING` 指定的变量名，默认是 `POINTS_KV`。

接口方法保持为 `put/get/delete/list`，与 EdgeOne Pages KV 运行时对象一致。业务层只依赖这个接口文件。

## 主要功能

- 四个固定组别，社员注册时通过邀请码自动归组。
- 社员可登录查看自己的积分。
- 管理员可创建邀请码、调整社员积分、维护社员组别与启用状态。
- 每一次加分或扣分都会进入公开流水，包含时间、社员、组别、变化、原因、详情和操作人。
- 排行榜和组别总分都由积分流水实时汇总。

## 常用脚本

```bash
npm run dev      # 同时启动后端和 Vite 前端
npm run server   # 只启动后端
npm run client   # 只启动前端
npm run build    # 构建前端
npm run start    # 生产模式启动 Node 服务
```
