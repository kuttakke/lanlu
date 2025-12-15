package lrr4cj.routes.api.tag_i18n

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * Tag i18n API 路由
 */
public func registerTagI18nRoutes(router: JoyRouters) {
    // 前端展示：按语言返回映射表
    router.get("/api/tags/i18n", { ctx =>
        TagI18nController.getTagI18nMap(ctx)
    })

    // 管理端：列表
    router.get("/api/admin/tag_i18n", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminList(ctx)
            case None => return
        }
    })

    // 管理端：合并分页（tag + zh/en）
    router.get("/api/admin/tag_i18n/merged", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminListMerged(ctx)
            case None => return
        }
    })

    // 管理端：列出当前系统所有tag（用于翻译界面直接铺开）
    router.get("/api/admin/tag_i18n/tags", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminListTags(ctx)
            case None => return
        }
    })

    // 管理端：保存/更新
    router.put("/api/admin/tag_i18n", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminUpsert(ctx)
            case None => return
        }
    })

    // 管理端：删除
    router.delete("/api/admin/tag_i18n", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminDelete(ctx)
            case None => return
        }
    })

    // 管理端：导出
    router.get("/api/admin/tag_i18n/export", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminExport(ctx)
            case None => return
        }
    })

    // 管理端：导入
    router.post("/api/admin/tag_i18n/import", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminImport(ctx)
            case None => return
        }
    })

    // 管理端：导入（两段式）- 先创建任务
    router.post("/api/admin/tag_i18n/import/init", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminImportInit(ctx)
            case None => return
        }
    })

    // 管理端：导入（两段式）- 上传分片
    router.put("/api/admin/tag_i18n/import/chunk", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminImportUploadChunk(ctx)
            case None => return
        }
    })

    // 管理端：导入（两段式）- 合并分片并入队执行
    router.post("/api/admin/tag_i18n/import/complete", { ctx =>
        match (AuthMiddleware.requireAdmin(ctx)) {
            case Some(_) => TagI18nController.adminImportUploadComplete(ctx)
            case None => return
        }
    })
}
