package lrr4cj.services

import std.io.*
import std.fs.*
import stdx.encoding.json.stream.*
import stdx.log.*
import lrr4cj.config.*
import lrr4cj.models.*
import lrr4cj.utils.*

/**
 * tag_i18n_import 任务执行器（运行在TaskPool中）
 * parameters: 导入请求的原始 JSON（支持 entries 数组 / 直接数组 / map）
 */
public class TagI18nImportTaskRunner {
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

    private static func fail(taskId: Int64, message: String): Unit {
        TaskIO.appendLog(taskId, "failed: ${message}")
        MinionModel.failTask(taskId, message)
        TaskIO.writeOutput(taskId, "{\"success\":0,\"error\":\"${escapeJsonString(message)}\"}")
    }

    public static func run(taskId: Int64, parameters: String): Unit {
        let logger = getLogger("tag_i18n_import_task")
        TaskIO.appendLog(taskId, "tag_i18n_import task started")
        MinionModel.updateTaskProgress(taskId, 1, "导入任务开始")

        MinionModel.updateTaskProgress(taskId, 5, "准备写入数据库")

        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case None =>
                fail(taskId, "无法连接到数据库")
                return
            case Some(conn) =>
                try {
                    let stmt = conn.prepareStatement(
                        "INSERT INTO tag_i18n (tag, lang, text, intro, links) VALUES (?, ?, ?, ?, ?) ON CONFLICT (tag, lang) DO UPDATE SET text = EXCLUDED.text, intro = EXCLUDED.intro, links = EXCLUDED.links, updated_at = CURRENT_TIMESTAMP")

                    var received: Int64 = 0
                    var imported: Int64 = 0

                    func tickProgress(): Unit {
                        if (received > 0 && received % 1000 == 0) {
                            let p: Int32 = if (received < 5000) { 20 }
                                else if (received < 20000) { 40 }
                                else if (received < 80000) { 60 }
                                else if (received < 200000) { 75 }
                                else { 90 }
                            MinionModel.updateTaskProgress(taskId, p, "已写入 ${received.toString()} 条")
                            TaskIO.appendLog(taskId, "progress received=${received.toString()} imported=${imported.toString()}")
                        }
                    }

                    func addEntryAndUpsert(tag: String, lang: String, text: String, intro: String, links: String): Unit {
                        let t = tag.trimAscii()
                        let l = lang.trimAscii()
                        if (t.size == 0 || l.size == 0) { return }
                        received += 1
                        stmt.set(0, t)
                        stmt.set(1, l)
                        stmt.set(2, text)
                        stmt.set(3, intro)
                        stmt.set(4, links)
                        stmt.update()
                        imported += 1
                        tickProgress()
                    }

                    func readValueAsString(r: JsonReader): String {
                        match (r.peek()) {
                            case Some(BeginObject) =>
                                let bytes = r.readValueBytes()
                                return String.fromUtf8(bytes)
                            case Some(BeginArray) =>
                                let bytes = r.readValueBytes()
                                return String.fromUtf8(bytes)
                            case Some(_) =>
                                return r.readValue<String>()
                            case None =>
                                return ""
                        }
                    }

                    func readTextOrRaw(r: JsonReader): String {
                        match (r.peek()) {
                            case Some(BeginObject) =>
                                var textOrRaw = ""
                                r.startObject()
                                while (r.peek() != EndObject) {
                                    let name = r.readName()
                                    match (name) {
                                        case "text" =>
                                            textOrRaw = readValueAsString(r).trimAscii()
                                        case "raw" =>
                                            if (textOrRaw.size == 0) { textOrRaw = readValueAsString(r).trimAscii() } else { r.skip() }
                                        case _ =>
                                            r.skip()
                                    }
                                }
                                r.endObject()
                                return textOrRaw
                            case Some(_) =>
                                return readValueAsString(r).trimAscii()
                            case None =>
                                return ""
                        }
                    }

                    func parseEntryObject(r: JsonReader): Unit {
                        var tag = ""
                        var lang = ""
                        var text = ""
                        var intro = ""
                        var links = ""

                        r.startObject()
                        while (r.peek() != EndObject) {
                            let name = r.readName()
                            match (name) {
                                case "tag" => tag = readValueAsString(r).trimAscii()
                                case "lang" => lang = readValueAsString(r).trimAscii()
                                case "text" => text = readValueAsString(r)
                                case "intro" => intro = readValueAsString(r)
                                case "links" => links = readValueAsString(r)
                                case _ => r.skip()
                            }
                        }
                        r.endObject()

                        addEntryAndUpsert(tag, lang, text, intro, links)
                    }

                    func parseEntriesArray(r: JsonReader): Unit {
                        r.startArray()
                        while (r.peek() != EndArray) {
                            match (r.peek()) {
                                case Some(BeginObject) => parseEntryObject(r)
                                case Some(_) => r.skip()
                                case None => break
                            }
                        }
                        r.endArray()
                    }

                    func parseLangValue(tag: String, lang: String, r: JsonReader): Unit {
                        match (r.peek()) {
                            case Some(BeginObject) =>
                                // 支持 {text,intro,links} 或 {name,intro,links}；text/name 字段支持 {text/raw} 嵌套对象
                                var text = ""
                                var intro = ""
                                var links = ""
                                r.startObject()
                                while (r.peek() != EndObject) {
                                    let name = r.readName()
                                    match (name) {
                                        case "text" =>
                                            text = readTextOrRaw(r)
                                        case "name" =>
                                            if (text.size == 0) { text = readTextOrRaw(r) } else { r.skip() }
                                        case "intro" =>
                                            intro = readTextOrRaw(r)
                                        case "links" =>
                                            links = readTextOrRaw(r)
                                        case _ =>
                                            r.skip()
                                    }
                                }
                                r.endObject()
                                addEntryAndUpsert(tag, lang, text, intro, links)
                            case Some(JsonString) =>
                                addEntryAndUpsert(tag, lang, r.readValue<String>(), "", "")
                            case Some(_) =>
                                addEntryAndUpsert(tag, lang, readValueAsString(r), "", "")
                            case None =>
                                ()
                        }
                    }

                    func parseTagMapObject(r: JsonReader): Unit {
                        r.startObject()
                        while (r.peek() != EndObject) {
                            let tag = r.readName()
                            match (r.peek()) {
                                case Some(BeginObject) =>
                                    r.startObject()
                                    while (r.peek() != EndObject) {
                                        let lang = r.readName()
                                        parseLangValue(tag, lang, r)
                                    }
                                    r.endObject()
                                case Some(JsonString) =>
                                    // 兜底：如果只有字符串，则默认当作 zh
                                    addEntryAndUpsert(tag, "zh", r.readValue<String>(), "", "")
                                case Some(_) =>
                                    r.skip()
                                case None =>
                                    break
                            }
                        }
                        r.endObject()
                    }

                    func parseRoot(reader: JsonReader): Unit {
                        var parsedAny = false
                        while (let Some(tok) <- reader.peek()) {
                            match (tok) {
                                case BeginArray =>
                                    parseEntriesArray(reader)
                                    parsedAny = true
                                    break
                                case BeginObject =>
                                    // root object: 优先处理 {"entries": [...]} / {"map": {...}}，跳过其他元数据字段
                                    reader.startObject()
                                    if (reader.peek() == EndObject) {
                                        reader.endObject()
                                        break
                                    }

                                    // 寻找 "map" 或 "entries" 键，跳过其他元数据字段（如 generated_at, source, head）
                                    var foundMap = false
                                    var foundEntries = false
                                    while (reader.peek() != EndObject && !parsedAny) {
                                        let name = reader.readName()
                                        if (name == "map" && !foundMap) {
                                            foundMap = true
                                            match (reader.peek()) {
                                                case Some(BeginObject) =>
                                                    parseTagMapObject(reader)
                                                    parsedAny = true
                                                case Some(_) =>
                                                    reader.skip()
                                                case None => ()
                                            }
                                        } else if (name == "entries" && !foundEntries) {
                                            foundEntries = true
                                            match (reader.peek()) {
                                                case Some(BeginArray) =>
                                                    parseEntriesArray(reader)
                                                    parsedAny = true
                                                case Some(_) =>
                                                    reader.skip()
                                                case None => ()
                                            }
                                        } else {
                                            // 跳过不需要的字段（如 generated_at, source, head 等）
                                            reader.skip()
                                        }
                                    }
                                    reader.endObject()
                                    break
                                case _ =>
                                    reader.skip()
                            }
                        }
                        if (!parsedAny || received == 0) {
                            throw Exception("没有可导入的数据")
                        }
                    }

                    let path = parameters.trimAscii()
                    if (path.size == 0) {
                        try { stmt.close() } catch (_: Exception) {}
                        try { conn.close() } catch (_: Exception) {}
                        fail(taskId, "导入参数缺少文件路径")
                        return
                    }

                    let filePath = Path(path)
                    if (!exists(filePath)) {
                        try { stmt.close() } catch (_: Exception) {}
                        try { conn.close() } catch (_: Exception) {}
                        fail(taskId, "导入文件不存在: ${path}")
                        return
                    }

                    TaskIO.appendLog(taskId, "source=file ${path}")
                    try (file = File(filePath, Read)) {
                        let reader = JsonReader(file)
                        parseRoot(reader)
                    }

                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}

                    let result = "{\"success\":1,\"imported\":${imported.toString()},\"received\":${received.toString()}}"
                    TaskIO.writeOutput(taskId, result)
                    MinionModel.completeTask(taskId, result)
                    TaskIO.appendLog(taskId, "completed imported=${imported.toString()} received=${received.toString()}")
                    logger.info("tag_i18n_import completed", ("task_id", taskId.toString()), ("imported", imported.toString()))
                } catch (e: Exception) {
                    try { conn.close() } catch (_: Exception) {}
                    fail(taskId, "写入数据库失败: ${e.message}")
                    return
                }
        }
    }
}
