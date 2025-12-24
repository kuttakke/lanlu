package lrr4cj.controllers

import cjoy.*
import stdx.encoding.json.*
import stdx.log.*
import std.collection.*
import std.convert.*
import lrr4cj.dao.*
import lrr4cj.views.*
import lrr4cj.utils.*

/**
 * 智能分类控制器
 * - 公开接口：获取启用的智能分类列表（用于前端展示）
 * - 管理接口：管理员维护智能分类
 */
public class SmartFilterController {

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

    private static func getJsonString(obj: JsonObject, key: String): String {
        let fields = obj.getFields()
        if (!fields.contains(key)) { return "" }
        match (fields[key]) {
            case s: JsonString => return s.getValue()
            case _ => return ""
        }
    }

    private static func getJsonBool(obj: JsonObject, key: String): Bool {
        let fields = obj.getFields()
        if (!fields.contains(key)) { return false }
        match (fields[key]) {
            case b: JsonBool => return b.getValue()
            case _ => return false
        }
    }

    private static func getJsonInt(obj: JsonObject, key: String): Int32 {
        let fields = obj.getFields()
        if (!fields.contains(key)) { return 0 }
        match (fields[key]) {
            case n: JsonInt => return Int32(n.getValue())
            case _ => return 0
        }
    }

    private static func getJsonObjectString(obj: JsonObject, key: String): String {
        let fields = obj.getFields()
        if (!fields.contains(key)) { return "{}" }
        match (fields[key]) {
            case o: JsonObject => return o.toJsonString()
            case _ => return "{}"
        }
    }

    private static func filterToJson(filter: SmartFilterData): String {
        var json = "{"
        json += "\"id\":${filter.id.toString()},"
        json += "\"name\":\"${escapeJsonString(filter.name)}\","
        json += "\"translations\":${filter.translations},"
        json += "\"icon\":\"${escapeJsonString(filter.icon)}\","
        json += "\"query\":\"${escapeJsonString(filter.query)}\","
        json += "\"sort_by\":\"${escapeJsonString(filter.sort_by)}\","
        json += "\"sort_order\":\"${escapeJsonString(filter.sort_order)}\","
        json += "\"date_from\":\"${escapeJsonString(filter.date_from)}\","
        json += "\"date_to\":\"${escapeJsonString(filter.date_to)}\","
        json += "\"newonly\":${filter.newonly.toString()},"
        json += "\"untaggedonly\":${filter.untaggedonly.toString()},"
        json += "\"sort_order_num\":${filter.sort_order_num.toString()},"
        json += "\"enabled\":${filter.enabled.toString()},"
        json += "\"created_at\":\"${escapeJsonString(filter.created_at)}\","
        json += "\"updated_at\":\"${escapeJsonString(filter.updated_at)}\""
        json += "}"
        return json
    }

    /**
     * GET /api/smart_filters
     * 获取所有启用的智能分类（用于前端展示）
     */
    public static func getEnabledFilters(ctx: JoyContext): Unit {
        let filters = SmartFilterDao.getEnabledFilters()
        var itemsJson = "["
        var first = true
        for (filter in filters) {
            if (!first) { itemsJson += "," } else { first = false }
            itemsJson += filterToJson(filter)
        }
        itemsJson += "]"

        let data = "{\"items\":${itemsJson}}"
        ResponseView.successJson(ctx, data, "获取智能分类成功")
    }

    /**
     * GET /api/admin/smart_filters
     * 获取所有智能分类（管理用）
     */
    public static func adminList(ctx: JoyContext): Unit {
        let filters = SmartFilterDao.getAllFilters()
        var itemsJson = "["
        var first = true
        for (filter in filters) {
            if (!first) { itemsJson += "," } else { first = false }
            itemsJson += filterToJson(filter)
        }
        itemsJson += "]"

        let data = "{\"items\":${itemsJson}}"
        ResponseView.successJson(ctx, data, "获取智能分类列表成功")
    }

