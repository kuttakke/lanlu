package lrr4cj.services

import std.collection.*
import stdx.encoding.json.*
import stdx.log.*
import std.fs.*
import std.time.DateTime
import lrr4cj.dao.*
import lrr4cj.models.*
import lrr4cj.utils.*

/**
 * metadata_plugin 任务执行器（运行在TaskPool中）
 * 运行 metadata 插件并将返回的 title/tags/summary 写回归档
 */
public class MetadataPluginTaskRunner {
    public static func run(taskId: Int64, parameters: String): Unit {
        TaskIO.appendLog(taskId, "metadata_plugin task started")
        MinionModel.updateTaskProgress(taskId, 1, "元数据插件任务开始")

        let (archiveId, namespace, param) = parseParameters(parameters)
        if (archiveId.size == 0 || namespace.size == 0) {
            fail(taskId, "archive_id and namespace are required")
            return
        }

        // 获取归档并验证存在
        let archive = ArchiveDao.getArchiveById(archiveId)
        if (archive.id.size == 0) {
            fail(taskId, "Archive not found")
            return
        }

        // 获取插件并验证类型
        var plugin = PluginDao.getPluginByNamespace(namespace)
        if (plugin.namespace.size == 0) {
            fail(taskId, "Plugin not found")
            return
        }
        if (plugin.plugin_type != "Metadata") {
            fail(taskId, "Plugin is not a Metadata plugin")
            return
        }
        if (!plugin.enabled) {
            // 与 download_url 保持一致：若匹配到禁用插件，自动启用一次
            plugin.enabled = true
            PluginDao.setEnabled(plugin.namespace, true)
        }

        MinionTaskDao.updateTaskPluginNamespace(taskId, plugin.namespace)
        TaskIO.appendLog(taskId, "plugin=${plugin.namespace}")

        MinionModel.updateTaskProgress(taskId, 10, "准备插件脚本")
        if (!ensurePluginScriptReady(plugin, "Metadata")) {
            fail(taskId, "Failed to prepare metadata plugin file")
            return
        }

        // 若需要登录插件，提前准备脚本（由 PluginService 执行）
        let effectiveLoginFrom = plugin.login_from.trimAscii()
        if (effectiveLoginFrom.size > 0) {
            let loginPlugin = PluginDao.getPluginByNamespace(effectiveLoginFrom)
            if (loginPlugin.namespace.size == 0) {
                fail(taskId, "Login plugin not found: ${effectiveLoginFrom}")
                return
            }
            if (!ensurePluginScriptReady(loginPlugin, "Login")) {
                fail(taskId, "Failed to prepare login plugin file")
                return
            }
        }

        MinionModel.updateTaskProgress(taskId, 30, "执行元数据插件")

        let (oneshotOpt, extraParamsOpt) = splitParam(param)

        let pluginService = PluginService.getInstance()
        let execResult = pluginService.executeMetadataPlugin(plugin, archiveId, oneshotOpt, extraParamsOpt)
        if (!execResult.success) {
            fail(taskId, "Plugin execution failed: ${execResult.error}")
            return
        }

        let output = match (execResult.data.get("output")) {
            case Some(v) => v
            case None => ""
        }
        TaskIO.appendLog(taskId, "plugin output: ${output}")

        MinionModel.updateTaskProgress(taskId, 70, "解析并写回元数据")
        let parsed = parseMetadataOutput(output)
        if (!parsed.success) {
            fail(taskId, parsed.error)
            return
        }

        let newTitle = parsed.title
        let newTags = parsed.tags
        let newSummary = parsed.summary

        // 写回 archives 表
        var archiveToUpdate = ArchiveDao.getArchiveById(archiveId)
        if (archiveToUpdate.id.size == 0) {
            fail(taskId, "Archive not found when updating")
            return
        }

        var changed = false
        if (newTitle.size > 0) {
            archiveToUpdate.title = newTitle
            changed = true
        }
        if (newSummary.size > 0) {
            archiveToUpdate.summary = newSummary
            changed = true
        }
        if (changed) {
            archiveToUpdate.updated_at = DateTime.now().toString()
            let ok = ArchiveDao.update(archiveToUpdate)
            if (!ok) {
                fail(taskId, "Failed to update archive metadata")
                return
            }
        }

        // 写回 tags
        if (newTags.size > 0) {
            let tagOk = TagDao.updateArchiveTags(archiveId, newTags)
            if (!tagOk) {
                TaskIO.appendLog(taskId, "WARN: failed to update tags")
            }
        }

        MinionModel.updateTaskProgress(taskId, 100, "元数据插件执行完成")
        let resultJson =
            "{" +
            "\"success\":1," +
            "\"archive_id\":\"${escapeJson(archiveId)}\"," +
            "\"namespace\":\"${escapeJson(plugin.namespace)}\"," +
            "\"title\":\"${escapeJson(newTitle)}\"," +
            "\"summary\":\"${escapeJson(newSummary)}\"," +
            "\"tags\":\"${escapeJson(newTags)}\"," +
            "\"plugin_output\":\"${escapeJson(output)}\"" +
            "}"
        MinionModel.completeTask(taskId, "metadata_plugin completed")
        TaskIO.writeOutput(taskId, resultJson)
    }

