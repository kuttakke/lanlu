package lrr4cj.views

import cjoy.*

/**
 * 响应视图类
 */
public class ResponseView {
    /**
     * 返回成功响应
     */
    public static func success(ctx: JoyContext, message: String) {
        ctx.string(message)
    }

    /**
     * 返回错误响应
     */
    public static func error(ctx: JoyContext, message: String) {
        ctx.string(message)
    }

    /**
     * 返回 JSON 响应
     */
    public static func json(ctx: JoyContext, data: String) {
        ctx.header("Content-Type", "application/json").string(data)
    }

    /**
     * 返回 JSON 格式的成功响应
     */
    public static func successJson(ctx: JoyContext, data: String) {
        let response = "{\"code\": 200, \"message\": \"操作成功\", \"data\": ${data}}"
        json(ctx, response)
    }

    public static func successJson(ctx: JoyContext, data: String, message: String) {
        let response = "{\"code\": 200, \"message\": \"${message}\", \"data\": ${data}}"
        json(ctx, response)
    }

    /**
     * 返回 JSON 格式的错误响应
     */
    public static func errorJson(ctx: JoyContext, message: String) {
        let response = "{\"code\": 400, \"message\": \"${message}\", \"data\": null}"
        json(ctx, response)
    }

    public static func errorJson(ctx: JoyContext, message: String, code: Int64) {
        let response = "{\"code\": ${code}, \"message\": \"${message}\", \"data\": null}"
        json(ctx, response)
    }
}