    /**
     * GET /api/admin/smart_filters/:id
     * 获取单个智能分类
     */
    public static func adminGet(ctx: JoyContext): Unit {
        let idStr = ctx.getParam("id") ?? ""
        if (idStr.size == 0) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "id is required", 400)
            return
        }

        var id: Int64 = 0
        try {
            id = Int64.parse(idStr)
        } catch (_: Exception) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "invalid id", 400)
            return
        }

        match (SmartFilterDao.getById(id)) {
            case Some(filter) =>
                ResponseView.successJson(ctx, filterToJson(filter), "获取智能分类成功")
            case None =>
                ctx.status(404)
                ResponseView.errorJson(ctx, "not found", 404)
        }
    }

    /**
     * POST /api/admin/smart_filters
     * 创建智能分类
     */
    public static func adminCreate(ctx: JoyContext): Unit {
        let logger = getLogger("smart_filter_controller")
        try {
            let body = ctx.readString()
            if (body.trimAscii().size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "Empty body", 400)
                return
            }

            let json = JsonValue.fromStr(body)
            var filter = SmartFilterData()
            match (json) {
                case obj: JsonObject =>
                    filter.name = getJsonString(obj, "name")
                    filter.translations = getJsonObjectString(obj, "translations")
                    filter.icon = getJsonString(obj, "icon")
                    filter.query = getJsonString(obj, "query")
                    filter.sort_by = getJsonString(obj, "sort_by")
                    filter.sort_order = getJsonString(obj, "sort_order")
                    filter.date_from = getJsonString(obj, "date_from")
                    filter.date_to = getJsonString(obj, "date_to")
                    filter.newonly = getJsonBool(obj, "newonly")
                    filter.untaggedonly = getJsonBool(obj, "untaggedonly")
                    filter.sort_order_num = getJsonInt(obj, "sort_order_num")
                    filter.enabled = getJsonBool(obj, "enabled")
                case _ =>
                    ctx.status(400)
                    ResponseView.errorJson(ctx, "Invalid JSON", 400)
                    return
            }

            if (filter.name.size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "name is required", 400)
                return
            }

            if (filter.sort_order.size == 0) {
                filter.sort_order = "desc"
            }

            match (SmartFilterDao.create(filter)) {
                case Some(id) =>
                    filter.id = id
                    ResponseView.successJson(ctx, "{\"success\":1,\"id\":${id.toString()}}", "创建成功")
                case None =>
                    ctx.status(500)
                    ResponseView.errorJson(ctx, "Create failed", 500)
            }
        } catch (e: Exception) {
            logger.error("adminCreate异常", ("error", e.message))
            ctx.status(500)
            ResponseView.errorJson(ctx, "Internal error", 500)
        }
    }

    /**
     * PUT /api/admin/smart_filters/:id
     * 更新智能分类
     */
    public static func adminUpdate(ctx: JoyContext): Unit {
        let logger = getLogger("smart_filter_controller")
        try {
            let idStr = ctx.getParam("id") ?? ""
            if (idStr.size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "id is required", 400)
                return
            }

            var id: Int64 = 0
            try {
                id = Int64.parse(idStr)
            } catch (_: Exception) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "invalid id", 400)
                return
            }

            // 检查是否存在
            match (SmartFilterDao.getById(id)) {
                case None =>
                    ctx.status(404)
                    ResponseView.errorJson(ctx, "not found", 404)
                    return
                case Some(_) => ()
            }

            let body = ctx.readString()
            if (body.trimAscii().size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "Empty body", 400)
                return
            }

            let json = JsonValue.fromStr(body)
            var filter = SmartFilterData()
            filter.id = id
            match (json) {
                case obj: JsonObject =>
                    filter.name = getJsonString(obj, "name")
                    filter.translations = getJsonObjectString(obj, "translations")
                    filter.icon = getJsonString(obj, "icon")
                    filter.query = getJsonString(obj, "query")
                    filter.sort_by = getJsonString(obj, "sort_by")
                    filter.sort_order = getJsonString(obj, "sort_order")
                    filter.date_from = getJsonString(obj, "date_from")
                    filter.date_to = getJsonString(obj, "date_to")
                    filter.newonly = getJsonBool(obj, "newonly")
                    filter.untaggedonly = getJsonBool(obj, "untaggedonly")
                    filter.sort_order_num = getJsonInt(obj, "sort_order_num")
                    filter.enabled = getJsonBool(obj, "enabled")
                case _ =>
                    ctx.status(400)
                    ResponseView.errorJson(ctx, "Invalid JSON", 400)
                    return
            }

            if (filter.name.size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "name is required", 400)
                return
            }

            if (filter.sort_order.size == 0) {
                filter.sort_order = "desc"
            }

            if (SmartFilterDao.update(filter)) {
                ResponseView.successJson(ctx, "{\"success\":1}", "更新成功")
            } else {
                ctx.status(500)
                ResponseView.errorJson(ctx, "Update failed", 500)
            }
        } catch (e: Exception) {
            logger.error("adminUpdate异常", ("error", e.message))
            ctx.status(500)
            ResponseView.errorJson(ctx, "Internal error", 500)
        }
    }

    /**
     * DELETE /api/admin/smart_filters/:id
     * 删除智能分类
     */
    public static func adminDelete(ctx: JoyContext): Unit {
        let idStr = ctx.getParam("id") ?? ""
        if (idStr.size == 0) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "id is required", 400)
            return
        }

        var id: Int64 = 0
        try {
            id = Int64.parse(idStr)
        } catch (_: Exception) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "invalid id", 400)
            return
        }

        if (SmartFilterDao.delete(id)) {
            ResponseView.successJson(ctx, "{\"success\":1}", "删除成功")
        } else {
            ctx.status(500)
            ResponseView.errorJson(ctx, "Delete failed", 500)
        }
    }

    /**
     * POST /api/admin/smart_filters/reorder
     * 批量更新排序顺序
     */
    public static func adminReorder(ctx: JoyContext): Unit {
        let logger = getLogger("smart_filter_controller")
        try {
            let body = ctx.readString()
            if (body.trimAscii().size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "Empty body", 400)
                return
            }

            let json = JsonValue.fromStr(body)
            var orders: ArrayList<(Int64, Int32)> = ArrayList<(Int64, Int32)>()

            match (json) {
                case obj: JsonObject =>
                    let fields = obj.getFields()
                    if (!fields.contains("orders")) {
                        ctx.status(400)
                        ResponseView.errorJson(ctx, "orders is required", 400)
                        return
                    }
                    match (fields["orders"]) {
                        case arr: JsonArray =>
                            for (item in arr.getItems()) {
                                match (item) {
                                    case itemObj: JsonObject =>
                                        let itemFields = itemObj.getFields()
                                        var id: Int64 = 0
                                        var sortOrder: Int32 = 0
                                        if (itemFields.contains("id")) {
                                            match (itemFields["id"]) {
                                                case n: JsonInt => id = n.getValue()
                                                case _ => ()
                                            }
                                        }
                                        if (itemFields.contains("sort_order_num")) {
                                            match (itemFields["sort_order_num"]) {
                                                case n: JsonInt => sortOrder = Int32(n.getValue())
                                                case _ => ()
                                            }
                                        }
                                        if (id > 0) {
                                            orders.add((id, sortOrder))
                                        }
                                    case _ => ()
                                }
                            }
                        case _ =>
                            ctx.status(400)
                            ResponseView.errorJson(ctx, "orders must be an array", 400)
                            return
                    }
                case _ =>
                    ctx.status(400)
                    ResponseView.errorJson(ctx, "Invalid JSON", 400)
                    return
            }

            if (orders.size == 0) {
                ctx.status(400)
                ResponseView.errorJson(ctx, "No valid orders provided", 400)
                return
            }

            if (SmartFilterDao.batchUpdateSortOrder(orders.toArray())) {
                ResponseView.successJson(ctx, "{\"success\":1}", "排序更新成功")
            } else {
                ctx.status(500)
                ResponseView.errorJson(ctx, "Reorder failed", 500)
            }
        } catch (e: Exception) {
            logger.error("adminReorder异常", ("error", e.message))
            ctx.status(500)
            ResponseView.errorJson(ctx, "Internal error", 500)
        }
    }

    /**
     * POST /api/admin/smart_filters/:id/toggle
     * 切换启用状态
     */
    public static func adminToggle(ctx: JoyContext): Unit {
        let idStr = ctx.getParam("id") ?? ""
        if (idStr.size == 0) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "id is required", 400)
            return
        }

        var id: Int64 = 0
        try {
            id = Int64.parse(idStr)
        } catch (_: Exception) {
            ctx.status(400)
            ResponseView.errorJson(ctx, "invalid id", 400)
            return
        }

        if (SmartFilterDao.toggleEnabled(id)) {
            ResponseView.successJson(ctx, "{\"success\":1}", "切换成功")
        } else {
            ctx.status(500)
            ResponseView.errorJson(ctx, "Toggle failed", 500)
        }
    }
}
