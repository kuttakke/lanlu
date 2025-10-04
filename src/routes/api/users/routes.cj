package lrr4cj.routes.api.users

import cjoy.*
import lrr4cj.controllers.*

/**
 * API 用户路由模块
 * 处理 /api/users 路径下的路由
 */
public class ApiUserRoutes {
    /**
     * 配置 API 用户相关路由
     */
    public static func configure(router: JoyRouters) {
        // 获取所有用户
        router.get("/api/users", { ctx => UserController.getAllUsers(ctx) })
        
        // 根据 ID 获取用户
        router.get("/api/users/{id}", { ctx => UserController.getUserById(ctx) })
        
        // 创建用户
        router.post("/api/users", { ctx => UserController.createUser(ctx) })
        
        // 更新用户
        router.put("/api/users/{id}", { ctx => UserController.updateUser(ctx) })
        
        // 删除用户
        router.delete("/api/users/{id}", { ctx => UserController.deleteUser(ctx) })
    }
}