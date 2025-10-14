package lrr4cj.controllers

import stdx.net.http.HttpStatusCode
import cjoy.*
import cjoy.json.*
import lrr4cj.models.*
import lrr4cj.utils.*
import lrr4cj.dao.*
import std.random.*
import lrr4cj.services.*
import std.time.*
import stdx.crypto.digest.*
import stdx.encoding.hex.*
import std.fs.*
import std.convert.*

/**
 * 分片上传控制器
 * 处理分片上传相关的API请求
 */
public class ChunkedUploadController {

    // 分片上传配置
    private static let CHUNK_SIZE = 1536 * 1024; // 1.5MB (小于2MB限制)
    private static let MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

    // 分片存储目录
    private static let CHUNK_DIR = "./data/cache/temp_chunks"

    /**
     * 初始化上传会话
     * POST /api/archives/upload/init
     */
    public static func initUpload(ctx: JoyContext): Unit {
        try {
            // 获取请求体数据
            let body = ctx.readRawData()

            // 简化处理：生成上传ID并返回
            let uploadId = generateUploadId()

            // 创建临时目录
            createTempDirectories()

            // 创建上传会话目录
            let uploadDir = Path("${CHUNK_DIR}/${uploadId}")
            Directory.create(uploadDir, recursive: true)

            let response = "{\"success\":1,\"uploadId\":\"${uploadId}\"}"
            ctx.json(response)
        } catch (e: Exception) {
            let errorResponse = "{\"success\":0,\"error\":\"${e.message}\"}"
            ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
            ctx.json(errorResponse)
        }
    }

    /**
     * 上传分片
     * PUT /api/archives/upload/chunk
     */
    public static func uploadChunk(ctx: JoyContext): Unit {
        try {
            // 获取查询参数
            let uploadId = ctx.getQuery("uploadId") ?? ""
            let chunkIndexStr = ctx.getQuery("chunkIndex") ?? ""
            let totalChunksStr = ctx.getQuery("totalChunks") ?? ""
            let fileName = ctx.getQuery("filename") ?? ""

            // 验证参数
            if (uploadId.size == 0 || chunkIndexStr.size == 0 || totalChunksStr.size == 0) {
                let errorResponse = "{\"success\":0,\"error\":\"Missing required parameters\"}"
                ctx.status(HttpStatusCode.STATUS_BAD_REQUEST)
                ctx.json(errorResponse)
                return
            }

            let chunkIndex = Int64.parse(chunkIndexStr)
            let totalChunks = Int64.parse(totalChunksStr)

            // 创建上传目录
            let uploadDir = Path("${CHUNK_DIR}/${uploadId}")
            if (!exists(uploadDir)) {
                Directory.create(uploadDir, recursive: true)
            }

            // 保存分片文件
            let chunkFile = Path("${uploadDir}/chunk_${chunkIndex}.bin")
            let fileData = ctx.readRawData()

            try (file = File(chunkFile, Write)) {
                file.write(fileData)
            }

            // 检查是否所有分片都已上传
            var uploadedCount = 0
            for (i in 0..totalChunks) {
                let checkFile = Path("${uploadDir}/chunk_${i}.bin")
                if (exists(checkFile)) {
                    uploadedCount++
                }
            }

            // 如果所有分片都已上传，返回成功响应
            if (uploadedCount == totalChunks) {
                let finalFileName = if (fileName.size > 0) {
                    fileName
                } else {
                    "merged_file.bin"
                }

                // 返回成功响应，不在这里合并文件
                let successResponse = "{\"success\":1,\"message\":\"All chunks uploaded\",\"fileName\":\"${finalFileName}\"}"
                ctx.json(successResponse)
            } else {
                // 返回分片上传成功响应，包含实际已上传的分片数量
                let successResponse = "{\"success\":1,\"chunkIndex\":${chunkIndex},\"uploaded\":${uploadedCount},\"total\":${totalChunks}}"
                ctx.json(successResponse)
            }
        } catch (e: Exception) {
            let errorResponse = "{\"success\":0,\"error\":\"${e.message}\"}"
            ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
            ctx.json(errorResponse)
        }
    }

