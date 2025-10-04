package lrr4cj.routes.api.minion

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * Minion API路由
 */
public func registerMinionRoutes(router: JoyRouters) {
    // 获取所有任务
    router.get("/api/minion/tasks", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getTasks(ctx)
    })
    
    // 根据ID获取任务
    router.get("/api/minion/tasks/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getTaskById(ctx)
    })
    
    // 创建新任务
    router.post("/api/minion/tasks", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.createTask(ctx)
    })
    
    // 启动任务
    router.post("/api/minion/tasks/{id}/start", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.startTask(ctx)
    })
    
    // 停止任务
    router.post("/api/minion/tasks/{id}/stop", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.stopTask(ctx)
    })
    
    // 删除任务
    router.delete("/api/minion/tasks/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.deleteTask(ctx)
    })
    
    // 获取插件列表
    router.get("/api/minion/plugins", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPlugins(ctx)
    })
    
    // 执行插件
    router.post("/api/minion/execute", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        MinionController.executePlugin(ctx)
    })
}