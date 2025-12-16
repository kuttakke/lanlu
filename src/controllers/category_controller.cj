package lrr4cj.controllers

import cjoy.*
import lrr4cj.models.*
import lrr4cj.views.*

/**
 * 分类控制器
 */
public class CategoryController {
    /**
     * 获取所有分类
     */
    public static func getCategories(ctx: JoyContext) {
        let categories = CategoryModel.getAllCategories()
        
        // 手动构建JSON数组
        var categoriesJson = "["
        var isFirst = true
        for (category in categories) {
            if (!isFirst) {
                categoriesJson += ","
            }
            isFirst = false
            
            categoriesJson += "{"
            categoriesJson += "\"catid\":\"${category.id}\","
            categoriesJson += "\"name\":\"${category.name}\","
            categoriesJson += "\"search\":\"${category.search}\","
            categoriesJson += "\"pinned\":${category.isPinned},"
            
            // 构建档案数组
            categoriesJson += "\"archives\":["
            var archiveFirst = true
            for (archiveId in category.archives) {
                if (!archiveFirst) {
                    categoriesJson += ","
                }
                archiveFirst = false
                categoriesJson += "\"${archiveId}\""
            }
            categoriesJson += "]"
            
            categoriesJson += "}"
        }
        categoriesJson += "]"
        
        let result = "{\"operation\":\"get_categories\",\"data\":" + categoriesJson + ",\"success\":1}"
        ctx.json(result)
    }
    
    /**
     * 根据ID获取分类
     */
    public static func getCategoryById(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        let category = CategoryModel.getCategoryById(id)

        if (category.id.size > 0) {
            // 手动构建JSON对象
            var categoryJson = "{"
            categoryJson += "\"catid\":\"${category.id}\","
            categoryJson += "\"name\":\"${category.name}\","
            categoryJson += "\"search\":\"${category.search}\","
            categoryJson += "\"pinned\":${category.isPinned},"
            
            // 构建档案数组
            categoryJson += "\"archives\":["
            var archiveFirst = true
            for (archiveId in category.archives) {
                if (!archiveFirst) {
                    categoryJson += ","
                }
                archiveFirst = false
                categoryJson += "\"${archiveId}\""
            }
            categoryJson += "]"
            
            categoryJson += "}"
            
            let result = "{\"operation\":\"get_category\",\"data\":" + categoryJson + ",\"success\":1}"
            ctx.json(result)
        } else {
            ResponseView.errorJson(ctx, "Category not found")
        }
    }
    
    /**
     * 创建新分类
     */
    public static func createCategory(ctx: JoyContext) {
        // 从请求体获取参数
        let name = ctx.getQuery("name") ?? ""
        let search = ctx.getQuery("search") ?? ""
        
        if (name.size == 0) {
            ResponseView.errorJson(ctx, "Name is required")
            return
        }
        
        let category = CategoryModel.createCategory(name, search)
        
        // 手动构建JSON对象
        var categoryJson = "{"
        categoryJson += "\"catid\":\"${category.id}\","
        categoryJson += "\"name\":\"${category.name}\","
        categoryJson += "\"search\":\"${category.search}\","
        categoryJson += "\"pinned\":${category.isPinned},"
        
        // 构建档案数组
        categoryJson += "\"archives\":["
        var archiveFirst = true
        for (archiveId in category.archives) {
            if (!archiveFirst) {
                categoryJson += ","
            }
            archiveFirst = false
            categoryJson += "\"${archiveId}\""
        }
        categoryJson += "]"
        
        categoryJson += "}"
        
        let result = "{\"operation\":\"create_category\",\"data\":" + categoryJson + ",\"success\":1}"
        ctx.json(result)
    }
    
    /**
     * 更新分类
     */
    public static func updateCategory(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        let name = ctx.getQuery("name") ?? ""
        let search = ctx.getQuery("search") ?? ""
        
        if (name.size == 0) {
            ResponseView.errorJson(ctx, "Name is required")
            return
        }
        
        let success = CategoryModel.updateCategory(id, name, search)
        if (success) {
            ResponseView.successJson(ctx, "Category updated successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to update category")
        }
    }
    
    /**
     * 删除分类
     */
    public static func deleteCategory(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        
        let success = CategoryModel.deleteCategory(id)
        if (success) {
            ResponseView.successJson(ctx, "Category deleted successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to delete category")
        }
    }
    
    /**
     * 向分类添加档案
     */
    public static func addArchiveToCategory(ctx: JoyContext) {
        let categoryId = ctx.getParam("category_id") ?? ""
        let archiveId = ctx.getParam("archive_id") ?? ""
        
        let success = CategoryModel.addArchiveToCategory(categoryId, archiveId)
        if (success) {
            ResponseView.successJson(ctx, "Archive added to category successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to add archive to category")
        }
    }
    
    /**
     * 从分类移除档案
     */
    public static func removeArchiveFromCategory(ctx: JoyContext) {
        let categoryId = ctx.getParam("category_id") ?? ""
        let archiveId = ctx.getParam("archive_id") ?? ""
        
        let success = CategoryModel.removeArchiveFromCategory(categoryId, archiveId)
        if (success) {
            ResponseView.successJson(ctx, "Archive removed from category successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to remove archive from category")
        }
    }
}