package lrr4cj.utils

import std.collection.*
import stdx.encoding.json.*
import stdx.log.*

/**
 * 将“代码中发现的插件参数schema”和“数据库中已保存的参数value”合并，避免启动/发现插件时覆盖用户配置。
 *
 * - discoveredJson: 来自插件脚本 getPluginInfo().parameters（通常没有 value）
 * - existingJson: 数据库 plugins.parameters（可能包含 value）
 */
public func mergePluginParameters(existingJson: String, discoveredJson: String): String {
    let existingTrimmed = existingJson.trimAscii()
    let discoveredTrimmed = discoveredJson.trimAscii()

    if (discoveredTrimmed.size == 0) {
        return existingJson
    }
    if (existingTrimmed.size == 0) {
        return discoveredJson
    }

    try {
        let discoveredVal = JsonValue.fromStr(discoveredTrimmed)
        let existingVal = JsonValue.fromStr(existingTrimmed)

        // 仅对“schema数组”做合并；其他格式直接返回 discovered
        match (discoveredVal) {
            case discoveredArr: JsonArray =>
                // 提取 existing 中的 value 映射
                var existingValueMap = HashMap<String, JsonValue>()
                var existingObjMap = HashMap<String, JsonObject>()

                match (existingVal) {
                    case existingArr: JsonArray =>
                        let size = existingArr.size()
                        for (i in 0..size) {
                            match (existingArr.get(i)) {
                                case Some(v) =>
                                    match (v) {
                                        case obj: JsonObject =>
                                            let key = getParamKey(obj, i)
                                            existingObjMap[key] = obj
                                            let fields = obj.getFields()
                                            if (fields.contains("value")) {
                                                existingValueMap[key] = fields["value"]
                                            }
                                        case _ => ()
                                    }
                                case None => ()
                            }
                        }
                    case existingObj: JsonObject =>
                        // 兼容：如果数据库里是 {name:value} 的对象格式
                        for ((k, v) in existingObj.getFields()) {
                            existingValueMap[k] = v
                        }
                    case _ => ()
                }

                // 构建 merged schema：以 discovered 为准，填充 existing.value
                var seenKeys = HashSet<String>()
                var mergedList = ArrayList<JsonValue>()
                let dSize = discoveredArr.size()
                for (i in 0..dSize) {
                    match (discoveredArr.get(i)) {
                        case Some(v) =>
                            match (v) {
                                case obj: JsonObject =>
                                    let key = getParamKey(obj, i)
                                    seenKeys.add(key)

                                    if (existingValueMap.contains(key)) {
                                        obj.put("value", existingValueMap[key])
                                    }
                                    mergedList.add(obj)
                                case _ =>
                                    mergedList.add(v)
                            }
                        case None => ()
                    }
                }

                // 追加 schema 中不存在，但 existing 中存在的参数对象，避免用户配置丢失
                for ((key, obj) in existingObjMap) {
                    if (!seenKeys.contains(key)) {
                        mergedList.add(obj)
                    }
                }

                return JsonArray(mergedList).toString()
            case _ =>
                return discoveredJson
        }
    } catch (e: Exception) {
        getLogger("plugin_utils").warn("合并插件参数失败，使用discovered参数", ("error", e.message))
        return discoveredJson
    }
}

private func getParamKey(paramObj: JsonObject, index: Int64): String {
    let fields = paramObj.getFields()
    if (fields.contains("name")) {
        match (fields["name"]) {
            case s: JsonString =>
                let value = s.getValue().trimAscii()
                if (value.size > 0) {
                    return value
                }
            case _ =>
                let value = fields["name"].toString().trimAscii()
                if (value.size > 0) {
                    return value
                }
        }
    }
    return "param${index.toString()}"
}
