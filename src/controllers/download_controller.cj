package lrr4cj.controllers

import std.collection.*
import stdx.encoding.json.*
import stdx.log.*
import cjoy.*
import lrr4cj.dao.*
import lrr4cj.models.*
import lrr4cj.services.*
import lrr4cj.utils.*

/**
 * 处理下载URL的控制器
 * 负责匹配下载插件、调用插件并拉取文件到归档目录
 */
public class DownloadController {
    private static func escapeJsonString(str: String): String {
        var escaped = str
        escaped = escaped.replace("\\", "\\\\")
        escaped = escaped.replace("\"", "\\\"")
        escaped = escaped.replace("\b", "\\b")
        escaped = escaped.replace("\f", "\\f")
        escaped = escaped.replace("\n", "\\n")
        escaped = escaped.replace("\r", "\\r")
        escaped = escaped.replace("\t", "\\t")
        return escaped
    }

    /**
     * POST /api/download_url
     * 请求体: { "url": "https://example.com/file.zip" }
     */
    public static func downloadFromUrl(ctx: JoyContext): Unit {
        let logger = getLogger("download_controller")

        try {
            let requestBody = ctx.readString()
            var url = ""

            if (requestBody.size > 0) {
                try {
                    let bodyJson = JsonValue.fromStr(requestBody)
                    match (bodyJson) {
                        case obj: JsonObject =>
                            let fields = obj.getFields()
                            if (fields.contains("url")) {
                                let urlVal = fields["url"]
                                url = urlVal.toString().trimAscii()
                            }
                        case _ => ()
                    }
                } catch (e: Exception) {
                    logger.warn("解析下载请求JSON失败", ("error", e.message))
                }
            }

            if (url.size == 0) {
                url = ctx.getQuery("url") ?? ""
            }

            if (url.size == 0) {
                ctx.status(400)
                ctx.json("{\"success\":0,\"error\":\"url is required\"}")
                return
            }

            // 进入TaskPool：创建任务并立即返回job id，前端通过 /api/minion/tasks/{id} 查询进度与结果
            // 任务标题不携带参数（URL等），避免在任务列表里泄露/污染标题
            let task = TaskModel.createTask("文件上传（在线下载）", "download_url")
            let paramsJson = if (requestBody.trimAscii().size > 0) {
                requestBody
            } else {
                "{\"url\":\"${escapeJsonString(url)}\"}"
            }
            TaskDao.updateTaskParameters(task.id, paramsJson)
            TaskIO.appendLog(task.id, "enqueued download_url url=${url}")

            // 唤醒 TaskPool 领取 pending（无轮询）
            TaskPoolService.getInstance().notifyTaskAvailable()

            let response = "{\"job\":${task.id},\"operation\":\"download_url\",\"success\":1,\"url\":\"${escapeJsonString(url)}\"}"
            ctx.json(response)
        } catch (e: Exception) {
            getLogger("download_controller").error("下载处理异常", ("error", e.message))
            ctx.status(500)
            ctx.json("{\"success\":0,\"error\":\"${e.message}\"}")
        }
    }



}
