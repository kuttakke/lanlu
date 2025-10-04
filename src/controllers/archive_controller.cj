package lrr4cj.controllers

import stdx.net.http.HttpStatusCode
import cjoy.*
import cjoy.json.*
import lrr4cj.models.*

public class ArchiveController {
    // GET /api/archives
    public static func getArchives(ctx: JoyContext): Unit {
        // 从数据库获取档案列表
        let archives = ArchiveModel.getAllArchives()
        
        // 手动构建JSON数组
        var archivesJson = "["
        var isFirst = true
        for (archive in archives) {
            if (!isFirst) {
                archivesJson += ","
            }
            isFirst = false
            
            archivesJson += "{"
            archivesJson += "\"arcid\":\"${archive.id}\","
            archivesJson += "\"title\":\"${archive.title}\","
            archivesJson += "\"filename\":\"${archive.filename}\","
            archivesJson += "\"summary\":\"${archive.summary}\","
            archivesJson += "\"thumbhash\":\"${archive.thumbhash}\","
            archivesJson += "\"created_at\":\"${archive.created_at}\","
            archivesJson += "\"updated_at\":\"${archive.updated_at}\","
            archivesJson += "\"relative_path\":\"${archive.relative_path}\","
            archivesJson += "\"file_size\":${archive.file_size},"
            archivesJson += "\"isnew\":${archive.isNew},"
            archivesJson += "\"pagecount\":${archive.pagecount},"
            archivesJson += "\"last_read_time\":\"${archive.last_read_time}\","
            archivesJson += "\"progress\":${archive.progress}"
            archivesJson += "}"
        }
        
        archivesJson += "]"
        
        let result = "{\"operation\":\"get_archives\",\"data\":" + archivesJson + ",\"success\":1}"
        
        ctx.json(result)
    }
    
    // GET /api/archives/{id}
    public static func getArchive(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        let archive = ArchiveModel.getArchiveById(id)

        if (archive.id.size == 0) {
            let errorResponse = "{\"operation\":\"get_archive\",\"error\":\"Archive not found\",\"success\":0}"
            ctx.status(HttpStatusCode.STATUS_NOT_FOUND)
            ctx.json(errorResponse)
            return
        }

        // 手动构建JSON对象
        var archiveJson = "{"
        archiveJson += "\"arcid\":\"${archive.id}\","
        archiveJson += "\"title\":\"${archive.title}\","
        archiveJson += "\"filename\":\"${archive.filename}\","
        archiveJson += "\"summary\":\"${archive.summary}\","
        archiveJson += "\"thumbhash\":\"${archive.thumbhash}\","
        archiveJson += "\"created_at\":\"${archive.created_at}\","
        archiveJson += "\"updated_at\":\"${archive.updated_at}\","
        archiveJson += "\"relative_path\":\"${archive.relative_path}\","
        archiveJson += "\"file_size\":${archive.file_size},"
        archiveJson += "\"isnew\":${archive.isNew},"
        archiveJson += "\"pagecount\":${archive.pagecount},"
        archiveJson += "\"last_read_time\":\"${archive.last_read_time}\","
        archiveJson += "\"progress\":${archive.progress}"
        archiveJson += "}"
        
        let result = "{\"operation\":\"get_archive\",\"data\":" + archiveJson + ",\"success\":1}"
        ctx.json(result)
    }
    
    // PUT /api/archives/{id}/metadata
    public static func updateMetadata(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        // 简化实现，总是返回成功
        let result = "{\"operation\":\"update_metadata\",\"success\":1}"
        ctx.json(result)
    }
    
    // GET /api/archives/{id}/thumbnail
    public static func getThumbnail(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        let thumbnailPath = ArchiveModel.getArchiveThumbnail(id)

        let result = "{\"thumbnail\":\"${thumbnailPath}\"}"
        ctx.json(result)
    }

    // GET /api/archives/{id}/files
    public static func getFiles(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        // 简化实现，返回空文件列表
        let result = "{\"operation\":\"get_files\",\"data\":[],\"success\":1}"
        ctx.json(result)
    }

    // GET /api/archives/{id}/files/{fileIndex}
    public static func getFile(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        let fileIndex = ctx.getParam("fileIndex").getOrThrow()
        let filePath = ArchiveModel.getArchiveFile(id)

        let result = "{\"file\":\"${filePath}\",\"index\":\"${fileIndex}\"}"
        ctx.json(result)
    }

    // POST /api/archives/{id}/extract
    public static func extractArchive(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        // 简化实现，返回一个任务ID
        let taskId = "task_${id}_${Int64(1234567890)}"
        let result = "{\"operation\":\"extract_archive\",\"data\":{\"task_id\":\"${taskId}\"},\"success\":1}"
        ctx.json(result)
    }

    // DELETE /api/archives/{id}
    public static func deleteArchive(ctx: JoyContext): Unit {
        let id = ctx.getParam("id").getOrThrow()
        // 简化实现，总是返回成功
        let result = "{\"operation\":\"delete_archive\",\"success\":1}"
        ctx.json(result)
    }
}