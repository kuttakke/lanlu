package lrr4cj.utils

import std.fs.*
import std.process.*
import std.convert.*

/**
 * 档案处理工具类
 */
public class ArchiveUtils {
    
    // 支持的压缩包格式
    public static let SUPPORTED_ARCHIVE_EXTENSIONS: Array<String> = [
        "zip", "rar", "7z", "tar", "cbz", "cbr", "cb7", "cbt", "tar.gz", "tgz"
    ]
    
    // 支持的图片格式
    public static let SUPPORTED_IMAGE_EXTENSIONS: Array<String> = [
        "jpg", "jpeg", "png", "gif", "bmp", "webp"
    ]
    
    /**
     * 检查文件是否为支持的档案格式
     */
    public static func isSupportedArchive(fileName: String): Bool {
        let ext = FileUtils.getFileExtensionWithoutDot(fileName)
        return SUPPORTED_ARCHIVE_EXTENSIONS.contains(ext)
    }
    
    /**
     * 检查文件是否为支持的图像格式
     */
    public static func isSupportedImage(fileName: String): Bool {
        let ext = FileUtils.getFileExtensionWithoutDot(fileName)
        return SUPPORTED_IMAGE_EXTENSIONS.contains(ext)
    }
    
    /**
     * 获取档案文件大小
     */
    public static func getArchiveFileSize(filePath: String): Int64 {
        try {
            let path = Path(filePath)
            let file = File(path, Read)
            let fileInfo = file.info
            file.close()
            return fileInfo.size
        } catch (_: Exception) {
            return 0
        }
    }
    
    /**
     * 获取档案文件修改时间
     */
    public static func getArchiveFileModTime(filePath: String): String {
        try {
            let path = Path(filePath)
            let file = File(path, Read)
            let fileInfo = file.info
            file.close()
            
            // 获取最后修改时间
            let modTime = fileInfo.lastModificationTime
            return modTime.toString()
        } catch (_: Exception) {
            return ""
        }
    }
    
    /**
     * 生成文件哈希值
     */
    public static func generateFileHash(filePath: String): String {
        try {
            // 获取文件大小和修改时间
            let fileSize = getArchiveFileSize(filePath)
            let fileModTime = getArchiveFileModTime(filePath)
            
            // 组合内容：filePath + mtime + size
            let content = filePath + fileModTime + fileSize.toString()
            
            // 简单哈希：使用文件路径的哈希码
            return "${content.hashCode()}"
        } catch (_: Exception) {
            // 简单哈希：使用文件路径
            return "${filePath.hashCode()}"
        }
    }
    
    /**
     * 获取压缩包中的文件列表
     */
    public static func getArchiveFileList(archivePath: String): Array<String> {
        try {
            let bsdtarPath = "/usr/bin/bsdtar"
            let (exitCode, stdout, _) = executeCommand(bsdtarPath, ["-tf", archivePath])
            
            if (exitCode == 0) {
                // 解析输出，获取文件列表
                let output = String.fromUtf8(stdout)
                let lines = output.split("\n")
                var fileList: Array<String> = []
                
                for (line in lines) {
                    if (line.size > 0 && isSupportedImage(line)) {
                        fileList = addFileToArray(fileList, line)
                    }
                }
                
                return fileList
            } else {
                return []
            }
        } catch (_: Exception) {
            return []
        }
    }
    
    /**
     * 从压缩包中提取单个文件到内存流
     */
    public static func extractArchiveEntryToStream(archivePath: String, entryName: String): (Int32, Array<UInt8>, Array<UInt8>) {
        try {
            let bsdtarPath = "/usr/bin/bsdtar"
            return executeCommand(bsdtarPath, ["-xO", "-f", archivePath, entryName])
        } catch (_: Exception) {
            return (1, [], [])
        }
    }
    
