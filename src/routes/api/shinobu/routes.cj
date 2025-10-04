package lrr4cj.routes.api.shinobu

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * Shinobu API路由
 */
public func registerShinobuRoutes(router: JoyRouters) {
    // 获取Shinobu状态
    router.get("/api/shinobu", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        ShinobuController.getShinobuStatus(ctx)
    })
    
    // 停止Shinobu
    router.post("/api/shinobu/stop", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        ShinobuController.stopShinobu(ctx)
    })
    
    // 重启Shinobu
    router.post("/api/shinobu/restart", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        ShinobuController.restartShinobu(ctx)
    })
}