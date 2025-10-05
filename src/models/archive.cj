package lrr4cj.models

import cjoy.json.*
import std.database.sql.*
import lrr4cj.config.*
import std.collection.*

/**
 * 归档数据模型
 */
public class Archive {
    public var id: String = ""
    public var title: String = ""
    public var filename: String = ""
    public var summary: String = ""
    public var thumbhash: String = ""
    public var created_at: String = ""
    public var updated_at: String = ""
    public var relative_path: String = ""
    public var file_size: Int64 = 0
    public var isNew: Bool = false
    public var pagecount: Int32 = 0
    public var last_read_time: String = ""
    public var progress: Int32 = 0
}

/**
 * 归档数据访问层
 */
public class ArchiveModel {
    /**
     * 获取所有归档
     */
    public static func getAllArchives(): Array<Archive> {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                var archives: ArrayList<Archive> = ArrayList<Archive>()
                try {
                    let stmt = conn.prepareStatement("SELECT arcid, title, filename, summary, thumbhash, created_at, updated_at, relative_path, file_size, isnew, pagecount, last_read_time, progress FROM archives ORDER BY id")
                    let rs = stmt.query()
                    
                    while (rs.next()) {
                        let archive = Archive()
                        archive.id = rs.getOrNull<String>(1) ?? ""
                        archive.title = rs.getOrNull<String>(2) ?? ""
                        archive.filename = rs.getOrNull<String>(3) ?? ""
                        archive.summary = rs.getOrNull<String>(4) ?? ""
                        archive.thumbhash = rs.getOrNull<String>(5) ?? ""
                        archive.created_at = rs.getOrNull<String>(6) ?? ""
                        archive.updated_at = rs.getOrNull<String>(7) ?? ""
                        archive.relative_path = rs.getOrNull<String>(8) ?? ""
                        archive.file_size = rs.getOrNull<Int64>(9) ?? 0
                        archive.isNew = rs.getOrNull<Bool>(10) ?? false
                        archive.pagecount = rs.getOrNull<Int32>(11) ?? 0
                        archive.last_read_time = rs.getOrNull<String>(12) ?? ""
                        archive.progress = rs.getOrNull<Int32>(13) ?? 0
                        archives.add(archive)
                    }
                    
                    conn.close()
                    return archives.toArray()
                } catch (e: Exception) {
                    println("查询归档失败: ${e}")
                    conn.close()
                    return Array<Archive>()
                }
            case None =>
                println("无法连接到数据库")
                return Array<Archive>()
        }
    }
    
    /**
     * 根据 ID 获取归档
     */
    public static func getArchiveById(id: String): Archive {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                try {
                    let stmt = conn.prepareStatement("SELECT arcid, title, filename, summary, thumbhash, created_at, updated_at, relative_path, file_size, isnew, pagecount, last_read_time, progress FROM archives WHERE arcid = ?")
                    stmt.set(1, id)
                    let rs = stmt.query()
                    
                    if (rs.next()) {
                        let archive = Archive()
                        archive.id = rs.getOrNull<String>(1) ?? ""
                        archive.title = rs.getOrNull<String>(2) ?? ""
                        archive.filename = rs.getOrNull<String>(3) ?? ""
                        archive.summary = rs.getOrNull<String>(4) ?? ""
                        archive.thumbhash = rs.getOrNull<String>(5) ?? ""
                        archive.created_at = rs.getOrNull<String>(6) ?? ""
                        archive.updated_at = rs.getOrNull<String>(7) ?? ""
                        archive.relative_path = rs.getOrNull<String>(8) ?? ""
                        archive.file_size = rs.getOrNull<Int64>(9) ?? 0
                        archive.isNew = rs.getOrNull<Bool>(10) ?? false
                        archive.pagecount = rs.getOrNull<Int32>(11) ?? 0
                        archive.last_read_time = rs.getOrNull<String>(12) ?? ""
                        archive.progress = rs.getOrNull<Int32>(13) ?? 0
                        
                        conn.close()
                        return archive
                    }
                    
                    conn.close()
                } catch (e: Exception) {
                    println("查询归档失败: ${e}")
                    conn.close()
                }
            case None =>
                println("无法连接到数据库")
        }
        return Archive()
    }
    
    /**
     * 搜索归档
     */
    public static func searchArchives(filter: String, category: String, start: Int32, count: Int32): Array<Archive> {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                var archives: ArrayList<Archive> = ArrayList<Archive>()
                try {
                    var sql = "SELECT id, arcid, filename, title, summary, thumbhash, created_at, updated_at, relative_path, file_size, isnew, pagecount, last_read_time, progress FROM archives"
                    
                    if (filter.size > 0) {
                        sql += " WHERE title LIKE ? OR filename LIKE ?"
                    }
                    
                    sql += " ORDER BY created_at DESC LIMIT ${count} OFFSET ${start}"
                    
                    // 打印SQL语句用于调试
                    println("执行SQL: ${sql}")
                    println("参数 - filter: '${filter}', start: ${start}, count: ${count}")
                    
                    let stmt = conn.prepareStatement(sql)
                    
                    if (filter.size > 0) {
                        stmt.set<String>(1, "%${filter}%")
                        stmt.set<String>(2, "%${filter}%")
                    }
                    
                    let rs = stmt.query()
                    
                    while (rs.next()) {
                        let archive = Archive()
                        // 使用索引读取数据，跳过progress字段避免索引14的问题
                        try {
                            archive.id = rs.getOrNull<String>(2) ?? ""        // arcid
                            archive.filename = rs.getOrNull<String>(3) ?? ""  // filename
                            archive.title = rs.getOrNull<String>(4) ?? ""     // title
                            archive.summary = rs.getOrNull<String>(5) ?? ""   // summary
                            archive.thumbhash = rs.getOrNull<String>(6) ?? "" // thumbhash
                            archive.created_at = rs.getOrNull<String>(7) ?? "" // created_at
                            archive.updated_at = rs.getOrNull<String>(8) ?? "" // updated_at
                            archive.relative_path = rs.getOrNull<String>(9) ?? "" // relative_path
                            archive.file_size = rs.getOrNull<Int64>(10) ?? 0  // file_size
                            archive.isNew = rs.getOrNull<Bool>(11) ?? false   // isnew
                            archive.pagecount = rs.getOrNull<Int32>(12) ?? 0  // pagecount
                            archive.last_read_time = rs.getOrNull<String>(13) ?? "" // last_read_time
                            // 暂时跳过progress字段，避免索引14的问题
                            archive.progress = 0
                            archives.add(archive)
                        } catch (e: Exception) {
                            println("读取字段时出错: ${e}")
                            throw e
                        }
                    }
                    
                    conn.close()
                    return archives.toArray()
                } catch (e: Exception) {
                    println("搜索归档失败: ${e}")
                    conn.close()
                    return Array<Archive>()
                }
            case None =>
                println("无法连接到数据库")
                return Array<Archive>()
        }
    }
    
    /**
     * 获取归档元数据
     */
    public static func getArchiveMetadata(id: String): Archive {
        return getArchiveById(id)
    }
    
    /**
     * 获取归档缩略图
     */
    public static func getArchiveThumbnail(id: String): String {
        return "/api/archives/${id}/thumbnail"
    }
    
    /**
     * 获取归档文件
     */
    public static func getArchiveFile(id: String): String {
        return "/api/archives/${id}/file"
    }
}