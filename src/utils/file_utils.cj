package lrr4cj.utils

import std.fs.*
import std.io.*
import std.process.*

/**
 * 文件工具类
 */
public class FileUtils {
    
    /**
     * 获取文件扩展名
     */
    public static func getFileExtension(fileName: String): String {
        let ext = fileName.split(".")
        if (ext.size > 1) {
            return "." + ext[ext.size - 1]
        }
        return ""
    }
    
    /**
     * 获取不包含点的文件扩展名
     */
    public static func getFileExtensionWithoutDot(fileName: String): String {
        let ext = fileName.split(".")
        if (ext.size > 1) {
            return ext[ext.size - 1]
        }
        return ""
    }
    
    /**
     * 连接路径
     */
    public static func joinPath(base: String, part: String): String {
        if (base.endsWith("/")) {
            return base + part
        } else {
            return "${base}/${part}"
        }
    }
    
    /**
     * 检查是否为支持的档案格式
     */
    public static func isSupportedArchiveFormat(fileName: String): Bool {
        let ext = getFileExtension(fileName)
        let supportedFormats = [".zip", ".rar", ".7z", ".tar", ".gz", ".pdf", ".epub", ".mobi", ".cbz", ".cbr"]
        return supportedFormats.contains(ext)
    }
    
    /**
     * 确保目录存在，如果不存在则创建
     */
    public static func ensureDirectoryExists(path: Path): Unit {
        try {
            if (!exists(path)) {
                // 使用 Directory.create 创建目录
                Directory.create(path, recursive: true)
                println("Created directory: ${path}")
            }
        } catch (e: Exception) {
            println("Failed to create directory ${path}: ${e}")
        }
    }
    
    /**
     * 格式化文件大小为可读字符串
     */
    public static func formatFileSize(bytes: Int64): String {
        if (bytes < 1024) {
            return "${bytes} B"
        } else if (bytes < 1024 * 1024) {
            return "${bytes / 1024} KB"
        } else if (bytes < 1024 * 1024 * 1024) {
            return "${bytes / (1024 * 1024)} MB"
        } else {
            return "${bytes / (1024 * 1024 * 1024)} GB"
        }
    }
}

/**
 * 图像处理工具类
 */
public class ImageUtils {
    
    /**
     * 检查是否为支持的图像格式
     */
    public static func isSupportedImageFormat(fileName: String): Bool {
        let ext = FileUtils.getFileExtension(fileName)
        let supportedFormats = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]
        return supportedFormats.contains(ext)
    }
    
    /**
     * 生成缩略图路径
     */
    public static func generateThumbnailPath(archiveId: String, page: Int32): String {
        let thumbDir = "./public/thumb/${archiveId}"
        return FileUtils.joinPath(thumbDir, "${page}.jpg")
    }
    
    /**
     * 获取缩略图URL路径
     */
    public static func getThumbnailUrl(archiveId: String, page: Int32): String {
        return "/thumb/${archiveId}/${page}.jpg"
    }
}

/**
 * 字符串工具类
 */
public class StringUtils {
    
    /**
     * 检查字符串是否为空
     */
    public static func isEmpty(str: String): Bool {
        return str.size == 0
    }
    
    /**
     * 安全地获取字符串，如果为空则返回默认值
     */
    public static func safeString(str: String, defaultValue: String): String {
        if (isEmpty(str)) {
            return defaultValue
        } else {
            return str
        }
    }
    
    /**
     * 将字符串数组转换为逗号分隔的字符串
     */
    public static func arrayToString(arr: Array<String>): String {
        if (arr.size == 0) {
            return ""
        }
        var result = ""
        for (i in 0..arr.size) {
            result += arr[i]
            if (i < arr.size - 1) {
                result += ", "
            }
        }
        return result
    }
    
    /**
     * 将逗号分隔的字符串转换为字符串数组
     */
    public static func stringToArray(str: String): Array<String> {
        if (str.size == 0) {
            return []
        }
        return str.split(",")
    }
}