    private static func parseParameters(parameters: String): (String, String, String) {
        let trimmed = parameters.trimAscii()
        if (trimmed.size == 0) {
            return ("", "", "")
        }

        var archiveId = ""
        var namespace = ""
        var param = ""

        try {
            let jsonVal = JsonValue.fromStr(trimmed)
            match (jsonVal) {
                case obj: JsonObject =>
                    let fields = obj.getFields()
                    if (fields.contains("archive_id")) {
                        archiveId = jsonValueToString(fields["archive_id"]).trimAscii()
                    } else if (fields.contains("id")) {
                        archiveId = jsonValueToString(fields["id"]).trimAscii()
                    } else if (fields.contains("arcid")) {
                        archiveId = jsonValueToString(fields["arcid"]).trimAscii()
                    } else if (fields.contains("archiveId")) {
                        archiveId = jsonValueToString(fields["archiveId"]).trimAscii()
                    }
                    if (fields.contains("namespace")) {
                        namespace = jsonValueToString(fields["namespace"]).trimAscii()
                    }
                    if (fields.contains("param")) {
                        // param 允许 string / object
                        let pv = fields["param"]
                        match (pv) {
                            case s: JsonString => param = s.getValue()
                            case o: JsonObject => param = o.toString()
                            case _ => param = pv.toString()
                        }
                    }
                case _ => ()
            }
        } catch (_: Exception) {}

        return (archiveId, namespace, param.trimAscii())
    }

    private static func jsonValueToString(value: JsonValue): String {
        match (value) {
            case s: JsonString => return s.getValue()
            case _ => return value.toString()
        }
    }

