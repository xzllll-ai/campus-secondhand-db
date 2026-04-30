# 校园二手交易平台数据库系统

在线访问网址：部署到 Vercel 后填写，例如 `https://你的项目名.vercel.app`

这是一个适合 GitHub + Vercel 部署的静态网站项目，完成数据库大作业除“第五部分提交内容”以外的功能展示。页面包含首页、商品列表、用户列表、订单列表、查询展示、聚合分组、视图、数据操作和购买业务逻辑。

## 本地运行

```bash
npm install
npm run dev
```

如果不想安装依赖，也可以直接打开 `public/index.html` 查看页面。

## GitHub + Vercel 部署步骤

1. 在 GitHub 新建仓库，例如 `campus-secondhand-db`。
2. 将本项目全部文件提交并推送到 GitHub。
3. 打开 Vercel，选择 `Add New Project`，导入刚才的 GitHub 仓库。
4. Framework Preset 选择 `Other` 或保持默认。
5. Build Command 使用 `npm run build`。
6. Output Directory 填写 `public`。
7. 点击 Deploy，部署完成后复制 Vercel 提供的网址。

## 作业功能对应

- 数据库定义：见 `docs/schema-and-queries.sql`，包含数据库、三张表、主键、外键、非空、唯一和检查约束。
- 初始数据：页面和 SQL 均插入 PDF 中的 User、Item、Orders 初始数据。
- 数据操作：页面支持插入新商品、修改商品价格、删除未售商品，刷新后数据保留。
- 基本查询：页面按钮展示未售商品、价格大于 30、生活用品类、u001 发布的商品。
- 连接查询：页面按钮展示已售商品买家、订单详情、u001 商品是否被购买。
- 聚合分组：页面展示商品总数、每类商品数量、平均价格、发布最多商品的用户。
- 视图：页面展示已售商品视图和未售商品视图，SQL 文件中也包含 `CREATE VIEW`。
- 业务逻辑：页面支持购买商品，成功时同时新增订单并修改商品状态，已售商品不能再次购买。
- 安全性、并发与恢复：页面底部给出文字说明。

## 说明

静态网站部署后无需服务器运行环境即可访问。页面中的操作会保存到浏览器本地存储，满足演示时刷新页面可看到变化；完整 SQL 实现在 `docs/schema-and-queries.sql` 中，适合放入项目说明或数据库工具中执行。
