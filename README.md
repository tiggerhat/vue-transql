# vue-transql

Excel数据导入数据库工具，支持表结构缓存和快速导入。

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
## 功能特性

- 数据库连接配置管理
- 表结构自动缓存，避免重复加载
- Excel文件上传与预览
- 智能字段映射
- SQL生成与执行
- 工作记录保存与管理

## 使用说明

1. 配置数据库连接并测试连接
2. 加载表结构（只需加载一次，后续会自动缓存）
3. 选择目标表，可直接进入Excel导入页面
4. 上传Excel文件并预览数据
5. 进入字段映射页面，配置字段映射关系
6. 生成SQL并执行或保存工作记录