    /**
     * 完成上传
     * POST /api/archives/upload/complete
     */
    public static func completeUpload(ctx: JoyContext): Unit {
        try {
            // 简化处理：直接调用原有的上传逻辑
            var uploadId = ctx.getQuery("uploadId") ?? ""
            var fileName = ctx.getQuery("filename") ?? ""
            var title = ctx.getQuery("title") ?? ""
            var tags = ctx.getQuery("tags") ?? ""
            var summary = ctx.getQuery("summary") ?? ""
            var categoryId = ctx.getQuery("category_id") ?? ""
            var fileChecksum = ctx.getQuery("file_checksum") ?? ""

            // 尝试从请求体中获取参数
            try {
                let jsonObj = ctx.readJson<HashMap<String, String>>()
                if (jsonObj.isSome() && jsonObj.getOrThrow().size > 0) {
                    let map = jsonObj.getOrThrow()
                    fileName = map.get("filename") ?? fileName
                    title = map.get("title") ?? title
                    tags = map.get("tags") ?? tags
                    summary = map.get("summary") ?? summary
                    categoryId = map.get("category_id") ?? categoryId
                    fileChecksum = map.get("file_checksum") ?? fileChecksum
                    uploadId = map.get("uploadId") ?? uploadId
                }
            } catch (e: Exception) {
                println("Failed to parse request body: ${e}")
            }

            if (fileName.size == 0) {
                let errorResponse = "{\"success\":0,\"error\":\"Filename is required\"}"
                ctx.status(HttpStatusCode.STATUS_BAD_REQUEST)
                ctx.json(errorResponse)
                return
            }

            // 合并分片，直接存储在CHUNK_DIR/${uploadId}目录中
            let chunkDir = Path("${CHUNK_DIR}/${uploadId}")
            let finalFile = Path("${chunkDir}/${fileName}")

            if (!exists(chunkDir)) {
                let errorResponse = "{\"success\":0,\"error\":\"Upload directory not found for ${uploadId}\"}"
                ctx.status(HttpStatusCode.STATUS_BAD_REQUEST)
                ctx.json(errorResponse)
                return
            }

            // 执行分片合并
            try {
                mergeChunks(chunkDir.toString(), finalFile.toString())
            } catch (e: Exception) {
                let errorResponse = "{\"success\":0,\"error\":\"Failed to merge chunks: ${e.message}\"}"
                ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
                ctx.json(errorResponse)
                return
            }

            // 检查合并后的文件是否存在
            if (!exists(finalFile)) {
                let errorResponse = "{\"success\":0,\"error\":\"Merged file not found at ${chunkDir}/${fileName}\"}"
                ctx.status(HttpStatusCode.STATUS_BAD_REQUEST)
                ctx.json(errorResponse)
                return
            }

            // 将文件移动到归档目录
            let archivePath = "./data/archive"
            let archiveDir = Path(archivePath)
            if (!exists(archiveDir)) {
                Directory.create(archiveDir, recursive: true)
            }

            let finalArchivePath = Path("${archivePath}/${fileName}")

            // 移动文件到归档目录
            try {
                copyFile(finalFile, finalArchivePath)
                remove(finalFile) // 删除临时文件
            } catch (e: Exception) {
                let errorResponse = "{\"success\":0,\"error\":\"Failed to move file to archive directory: ${e.message}\"}"
                ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
                ctx.json(errorResponse)
                return
            }

            // 调用Shinobu服务处理归档文件（入库和缩略图生成）
            let shinobuService = ShinobuService.getInstance()
            let processResult = shinobuService.processUploadedArchiveFile(finalArchivePath.toString())

            if (processResult.success) {
                // 清理上传目录
                cleanupUploadDir(chunkDir)

                let response = "{\"success\":1,\"id\":\"${processResult.archiveId}\"}"
                ctx.json(response)
            } else {
                // 如果处理失败，删除已移动的文件
                try {
                    remove(finalArchivePath)
                } catch (_) {
                    // 忽略删除错误
                }
                let errorResponse = "{\"success\":0,\"error\":\"${processResult.error}\"}"
                ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
                ctx.json(errorResponse)
            }
        } catch (e: Exception) {
            let errorResponse = "{\"success\":0,\"error\":\"${e.message}\"}"
            ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
            ctx.json(errorResponse)
        }
    }

    /**
     * 取消上传
     * DELETE /api/archives/upload/:uploadId
     */
    public static func cancelUpload(ctx: JoyContext): Unit {
        try {
            let uploadId = ctx.getParam("uploadId") ?? ""

            if (uploadId.size == 0) {
                let errorResponse = "{\"success\":0,\"error\":\"Upload ID is required\"}"
                ctx.status(HttpStatusCode.STATUS_BAD_REQUEST)
                ctx.json(errorResponse)
                return
            }

            // 清理上传会话
            let uploadDir = Path("${CHUNK_DIR}/${uploadId}")
            if (exists(uploadDir)) {
                cleanupUploadDir(uploadDir)
            }

            let response = "{\"success\":1}"
            ctx.json(response)
        } catch (e: Exception) {
            let errorResponse = "{\"success\":0,\"error\":\"${e.message}\"}"
            ctx.status(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR)
            ctx.json(errorResponse)
        }
    }

    /**
     * 生成上传ID
     */
    private static func generateUploadId(): String {
        let content = DateTime.now().toString() + Random(3).nextBits(32).toString()

        // 使用 SHA1 算法生成哈希
        var sha1Instance = SHA1()
        sha1Instance.write(content.toArray())
        let hash: Array<Byte> = sha1Instance.finish()

        // 转换为十六进制字符串
        let result = toHexString(hash)
        return "upload_session_${toHexString(hash)}"
    }

    /**
     * 创建临时目录
     */
    private static func createTempDirectories(): Unit {
        if (!exists(Path(CHUNK_DIR))) {
            Directory.create(Path(CHUNK_DIR), recursive: true)
        }
    }

