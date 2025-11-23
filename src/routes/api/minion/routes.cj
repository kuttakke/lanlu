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
    
    // 获取插件列表 (旧版兼容)
    router.get("/api/minion/plugins", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPlugins(ctx)
    })

    // 执行插件 (旧版兼容)
    router.post("/api/minion/execute", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.executePluginOld(ctx)
    })

    // ========== 插件管理API ==========

    // 获取所有插件详情
    router.get("/api/plugins", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getAllPlugins(ctx)
    })

    // 根据类型获取插件
    router.get("/api/plugins/{type}", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPluginsByType(ctx)
    })

    // 根据namespace获取插件详情
    router.get("/api/plugins/{namespace}/details", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPluginDetails(ctx)
    })

    // 执行插件
    router.post("/api/plugins/{namespace}/execute", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.executePlugin(ctx)
    })

    // 获取插件配置
    router.get("/api/plugins/{namespace}/config", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPluginConfig(ctx)
    })

    // 更新插件配置
    router.put("/api/plugins/{namespace}/config", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.updatePluginConfig(ctx)
    })

    // 启用或禁用插件
    router.put("/api/plugins/{namespace}/enabled", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.setPluginEnabled(ctx)
    })

    // 发现并注册插件
    router.post("/api/plugins/discover", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.discoverPlugins(ctx)
    })

    // ========== 新增Schema相关API路由 ==========

    // 获取插件配置Schema
    router.get("/api/plugins/{namespace}/schema", { ctx =>
        AuthMiddleware.requiredAuth(ctx)
        MinionController.getPluginSchema(ctx)
    })
}