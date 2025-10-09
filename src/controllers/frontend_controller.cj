package lrr4cj.controllers

import cjoy.*
import std.fs.*

/**
 * 前端控制器
 * 处理前端静态文件服务
 */
public class FrontendController {

    /**
     * 服务前端首页
     */
    public static func serveIndex(ctx: JoyContext) {
        try {
            let file = File(Path("frontend/out/index.html"), Read)
            let buffer = Array<Byte>(1024 * 1024, {_ => 0}) // 1MB buffer
            let bytesRead = file.read(buffer)
            file.close()

            if (bytesRead > 0) {
                ctx.header("Content-Type", "text/html; charset=utf-8")
                ctx.data(buffer.slice(0, bytesRead))
            } else {
                ctx.status(404).string("Failed to read index file")
            }
        } catch (ex: Exception) {
            ctx.status(500).string("Error serving index: ${ex.message}")
        }
    }

    /**
     * 服务搜索页面
     */
    public static func servePath(ctx: JoyContext, path: String) {
        try {
            let file = File(Path("frontend/out/${path}/index.html"), Read)
            let buffer = Array<Byte>(1024 * 1024, {_ => 0}) // 1MB buffer
            let bytesRead = file.read(buffer)
            file.close()

            if (bytesRead > 0) {
                ctx.header("Content-Type", "text/html; charset=utf-8")
                ctx.data(buffer.slice(0, bytesRead))
            } else {
                ctx.status(404).string("Failed to read search file")
            }
        } catch (ex: Exception) {
            ctx.status(500).string("Error serving search: ${ex.message}")
        }
    }

    /**
     * 服务静态资源（CSS、JS、图片等）
     */
    public static func serveStatic(ctx: JoyContext) {
        try {
            // 获取通配符路径参数
            let path = ctx.getParam("*") ?? ""

            // 构建完整的文件路径
            var filePath = "frontend/out/${path}"
            println("Request path: ${path}, File path: ${filePath}")

            if (!exists(filePath)) {
                println("File not found: ${filePath}")
                FrontendController.serve404(ctx)
            }
            let file = File(Path(filePath), Read)
            let buffer = Array<Byte>(1024 * 1024, {_ => 0}) // 1MB buffer
            let bytesRead = file.read(buffer)
            file.close()

            if (bytesRead > 0) {
                // 根据文件扩展名设置Content-Type
                let contentType = getContentType(filePath)
                ctx.header("Content-Type", contentType)

                ctx.data(buffer.slice(0, bytesRead))
            } else {
                FrontendController.serve404(ctx)
            }
        } catch (ex: Exception) {
            ctx.status(500).string("Error serving static file: ${ex.message}")
        }
    }

    /**
     * 服务404
     */
    public static func serve404(ctx: JoyContext) {
        try {
            let file = File(Path("frontend/404/index.html"), Read)
            let buffer = Array<Byte>(1024 * 1024, {_ => 0}) // 1MB buffer
            let bytesRead = file.read(buffer)
            file.close()

            if (bytesRead > 0) {
                ctx.header("Content-Type", "text/html; charset=utf-8")
                ctx.status(404).data(buffer.slice(0, bytesRead))
            } else {
                ctx.status(404).string("Failed to read index file")
            }
        } catch (ex: Exception) {
            ctx.status(500).string("Error serving index: ${ex.message}")
        }
    }

    /**
     * 根据文件扩展名获取Content-Type
     */
    private static func getContentType(filePath: String): String {
        let defaultType = "application/octet-stream"

        // 简单的文件扩展名检查
        if (filePath.endsWith(".html")) {
            return "text/html; charset=utf-8"
        } else if (filePath.endsWith(".txt")) {
            return "text/plain; charset=utf-8"
        } else if (filePath.endsWith(".css")) {
            return "text/css; charset=utf-8"
        } else if (filePath.endsWith(".js")) {
            return "application/javascript; charset=utf-8"
        } else if (filePath.endsWith(".json")) {
            return "application/json; charset=utf-8"
        } else if (filePath.endsWith(".png")) {
            return "image/png"
        } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
            return "image/jpeg"
        } else if (filePath.endsWith(".gif")) {
            return "image/gif"
        } else if (filePath.endsWith(".svg")) {
            return "image/svg+xml"
        } else if (filePath.endsWith(".ico")) {
            return "image/x-icon"
        } else if (filePath.endsWith(".woff")) {
            return "font/woff"
        } else if (filePath.endsWith(".woff2")) {
            return "font/woff2"
        } else if (filePath.endsWith(".ttf")) {
            return "font/ttf"
        } else if (filePath.endsWith(".eot")) {
            return "application/vnd.ms-fontobject"
        } else {
            return defaultType
        }
    }
}
