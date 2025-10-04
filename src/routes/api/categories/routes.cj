package lrr4cj.routes.api.categories

import cjoy.*
import lrr4cj.controllers.*
import lrr4cj.middleware.*

/**
 * 分类API路由
 */
public func registerCategoryRoutes(router: JoyRouters) {
    // 获取所有分类
    router.get("/api/categories", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.getCategories(ctx)
    })
    
    // 根据ID获取分类
    router.get("/api/categories/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.getCategoryById(ctx)
    })
    
    // 创建新分类
    router.post("/api/categories", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.createCategory(ctx)
    })
    
    // 更新分类
    router.put("/api/categories/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.updateCategory(ctx)
    })
    
    // 删除分类
    router.delete("/api/categories/{id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.deleteCategory(ctx)
    })
    
    // 向分类添加档案
    router.post("/api/categories/{category_id}/archives/{archive_id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.addArchiveToCategory(ctx)
    })
    
    // 从分类移除档案
    router.delete("/api/categories/{category_id}/archives/{archive_id}", { ctx => 
        AuthMiddleware.requiredAuth(ctx)
        CategoryController.removeArchiveFromCategory(ctx)
    })
}