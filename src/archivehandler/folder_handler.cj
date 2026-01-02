package lrr4cj.archivehandler

import std.fs.*
import std.collection.*
import lrr4cj.models.ArchiveTypes
import lrr4cj.utils.{ArchiveUtils, DirectoryScanner}

/**
 * 文件夹类型处理器
 */
public class FolderHandler <: ArchiveHandler {

    public func getType(): String {
        return ArchiveTypes.FOLDER
    }

    public func listEntries(archivePath: String): Array<String> {
        return DirectoryScanner.listDirectory(archivePath)
    }

    public func extractEntryToStream(archivePath: String, entryName: String): (Int64, Array<UInt8>, Array<UInt8>) {
        try {
            let filePath = DirectoryScanner.joinPath(archivePath, entryName)
            if (!DirectoryScanner.fileExists(filePath)) {
                let errorMsg = "File not found: ${filePath}"
                return (1i64, Array<UInt8>(), errorMsg.toArray())
            }
            let data = File.readFrom(Path(filePath))
            let uint8Data = Array<UInt8>(data.size, { i => data[i] })
            return (0i64, uint8Data, Array<UInt8>())
        } catch (e: Exception) {
            let errorMsg = "Exception reading file: ${e.message}"
            return (1i64, Array<UInt8>(), errorMsg.toArray())
        }
    }

    public func extractEntryToFile(archivePath: String, entryName: String, outputPath: String): Bool {
        try {
            let sourcePath = DirectoryScanner.joinPath(archivePath, entryName)
            if (!DirectoryScanner.fileExists(sourcePath)) {
                return false
            }
            let sourceData = File.readFrom(Path(sourcePath))

            let outputDir = getParentDirectory(outputPath)
            if (!DirectoryScanner.directoryExists(outputDir)) {
                Directory.create(outputDir, recursive: true)
            }

            let destFile = File(Path(outputPath), Write)
            destFile.write(sourceData)
            destFile.close()
            return true
        } catch (_: Exception) {
            return false
        }
    }

    public func getMediaCount(archivePath: String): Int32 {
        let entries = listEntries(archivePath)
        var count: Int32 = 0
        for (entry in entries) {
            if (ArchiveUtils.isMediaFile(entry)) {
                count++
            }
        }
        return count
    }

    public func getFirstImage(archivePath: String): (String, String) {
        let entries = listEntries(archivePath)

        for (entry in entries) {
            let fullPath = DirectoryScanner.joinPath(archivePath, entry)
            if (DirectoryScanner.isDirectory(fullPath)) {
                continue
            }
            if (DirectoryScanner.fileExists(fullPath) && ArchiveUtils.isImageFile(entry)) {
                return (entry, fullPath)
            }
        }

        for (entry in entries) {
            let fullPath = DirectoryScanner.joinPath(archivePath, entry)
            if (DirectoryScanner.isDirectory(fullPath)) {
                let subEntries = DirectoryScanner.listDirectory(fullPath)
                for (subEntry in subEntries) {
                    let subFullPath = DirectoryScanner.joinPath(fullPath, subEntry)
                    if (DirectoryScanner.fileExists(subFullPath) && ArchiveUtils.isImageFile(subEntry)) {
                        return (subEntry, subFullPath)
                    }
                }
            }
        }
        return ("", "")
    }

    public func canHandle(filePath: String): Bool {
        // 首先检查是否是目录
        if (!DirectoryScanner.isDirectory(filePath)) {
            return false
        }

        // 列出目录中的所有条目
        let entries = DirectoryScanner.listDirectory(filePath)

        // 如果目录为空，不处理
        if (entries.size == 0) {
            return false
        }

        // 允许的媒体文件扩展名（图片和视频格式）
        let allowedExtensions = ["avif", "jpg", "jpeg", "png", "webp", "AVIF", "JPG", "JPEG", "PNG", "WEBP"]
        // 允许的视频扩展名
        let videoExtensions = ["mp4", "webm", "mkv", "avi", "mov", "m4v", "MP4", "WEBM", "MKV", "AVI", "MOV", "M4V"]
        // 合并所有允许的扩展名
        var allowedMediaExtensions = ArrayList<String>()
        for (ext in allowedExtensions) {
            allowedMediaExtensions.add(ext)
        }
        for (ext in videoExtensions) {
            allowedMediaExtensions.add(ext)
        }

        // 检查每个条目
        for (entry in entries) {
            let fullPath = DirectoryScanner.joinPath(filePath, entry)

            // 如果存在子目录，则不允许嵌套
            if (DirectoryScanner.isDirectory(fullPath)) {
                return false
            }

            // 检查文件是否是允许的媒体格式
            if (!DirectoryScanner.fileExists(fullPath)) {
                return false
            }

            // 获取文件扩展名
            let parts = entry.split(".")
            if (parts.size <= 1) {
                // 没有扩展名的文件，不允许
                return false
            }

            let extension = parts[parts.size - 1]

            // 检查扩展名是否在允许列表中（大小写敏感）
            var isAllowed = false
            for (allowedExt in allowedMediaExtensions) {
                if (extension == allowedExt) {
                    isAllowed = true
                    break
                }
            }

            if (!isAllowed) {
                return false
            }
        }

        // 所有检查通过，可以处理
        return true
    }

    public func getCoverImage(archivePath: String): (Int64, Array<UInt8>, Array<UInt8>) {
        let (entryName, fullPath) = getFirstImage(archivePath)
        if (entryName.isEmpty() || fullPath.isEmpty()) {
            return (1i64, Array<UInt8>(), "No image found".toArray())
        }
        try {
            let data = File.readFrom(Path(fullPath))
            let uint8Data = Array<UInt8>(data.size, { i => data[i] })
            return (0i64, uint8Data, Array<UInt8>())
        } catch (e: Exception) {
            return (1i64, Array<UInt8>(), e.message.toArray())
        }
    }

    public func listEntriesWithTitle(archivePath: String): Array<(String, String)> {
        let entries = listEntries(archivePath)
        var result = ArrayList<(String, String)>()
        for (entry in entries) {
            result.add((entry, ""))
        }
        return result.toArray()
    }

    private func getParentDirectory(filePath: String): String {
        let parts = filePath.split("/")
        if (parts.size > 1) {
            var result = ""
            for (i in 0..parts.size - 1) {
                if (i == 0 && parts[i].size == 0) {
                    result += "/"
                } else {
                    if (result.size > 0 && result != "/") {
                        result += "/"
                    }
                    result += parts[i]
                }
            }
            return result
        }
        return "."
    }
}
