package lrr4cj.routes.api.tankoubons

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * 单行本API路由
 */
public func registerTankoubonRoutes(router: JoyRouters) {
    // 获取所有单行本
    router.get("/api/tankoubons", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.getTankoubons(ctx)
    })
    
    // 根据ID获取单行本
    router.get("/api/tankoubons/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.getTankoubonById(ctx)
    })
    
    // 创建新单行本
    router.put("/api/tankoubons", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.createTankoubon(ctx)
    })
    
    // 更新单行本
    router.put("/api/tankoubons/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.updateTankoubon(ctx)
    })
    
    // 删除单行本
    router.delete("/api/tankoubons/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.deleteTankoubon(ctx)
    })
    
    // 向单行本添加档案
    router.put("/api/tankoubons/{id}/{archive}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.addArchiveToTankoubon(ctx)
    })
    
    // 从单行本移除档案
    router.delete("/api/tankoubons/{id}/{archive}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        TankoubonController.removeArchiveFromTankoubon(ctx)
    })
}