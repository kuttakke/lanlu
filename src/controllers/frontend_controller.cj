package lrr4cj.controllers

import cjoy.*
import std.fs.*

/**
 * 前端控制器
 * 处理前端静态文件服务
 */
public class FrontendController {

    /**
     * 统一的路径服务函数
     * 根据请求路径自动判断是文件还是目录，目录时自动添加index.html
     */
    public static func servePath(ctx: JoyContext) {
        try {
            // 获取通配符路径参数，如果没有则为空字符串（根路径）
            let path = ctx.getParam("*") ?? ""
            println("Request path: ${path}")
            
            // 移除查询参数，只保留路径部分
            let cleanPath = if (path.contains("?")) {
                path.split("?")[0]
            } else {
                path
            }
            println("Clean path: ${cleanPath}")

            // 特殊处理：如果路径为空或为"/"，直接使用index.html
            var filePath = if (cleanPath.isEmpty() || cleanPath == "/") {
                println("Root path request, using index.html")
                "frontend/out/index.html"
            } else {
                // 构建完整的文件路径
                let fullPath = "frontend/out/${cleanPath}"
                println("Initial file path: ${fullPath}")

                // 检查文件是否存在且是文件（不是目录）
                if (exists(fullPath) && !FileInfo(fullPath).isDirectory()) {
                    fullPath
                } else {
                    // 如果是目录或文件不存在，尝试添加index.html
                    var indexPath = fullPath
                    if (!indexPath.endsWith("/")) {
                        indexPath = indexPath + "/"
                    }
                    indexPath = indexPath + "index.html"
                    println("Directory or file not found, trying with index.html: ${indexPath}")
                    indexPath
                }
            }

            println("Final file path: ${filePath}")

            // 再次检查文件是否存在
            if (!exists(filePath)) {
                println("File not found: ${filePath}")
                FrontendController.serve404(ctx)
                return
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
            ctx.status(500).string("Error serving file: ${ex.message}")
        }
    }

    /**
     * 服务指定路径 - 为了兼容性保留
     * @deprecated 使用 servePath(ctx) 替代
     */
    public static func servePathWithParam(ctx: JoyContext, path: String) {
        try {
            // 模拟通配符参数，然后调用统一函数
            // 这里我们创建一个临时的参数处理
            let filePath = if (path.isEmpty()) { "" } else { path }

            // 构建完整的文件路径
            var fullFilePath = "frontend/out/${filePath}"

            // 如果是目录路径，添加index.html
            if (!fullFilePath.endsWith("/") && !fullFilePath.endsWith(".html")) {
                fullFilePath = fullFilePath + "/index.html"
            } else if (!fullFilePath.endsWith(".html")) {
                fullFilePath = fullFilePath + "index.html"
            }

            if (!exists(fullFilePath)) {
                ctx.status(404).string("File not found: ${path}")
                return
            }

            let file = File(Path(fullFilePath), Read)
            let buffer = Array<Byte>(1024 * 1024, {_ => 0}) // 1MB buffer
            let bytesRead = file.read(buffer)
            file.close()

            if (bytesRead > 0) {
                ctx.header("Content-Type", "text/html; charset=utf-8")
                ctx.data(buffer.slice(0, bytesRead))
            } else {
                ctx.status(404).string("Failed to read file: ${path}")
            }
        } catch (ex: Exception) {
            ctx.status(500).string("Error serving path: ${ex.message}")
        }
    }

    /**
     * 服务前端首页 - 为了兼容性保留
     * @deprecated 使用 servePath(ctx) 替代
     */
    public static func serveIndex(ctx: JoyContext) {
        servePath(ctx)
    }

    /**
     * 服务指定路径 - 为了兼容性保留（重命名以避免冲突）
     * @deprecated 使用 servePath(ctx) 替代
     */
    public static func servePathDeprecated(ctx: JoyContext, path: String) {
        servePathWithParam(ctx, path)
    }

    /**
     * 服务静态资源 - 为了兼容性保留
     * @deprecated 使用 servePath(ctx) 替代
     */
    public static func serveStatic(ctx: JoyContext) {
        servePath(ctx)
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
