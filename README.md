# 基于 CJoy 的 MVC 架构示例

这是一个基于 CJoy 框架实现的真正 MVC（Model-View-Controller）架构示例项目，严格按照分层设计原则实现。

## 项目结构

```
src/
├── main.cj              # 主程序入口，仅负责路由配置和启动
├── models/
│   └── user.cj          # 用户数据模型（Model 层）
├── views/
│   └── response.cj      # 响应视图（View 层）
└── controllers/
    └── user_controller.cj  # 用户控制器（Controller 层）
```

## MVC 架构说明

### Model 层（数据模型）
- **位置**: [`src/models/user.cj`](src/models/user.cj)
- **职责**: 
  - 定义数据结构（`User` 类）
  - 提供数据访问方法（`UserModel` 类）
  - 处理数据的增删改查操作
  - **特点**: 纯数据层，不依赖任何其他层

### View 层（视图）
- **位置**: [`src/views/response.cj`](src/views/response.cj)
- **职责**:
  - 处理 HTTP 响应格式
  - 提供统一的响应方法（成功、错误、JSON）
  - **特点**: 纯视图层，只负责响应格式化

### Controller 层（控制器）
- **位置**: [`src/controllers/user_controller.cj`](src/controllers/user_controller.cj)
- **职责**:
  - 处理 HTTP 请求参数解析
  - 调用 Model 层进行数据操作
  - 调用 View 层进行响应处理
  - **特点**: 业务逻辑层，协调 Model 和 View

### 主程序（路由配置）
- **位置**: [`src/main.cj`](src/main.cj)
- **职责**:
  - 配置 URL 路由规则
  - 将请求映射到相应的 Controller 方法
  - **特点**: 仅负责路由，不包含业务逻辑

## 分层调用流程

```
HTTP 请求 → main.cj (路由) → UserController (业务逻辑) → UserModel (数据操作)
                                    ↓
                              ResponseView (响应格式化) → HTTP 响应
```

## API 端点

| 方法 | 路径 | 描述 | Controller 方法 |
|------|------|------|----------------|
| GET | `/` | 欢迎页面和 API 说明 | - |
| GET | `/users` | 获取所有用户 | `UserController.getAllUsers()` |
| GET | `/users/{id}` | 获取指定 ID 的用户 | `UserController.getUserById()` |
| POST | `/users?name=姓名&email=邮箱` | 创建新用户 | `UserController.createUser()` |
| PUT | `/users/{id}?name=姓名&email=邮箱` | 更新指定用户 | `UserController.updateUser()` |
| DELETE | `/users/{id}` | 删除指定用户 | `UserController.deleteUser()` |

## 运行项目

1. 编译项目：
```bash
cjpm build
```

2. 运行项目：
```bash
cjpm run
```

3. 访问应用：
打开浏览器或使用 API 工具访问 `http://127.0.0.1:8080`

## 示例用法

### 获取所有用户
```bash
curl http://127.0.0.1:8080/users
```

### 获取指定用户
```bash
curl http://127.0.0.1:8080/users/1
```

### 创建用户
```bash
curl -X POST "http://127.0.0.1:8080/users?name=测试用户&email=test@example.com"
```

### 更新用户
```bash
curl -X PUT "http://127.0.0.1:8080/users/1?name=更新姓名&email=update@example.com"
```

### 删除用户
```bash
curl -X DELETE http://127.0.0.1:8080/users/1
```

## 架构特点

### 1. 严格的分层设计
- **Model 层**: 只负责数据定义和访问，不依赖其他层
- **View 层**: 只负责响应格式化，不包含业务逻辑
- **Controller 层**: 协调 Model 和 View，处理业务逻辑
- **主程序**: 只负责路由配置，不包含业务逻辑

### 2. 清晰的职责分离
- 每一层都有明确的职责边界
- 层与层之间通过明确的接口调用
- 避免了循环依赖和职责混乱

### 3. 易于维护和扩展
- 新增功能只需在对应层添加代码
- 修改某一层不会影响其他层
- 便于单元测试和集成测试

### 4. RESTful API 设计
- 遵循 REST 设计原则
- 统一的响应格式
- 完整的 CRUD 操作

## 技术实现细节

### 包导入结构
```cangjie
// main.cj
import lrr4cj.controllers.*

// controllers/user_controller.cj
import lrr4cj.models.*
import lrr4cj.views.*
```

### 响应格式
- 成功响应: `{"code": 200, "message": "操作成功", "data": {...}}`
- 错误响应: `{"code": 400, "message": "错误信息", "data": null}`

## 注意事项

1. 数据存储在内存中，程序重启后数据会丢失
2. 字符串解析功能进行了简化，目前只支持数字 1-5 的解析
3. 为了简化实现，省略了错误处理和数据验证的细节

## 扩展建议

1. **数据持久化**: 添加文件或数据库存储
2. **中间件**: 实现认证、日志、错误处理中间件
3. **数据验证**: 添加输入参数验证
4. **更多模型**: 实现其他业务模型和控制器
5. **配置管理**: 添加配置文件支持
6. **单元测试**: 为各层添加单元测试

这个实现展示了如何在 CJoy 框架中构建真正的分层架构，为后续开发提供了良好的基础。