    /**
     * 从压缩包中提取单个文件到指定路径
     */
    public static func extractArchiveEntry(archivePath: String, entryName: String, outputPath: String): Bool {
        try {
            let (exitCode, stdout, _) = extractArchiveEntryToStream(archivePath, entryName)
            
            if (exitCode == 0) {
                // 将标准输出的内容写入目标文件
                let outputDir = getParentDirectory(outputPath)
                if (!directoryExists(outputDir)) {
                    Directory.create(outputDir, recursive: true)
                }
                
                let filePath = Path(outputPath)
                let file = File(filePath, Write)
                file.write(stdout)
                file.close()
                return true
            } else {
                return false
            }
        } catch (_: Exception) {
            return false
        }
    }
    
    /**
     * 提取压缩包中的所有图像文件到指定目录
     */
    public static func extractArchiveImages(archivePath: String, outputDir: String): Bool {
        try {
            let fileList = getArchiveFileList(archivePath)
            
            for (fileName in fileList) {
                let outputPath = FileUtils.joinPath(outputDir, fileName)
                if (!extractArchiveEntry(archivePath, fileName, outputPath)) {
                    return false
                }
            }
            
            return true
        } catch (_: Exception) {
            return false
        }
    }
    
    /**
     * 生成缩略图
     */
    public static func generateThumbnail(imagePath: String, outputPath: String, width: Int32, height: Int32): Bool {
        try {
            let magickPath = "/usr/bin/convert"
            let (exitCode, _, _) = executeCommand(magickPath, [imagePath, "-thumbnail", "${width}x${height}", outputPath])
            return exitCode == 0
        } catch (_: Exception) {
            return false
        }
    }
    
    /**
     * 从压缩包中直接生成缩略图
     */
    public static func generateThumbnailFromArchive(archivePath: String, entryName: String, outputPath: String, width: Int32, height: Int32): Bool {
        try {
            let magickPath = "/usr/bin/convert"
            let bsdtarPath = "/usr/bin/bsdtar"
            
            // 使用管道将 bsdtar 的输出直接传递给 convert
            let command = "${bsdtarPath} -xO -f ${archivePath} ${entryName} | ${magickPath} - -thumbnail ${width}x${height} ${outputPath}"
            let (exitCode, _, _) = executeCommand("/bin/sh", ["-c", command])
            return exitCode == 0
        } catch (_: Exception) {
            return false
        }
    }
    
    /**
     * 添加文件到数组
     */
    private static func addFileToArray(arr: Array<String>, file: String): Array<String> {
        let result = Array<String>(arr.size + 1, { i =>
            if (i < arr.size) {
                arr[i]
            } else {
                file
            }
        })
        return result
    }
    
    /**
     * 获取父目录路径
     */
    private static func getParentDirectory(filePath: String): String {
        let parts = filePath.split("/")
        if (parts.size > 1) {
            var result = ""
            for (i in 0..parts.size - 1) {
                if (result.size > 0) {
                    result += "/"
                }
                result += parts[i]
            }
            return result
        }
        return ""
    }
    
    /**
     * 检查目录是否存在
     */
    private static func directoryExists(path: String): Bool {
        try {
            let dirPath = Path(path)
            if (exists(dirPath)) {
                let fileInfo = FileInfo(dirPath)
                return fileInfo.isDirectory()
            }
            return false
        } catch (_: Exception) {
            return false
        }
    }
    
    /**
     * 执行命令并获取输出
     */
    private static func executeCommand(command: String, args: Array<String>): (Int32, Array<UInt8>, Array<UInt8>) {
        try {
            // 使用 launch 函数执行命令
            if (args.size == 0) {
                let process = launch(command, stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            } else if (args.size == 1) {
                let process = launch(command, args[0], stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            } else if (args.size == 2) {
                let process = launch(command, args[0], args[1], stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            } else if (args.size == 3) {
                let process = launch(command, args[0], args[1], args[2], stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            } else if (args.size == 4) {
                let process = launch(command, args[0], args[1], args[2], args[3], stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            } else {
                // 对于更多参数，使用 shell 执行
                var fullCmd = command
                for (arg in args) {
                    fullCmd += " " + arg
                }
                let process = launch("/bin/sh", "-c", fullCmd, stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let exitCode = process.wait()
                return (Int32(exitCode), Array<UInt8>(), Array<UInt8>())
            }
        } catch (_: Exception) {
            return (1, [], [])
        }
    }
}