package lrr4cj.models

/**
 * Shinobu状态数据模型
 */
public class ShinobuStatus {
    public var success: Int32
    public var isAlive: Int32
    public var operation: String
    public var pid: Int64
    
    public init(success: Int32, isAlive: Int32, operation: String, pid: Int64) {
        this.success = success
        this.isAlive = isAlive
        this.operation = operation
        this.pid = pid
    }
    
    /**
     * 转换为JSON字符串
     */
    public func toJson(): String {
        return "{\"success\":${success},\"is_alive\":${isAlive},\"operation\":\"${operation}\",\"pid\":${pid}}"
    }
}

/**
 * Shinobu操作结果数据模型
 */
public class ShinobuResult {
    public var success: Int32
    public var operation: String
    public var newPid: Int64
    
    public init(success: Int32, operation: String, newPid: Int64) {
        this.success = success
        this.operation = operation
        this.newPid = newPid
    }
    
    /**
     * 转换为JSON字符串
     */
    public func toJson(): String {
        return "{\"success\":${success},\"operation\":\"${operation}\",\"new_pid\":${newPid}}"
    }
}

/**
 * 文件监视器状态数据模型
 */
public class FileWatcherStatus {
    public var isActive: Bool
    public var watcherCount: Int32
    public var lastEventTime: String
    public var totalEvents: Int64
    public var errorCount: Int64
    public var lastError: String
    
    public init(isActive: Bool, watcherCount: Int32, lastEventTime: String,
                totalEvents: Int64, errorCount: Int64, lastError: String) {
        this.isActive = isActive
        this.watcherCount = watcherCount
        this.lastEventTime = lastEventTime
        this.totalEvents = totalEvents
        this.errorCount = errorCount
        this.lastError = lastError
    }
    
    /**
     * 转换为JSON字符串
     */
    public func toJson(): String {
        return "{" +
            "\"isActive\":${isActive}," +
            "\"watcherCount\":${watcherCount}," +
            "\"lastEventTime\":\"${lastEventTime}\"," +
            "\"totalEvents\":${totalEvents}," +
            "\"errorCount\":${errorCount}," +
            "\"lastError\":\"${lastError}\"" +
            "}"
    }
}
