package lrr4cj.routes.api.database

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * API 数据库路由模块
 * 处理 /api/database 路径下的路由
 */
public class DatabaseRoutes {
    /**
     * 配置 API 数据库相关路由
     */
    public static func configure(router: JoyRouters) {
        // 获取数据库统计信息
        router.get("/api/database/stats", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.getDatabaseStats(ctx)
        })

        // 数据库健康检查
        router.get("/api/database/health", { ctx => DatabaseController.healthCheck(ctx) })

        // 获取数据库配置信息
        router.get("/api/database/config", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.getDatabaseConfig(ctx)
        })

        // 获取数据库备份
        router.get("/api/database/backup", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.getDatabaseBackup(ctx)
        })

        // 清理数据库
        router.post("/api/database/clean", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.cleanDatabase(ctx)
        })

        // 恢复数据库备份
        router.post("/api/database/restore", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.restoreDatabaseBackup(ctx)
        })

        // 重建搜索索引
        router.post("/api/database/reindex", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.rebuildSearchIndex(ctx)
        })

        // 删除数据库
        router.post("/api/database/drop", { ctx =>
            AuthMiddleware.requiredAuth(ctx)
            DatabaseController.dropDatabase(ctx)
        })
    }
}