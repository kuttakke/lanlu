package lrr4cj.controllers

import cjoy.*
import lrr4cj.models.*
import lrr4cj.services.*

/**
 * Shinobu控制器
 */
public class ShinobuController {
    /**
     * 获取Shinobu状态
     */
    public static func getShinobuStatus(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let statusData = service.getStatus()
        let status = ShinobuStatus(statusData.success, statusData.isAlive, statusData.operation, statusData.pid)
        ctx.json(status.toJson())
    }
    
    /**
     * 停止Shinobu
     */
    public static func stopShinobu(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let success = service.stop()
        if (success) {
            let response = "{\"operation\":\"shinobu_stop\",\"success\":1}"
            ctx.json(response)
        } else {
            let response = "{\"operation\":\"shinobu_stop\",\"success\":0}"
            ctx.json(response)
        }
    }
    
    /**
     * 重启Shinobu
     */
    public static func restartShinobu(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let success = service.restart()
        let statusData = service.getStatus()
        let result = ShinobuResult(if (success) { 1 } else { 0 }, "shinobu_restart", statusData.pid)
        ctx.json(result.toJson())
    }
    
    /**
     * 启动Shinobu
     */
    public static func startShinobu(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let success = service.start()
        if (success) {
            let response = "{\"operation\":\"shinobu_start\",\"success\":1}"
            ctx.json(response)
        } else {
            let response = "{\"operation\":\"shinobu_start\",\"success\":0}"
            ctx.json(response)
        }
    }
    
    /**
     * 扫描档案文件
     */
    public static func scanArchives(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let result = service.scanArchives()
        let json = "{\"processed_count\":${result.processedCount},\"error_count\":${result.errorCount},\"total_found\":${result.totalFound}}"
        ctx.json(json)
    }
    
    /**
     * 获取Shinobu配置
     */
    public static func getShinobuConfiguration(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let config = service.getConfiguration()
        ctx.json(config.toJson())
    }
    
    /**
     * 获取当前任务状态
     */
    public static func getJobStatus(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let currentJobs = service.getCurrentJobCount()
        let maxJobs = service.getMaxConcurrentJobs()
        
        let status = "{" +
            "\"currentJobs\":${currentJobs}," +
            "\"maxJobs\":${maxJobs}," +
            "\"availableSlots\":${maxJobs - currentJobs}" +
            "}"
        
        ctx.json(status)
    }
    
    /**
     * 获取文件监视器状态
     */
    public static func getFileWatcherStatus(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let statusData = service.getFileWatcherStatus()
        let status = FileWatcherStatus(
            statusData.isActive,
            statusData.watcherCount,
            statusData.lastEventTime,
            statusData.totalEvents,
            statusData.errorCount,
            statusData.lastError
        )
        ctx.json(status.toJson())
    }
    
    /**
     * 重启文件监视器
     */
    public static func restartFileWatcher(ctx: JoyContext) {
        let service = ShinobuService.getInstance()
        let success = service.restartFileWatcher()
        
        if (success) {
            let response = "{\"operation\":\"file_watcher_restart\",\"success\":1}"
            ctx.json(response)
        } else {
            let response = "{\"operation\":\"file_watcher_restart\",\"success\":0}"
            ctx.json(response)
        }
    }
}
