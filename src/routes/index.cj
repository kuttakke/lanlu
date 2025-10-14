package lrr4cj.routes

import cjoy.*
import std.fs.*
import lrr4cj.routes.api.archives.*
import lrr4cj.routes.api.database.*
import lrr4cj.routes.api.search.*
import lrr4cj.routes.api.categories.*
import lrr4cj.routes.api.minion.*
import lrr4cj.routes.api.tankoubons.*
import lrr4cj.routes.api.shinobu.*
import lrr4cj.routes.api.*
import lrr4cj.controllers.*

/**
 * 路由注册模块
 * 负责统一注册所有路由
 */
public class Routes {
    /**
     * 注册所有路由
     */
    public static func register(router: JoyRouters) {
        // 注册 API 归档路由
        ArchiveRoutes.configure(router)
        
        // 注册 API 数据库路由
        DatabaseRoutes.configure(router)
        
        // 注册 API 搜索路由
        SearchRoutes.configure(router)
        
        // 注册 API 分类路由
        registerCategoryRoutes(router)
        
        // 注册 API Minion路由
        registerMinionRoutes(router)
        
        // 注册 API 单行本路由
        registerTankoubonRoutes(router)
        
        // 注册 API Shinobu路由
        registerShinobuRoutes(router)
        
        // 注册所有 API 路由（包括 /api/info）
        registerApiRoutes(router)
        
        // 注册前端页面路由
        registerFrontendRoutes(router)
        
        // 未来可以添加更多路由模块
        // AdminRoutes.configure(router)
        // ProductRoutes.configure(router)
    }
    
    /**
     * 注册前端页面路由
     */
    private static func registerFrontendRoutes(router: JoyRouters) {
        // 首页路由
        router.get("/", { ctx =>
            FrontendController.serveIndex(ctx)
        })
        
        // 搜索页面路由
        router.get("/search", { ctx =>
            FrontendController.servePath(ctx, "search")
        })
        
        // 搜索页面路由
        router.get("/reader", { ctx =>
            FrontendController.servePath(ctx, "reader")
        })

        // 搜索页面路由
        router.get("/archive", { ctx =>
            FrontendController.servePath(ctx, "archive")
        })
        
        // 处理Next.js RSC载荷文件（.txt文件）
        router.get("/*", { ctx =>
            FrontendController.serveStatic(ctx)
        })
    }
}