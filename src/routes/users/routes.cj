package lrr4cj.routes.users

import cjoy.*
import lrr4cj.controllers.*

/**
 * 用户路由模块
 * 处理 /users 路径下的路由
 */
public class UserRoutes {
    /**
     * 配置用户相关路由
     */
    public static func configure(router: JoyRouters) {
        // 获取所有用户
        router.get("/users", { ctx => UserController.getAllUsers(ctx) })
        
        // 根据 ID 获取用户
        router.get("/users/{id}", { ctx => UserController.getUserById(ctx) })
        
        // 创建用户
        router.post("/users", { ctx => UserController.createUser(ctx) })
        
        // 更新用户
        router.put("/users/{id}", { ctx => UserController.updateUser(ctx) })
        
        // 删除用户
        router.delete("/users/{id}", { ctx => UserController.deleteUser(ctx) })
    }
}