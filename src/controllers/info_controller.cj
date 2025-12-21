package lrr4cj.controllers

import cjoy.*
import std.time.*
import lrr4cj.dao.*
import lrr4cj.services.*

/**
 * Info API 控制器
 * 处理 /api/info 接口
 */
public class InfoController {
    /**
     * 获取服务器信息
     */
    public static func getServerInfo(ctx: JoyContext) {
        try {
            // 获取当前时间戳
            let currentTime = DateTime.nowUTC().toUnixTimeStamp().toSeconds()

            // 获取档案总数
            let (_, totalArchives) = ArchiveDao.searchArchives("", "", 0, 0, "title", "asc")

            // 获取总阅读页数（这里使用模拟数据，实际应该从数据库获取）
            let totalPagesRead = 0

            // 从系统设置获取服务器名称和欢迎消息
            let serverName = SystemSettingsService.getString("SERVER_NAME")
            let serverMotd = SystemSettingsService.getString("SERVER_MOTD")

            // 构建服务器信息响应
            var serverInfo = "{"
            serverInfo += "\"archives_per_page\":100,"
            serverInfo += "\"cache_last_cleared\":${currentTime},"
            serverInfo += "\"debug_mode\":true,"
            serverInfo += "\"has_password\":false,"
            serverInfo += "\"motd\":\"${escapeJson(serverMotd)}\","
            serverInfo += "\"name\":\"${escapeJson(serverName)}\","
            serverInfo += "\"nofun_mode\":false,"
            serverInfo += "\"server_resizes_images\":false,"
            serverInfo += "\"server_tracks_progress\":true,"
            serverInfo += "\"total_archives\":${totalArchives},"
            serverInfo += "\"total_pages_read\":${totalPagesRead},"
            serverInfo += "\"version\":\"0.9.50\","
            serverInfo += "\"version_desc\":\"LANraragi for Cangjie - Initial Release\","
            serverInfo += "\"version_name\":\"Cangjie\""
            serverInfo += "}"

            ctx.json(serverInfo)
        } catch (ex: Exception) {
            let errorResponse = "{\"error\":\"Failed to get server info: ${ex.message}\"}"
            ctx.status(500).json(errorResponse)
        }
    }

    /**
     * 辅助方法：转义JSON字符串
     */
    private static func escapeJson(value: String): String {
        var escaped = value
        escaped = escaped.replace("\\", "\\\\")
        escaped = escaped.replace("\"", "\\\"")
        escaped = escaped.replace("\b", "\\b")
        escaped = escaped.replace("\f", "\\f")
        escaped = escaped.replace("\n", "\\n")
        escaped = escaped.replace("\r", "\\r")
        escaped = escaped.replace("\t", "\\t")
        return escaped
    }
}