    /**
     * 清理上传目录
     */
    private static func cleanupUploadDir(uploadDir: Path): Unit {
        try {
            if (exists(uploadDir)) {
                // 递归删除目录及其内容
                try {
                    remove(uploadDir, recursive: true)
                } catch (e: Exception) {
                    println("Error removing upload directory: ${e.message}")
                }
            }
        } catch (e: Exception) {
            println("Error cleaning up upload directory: ${e.message}")
        }
    }

    /**
     * 处理合并后的文件
     */
    private static func processMergedFile(
        filePath: String,
        title: String,
        tags: String,
        summary: String,
        categoryId: String,
        fileChecksum: String
    ): String {
        try {
            // 获取ShinobuService实例
            let shinobu = ShinobuService.getInstance()
            let archivePath = ShinobuService.getArchivePath().toString()

            // 构建目标文件路径
            let fileName = Path(filePath).fileName
            let targetPath = FileUtils.joinPath(archivePath, fileName)

            // 移动文件到归档目录
            let sourceFile = Path(filePath)
            if (exists(sourceFile)) {
                // 简化处理：直接复制文件
                copyFile(sourceFile, Path(targetPath))
            }

            // 生成归档ID
            let archiveId = "archive_${generateUploadId()}"

            // 这里应该保存到数据库
            // 简化处理，直接返回ID

            return archiveId
        } catch (e: Exception) {
            println("Error processing merged file: ${e.message}")
            return ""
        }
    }

    /**
     * 复制文件
     */
    private static func copyFile(source: Path, target: Path): Unit {
        try (sourceFile = File(source, Read)) {
            try (targetFile = File(target, Write)) {
                let buffer = Array<Byte>(1024 * 1024, {i => 0}) // 1MB buffer
                var bytesRead = sourceFile.read(buffer)
                while (bytesRead > 0) {
                    targetFile.write(buffer[0..bytesRead])
                    bytesRead = sourceFile.read(buffer)
                }
            }
        }
    }

    /**
     * 合并分片文件
     */
    private static func mergeChunks(chunkDir: String, outputFile: String): Unit {
        // 获取所有分片文件并按序号排序
        let chunkFiles = ArrayList<Path>()
        let dir = Path(chunkDir)

        // 检查目录是否存在
        if (!exists(dir)) {
            throw Exception("Chunk directory does not exist: ${chunkDir}")
        }

        // 遍历目录中的所有文件
        for (entry in Directory.readFrom(dir)) {
            if (!entry.isDirectory()) {
                let fileName = entry.path.fileName.toString()
                // 检查文件名是否匹配分片模式 (chunk_0.bin, chunk_1.bin, etc.)
                if (fileName.startsWith("chunk_") && fileName.endsWith(".bin")) {
                    chunkFiles.add(entry.path)
                }
            }
        }

        // 检查是否找到了分片文件
        if (chunkFiles.size == 0) {
            throw Exception("No chunk files found in directory: ${chunkDir}")
        }

        println("Found ${chunkFiles.size} chunk files to merge")

        // 简单排序：转换为数组进行排序
        let chunkArray = Array<Path>(chunkFiles.size, {i => chunkFiles[i]})

        // 冒泡排序按分片序号排序
        for (i in 0..chunkArray.size - 1) {
            for (j in 0..chunkArray.size - i - 1) {
                let aName = chunkArray[j].fileName.toString()
                let bName = chunkArray[j + 1].fileName.toString()

                try {
                    let aIndex = Int64.parse(aName.removePrefix("chunk_").removeSuffix(".bin"))
                    let bIndex = Int64.parse(bName.removePrefix("chunk_").removeSuffix(".bin"))
                    if (aIndex > bIndex) {
                        // 交换
                        let temp = chunkArray[j]
                        chunkArray[j] = chunkArray[j + 1]
                        chunkArray[j + 1] = temp
                    }
                } catch (e: Exception) {
                    println("Failed to parse chunk index from filename: ${aName} or ${bName}")
                    throw Exception("Invalid chunk filename format: ${e.message}")
                }
            }
        }

        // 创建输出文件
        try (outputFileStream = File(Path(outputFile), Write)) {
            let buffer = Array<Byte>(1024 * 1024, {i => 0}) // 1MB buffer

            // 逐个读取分片并写入输出文件
            for (chunkFile in chunkArray) {
                println("Merging chunk: ${chunkFile.fileName}")
                
                // 检查分片文件是否存在
                if (!exists(chunkFile)) {
                    throw Exception("Chunk file does not exist: ${chunkFile}")
                }
                
                try (chunkFileStream = File(chunkFile, Read)) {
                    var bytesRead = chunkFileStream.read(buffer)
                    while (bytesRead > 0) {
                        // 确保bytesRead不超过buffer大小
                        if (bytesRead > buffer.size) {
                            bytesRead = buffer.size
                        }
                        // 批量写入数据，避免逐字节写入
                        outputFileStream.write(buffer[0..bytesRead])
                        bytesRead = chunkFileStream.read(buffer)
                    }
                }
            }
        }

        println("Successfully merged ${chunkArray.size} chunks into ${outputFile}")

        // 不在这里清理分片目录，让调用方负责清理
    }
}
