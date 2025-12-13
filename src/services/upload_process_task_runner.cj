package lrr4cj.services

import stdx.encoding.json.*
import stdx.log.*
import std.convert.*
import lrr4cj.models.*
import lrr4cj.utils.*

/**
 * upload_process 任务执行器：对已落盘的archive文件进行入库/缩略图处理
 */
public class UploadProcessTaskRunner {
    public static func run(taskId: Int64, parameters: String): Unit {
        let logger = getLogger("upload_process_task")
        TaskIO.appendLog(taskId, "upload_process task started")

        let archivePath = parseField(parameters, "archive_path")
        let relativePath = parseField(parameters, "relative_path")
        let fileName = parseField(parameters, "filename")

        if (archivePath.size == 0) {
            fail(taskId, "archive_path is required")
            return
        }

        try {
            MinionModel.updateTaskProgress(taskId, 80, "Shinobu处理中")
            let shinobu = ShinobuService.getInstance()
            let processResult = shinobu.processUploadedArchiveFile(archivePath)
            if (!processResult.success) {
                let errorJson = "{\"success\":0,\"error\":\"${escapeJson(processResult.error)}\"}"
                MinionModel.failTask(taskId, processResult.error)
                TaskIO.writeOutput(taskId, errorJson)
                return
            }

            let okJson =
                "{\"success\":1,\"id\":\"${processResult.archiveId}\",\"relative_path\":\"${escapeJson(relativePath)}\",\"filename\":\"${escapeJson(fileName)}\"}"
            MinionModel.updateTaskProgress(taskId, 100, "处理完成")
            MinionModel.completeTask(taskId, "upload_process completed")
            TaskIO.writeOutput(taskId, okJson)
            TaskIO.appendLog(taskId, "upload_process task completed: archiveId=${processResult.archiveId}")
        } catch (e: Exception) {
            logger.error("upload_process exception", ("error", e.message))
            fail(taskId, e.message)
        }
    }

    private static func parseField(parameters: String, key: String): String {
        let trimmed = parameters.trimAscii()
        if (trimmed.size == 0) {
            return ""
        }
        try {
            let jsonVal = JsonValue.fromStr(trimmed)
            match (jsonVal) {
                case obj: JsonObject =>
                    let fields = obj.getFields()
                    if (fields.contains(key)) {
                        return fields[key].toString().trimAscii()
                    }
                case _ => ()
            }
        } catch (_: Exception) {}
        return ""
    }

    private static func escapeJson(s: String): String {
        var escaped = s
        escaped = escaped.replace("\\", "\\\\")
        escaped = escaped.replace("\"", "\\\"")
        escaped = escaped.replace("\b", "\\b")
        escaped = escaped.replace("\f", "\\f")
        escaped = escaped.replace("\n", "\\n")
        escaped = escaped.replace("\r", "\\r")
        escaped = escaped.replace("\t", "\\t")
        return escaped
    }

    private static func fail(taskId: Int64, message: String): Unit {
        let msg = if (message.size == 0) { "Unknown error" } else { message }
        TaskIO.appendLog(taskId, "FAILED: ${msg}")
        MinionModel.failTask(taskId, msg)
        TaskIO.writeOutput(taskId, "{\"success\":0,\"error\":\"${escapeJson(msg)}\"}")
    }
}