    /**
     * param 若是 JSON 对象字符串，则作为 extra --params；否则作为 oneshot 参数
     */
    private static func splitParam(param: String): (Option<String>, Option<String>) {
        let trimmed = param.trimAscii()
        if (trimmed.size == 0) {
            return (Option.None, Option.None)
        }

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                let jsonVal = JsonValue.fromStr(trimmed)
                match (jsonVal) {
                    case _: JsonObject =>
                        return (Option.None, Option<String>.Some(trimmed))
                    case _ => ()
                }
            } catch (_: Exception) {}
        }

        return (Option<String>.Some(trimmed), Option.None)
    }

    private static func parseMetadataOutput(output: String): ParsedMetadataResult {
        if (output.trimAscii().size == 0) {
            return ParsedMetadataResult(false, "Plugin returned empty output", "", "", "")
        }

        try {
            let jsonVal = JsonValue.fromStr(output)
            match (jsonVal) {
                case obj: JsonObject =>
                    if (!getJsonBool(obj, "success")) {
                        let err = getJsonString(obj, "error")
                        return ParsedMetadataResult(false, if (err.size > 0) { err } else { "Plugin returned success=false" }, "", "", "")
                    }
                    var title = ""
                    var summary = ""
                    var tags = ""
                    let fields = obj.getFields()
                    if (fields.contains("data")) {
                        match (fields["data"]) {
                            case dataObj: JsonObject =>
                                title = getJsonString(dataObj, "title")
                                summary = getJsonString(dataObj, "summary")
                                tags = getJsonString(dataObj, "tags")
                            case _ => ()
                        }
                    }
                    return ParsedMetadataResult(true, "", title, summary, tags)
                case _ =>
                    return ParsedMetadataResult(false, "Plugin output is not a JSON object", "", "", "")
            }
        } catch (e: Exception) {
            return ParsedMetadataResult(false, "Failed to parse plugin output: ${e.message}", "", "", "")
        }
    }

    private static func getJsonBool(jsonObj: JsonObject, key: String): Bool {
        let fields = jsonObj.getFields()
        if (!fields.contains(key)) { return false }
        match (fields[key]) {
            case b: JsonBool => return b.getValue()
            case s: JsonString =>
                let v = s.getValue()
                return v == "true" || v == "True" || v == "TRUE" || v == "1"
            case _ =>
                let v = fields[key].toString()
                return v == "true" || v == "True" || v == "TRUE" || v == "1"
        }
    }

    private static func getJsonString(jsonObj: JsonObject, key: String): String {
        let fields = jsonObj.getFields()
        if (!fields.contains(key)) { return "" }
        match (fields[key]) {
            case s: JsonString => return s.getValue()
            case _ => return fields[key].toString()
        }
    }

    private static func ensurePluginScriptReady(plugin: PluginData, scriptName: String): Bool {
        try {
            let pluginsRoot = Path("./data/plugins")
            FileUtils.ensureDirectoryExists(pluginsRoot)

            let sharedBase = Path("${pluginsRoot.toString()}/base_plugin.ts")
            let sharedSource = Path("./plugins/base_plugin.ts")
            if (!exists(sharedSource)) {
                getLogger("metadata_plugin_task").error("缺少共享基础插件文件", ("path", sharedSource.toString()))
                return false
            }
            copy(sharedSource, to: sharedBase, overwrite: true)

            let pluginDir = Path("${pluginsRoot.toString()}/${plugin.namespace}")
            FileUtils.ensureDirectoryExists(pluginDir)

            let targetFile = Path("${pluginDir.toString()}/${scriptName}.ts")
            let sourcePath = Path("./plugins/${plugin.plugin_type}/${plugin.entry}")
            if (!exists(sourcePath)) {
                getLogger("metadata_plugin_task").error("源插件文件不存在", ("path", sourcePath.toString()))
                return false
            }

            copy(sourcePath, to: targetFile, overwrite: true)
            return true
        } catch (e: Exception) {
            getLogger("metadata_plugin_task").error("准备插件文件失败", ("error", e.message))
            return false
        }
    }

    private static func fail(taskId: Int64, message: String): Unit {
        let msg = if (message.size == 0) { "Unknown error" } else { message }
        TaskIO.appendLog(taskId, "FAILED: ${msg}")
        MinionModel.failTask(taskId, msg)
        TaskIO.writeOutput(taskId, "{\"success\":0,\"error\":\"${escapeJson(msg)}\"}")
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
}

public class ParsedMetadataResult {
    public var success: Bool = false
    public var error: String = ""
    public var title: String = ""
    public var summary: String = ""
    public var tags: String = ""

    public init(success: Bool, error: String, title: String, summary: String, tags: String) {
        this.success = success
        this.error = error
        this.title = title
        this.summary = summary
        this.tags = tags
    }
}
