package lrr4cj.controllers

import cjoy.*
import lrr4cj.models.*
import lrr4cj.views.*

/**
 * Minion控制器
 */
public class MinionController {
    /**
     * 获取所有任务
     */
    public static func getTasks(ctx: JoyContext) {
        let tasks = MinionModel.getAllTasks()
        var result = "["
        for (i in 0..tasks.size) {
            if (i > 0) { result += "," }
            result += tasks[i].toJson()
        }
        result += "]"
        
        ctx.json(result)
    }
    
    /**
     * 根据ID获取任务
     */
    public static func getTaskById(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        let task = MinionModel.getTaskById(id)
        
        if (task.id.size == 0) {
            ResponseView.errorJson(ctx, "Task not found")
            return
        }
        
        ctx.json(task.toJson())
    }
    
    /**
     * 创建新任务
     */
    public static func createTask(ctx: JoyContext) {
        let name = ctx.getQuery("name") ?? ""
        
        if (name.size == 0) {
            ResponseView.errorJson(ctx, "Name is required")
            return
        }
        
        let task = MinionModel.createTask(name)
        ctx.json(task.toJson())
    }
    
    /**
     * 启动任务
     */
    public static func startTask(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        
        let success = MinionModel.startTask(id)
        if (success) {
            ResponseView.successJson(ctx, "Task started successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to start task")
        }
    }
    
    /**
     * 停止任务
     */
    public static func stopTask(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        
        let success = MinionModel.stopTask(id)
        if (success) {
            ResponseView.successJson(ctx, "Task stopped successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to stop task")
        }
    }
    
    /**
     * 删除任务
     */
    public static func deleteTask(ctx: JoyContext) {
        let id = ctx.getParam("id") ?? ""
        
        let success = MinionModel.deleteTask(id)
        if (success) {
            ResponseView.successJson(ctx, "Task deleted successfully")
        } else {
            ResponseView.errorJson(ctx, "Failed to delete task")
        }
    }
    
    /**
     * 获取插件列表
     */
    public static func getPlugins(ctx: JoyContext) {
        let plugins = MinionModel.getPlugins()
        var result = "["
        for (i in 0..plugins.size) {
            if (i > 0) { result += "," }
            result += "\"${plugins[i]}\""
        }
        result += "]"
        
        ctx.json(result)
    }
    
    /**
     * 执行插件
     */
    public static func executePlugin(ctx: JoyContext) {
        let plugin = ctx.getQuery("plugin") ?? ""
        let url = ctx.getQuery("url") ?? ""
        
        if (plugin.size == 0 || url.size == 0) {
            ResponseView.errorJson(ctx, "Plugin and URL are required")
            return
        }
        
        let task = MinionModel.executePlugin(plugin, url)
        ctx.json(task.toJson())
    }
}