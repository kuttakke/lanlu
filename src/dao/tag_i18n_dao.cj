package lrr4cj.dao

import std.database.sql.*
import std.collection.*
import stdx.log.*
import lrr4cj.config.*
import lrr4cj.utils.*

/**
 * Tag i18n 映射数据结构
 */
public class TagI18nEntry {
    public var id: Int64 = 0
    public var tag: String = ""
    public var lang: String = ""
    public var text: String = ""
    public var intro: String = ""
    public var links: String = ""
    public var created_at: String = ""
    public var updated_at: String = ""

    public init() {}
}

/**
 * Tag i18n 合并视图（按 tag 一行，包含 zh/en）
 */
public class TagI18nMergedRow {
    public var tag: String = ""
    public var zh: String = ""
    public var en: String = ""
    public var zh_intro: String = ""
    public var en_intro: String = ""
    public var zh_links: String = ""
    public var en_links: String = ""

    public init() {}
}

/**
 * Tag i18n 映射 DAO
 */
public class TagI18nDao {

    public static func getByLang(lang: String): Array<TagI18nEntry> {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let stmt = conn.prepareStatement(
                    "SELECT id, tag, lang, text, intro, links, created_at, updated_at FROM tag_i18n WHERE lang = ? ORDER BY tag")
                try {
                    stmt.set(0, lang)
                    let rs = stmt.query()
                    var list: ArrayList<TagI18nEntry> = ArrayList<TagI18nEntry>()
                    try {
                        while (rs.next()) {
                            let item = TagI18nEntry()
                            item.id = rs.getOrNull<Int64>(0) ?? 0
                            item.tag = rs.getOrNull<String>(1) ?? ""
                            item.lang = rs.getOrNull<String>(2) ?? ""
                            item.text = rs.getOrNull<String>(3) ?? ""
                            item.intro = rs.getOrNull<String>(4) ?? ""
                            item.links = rs.getOrNull<String>(5) ?? ""
                            item.created_at = rs.getOrNull<String>(6) ?? ""
                            item.updated_at = rs.getOrNull<String>(7) ?? ""
                            list.add(item)
                        }
                    } finally {
                        rs.close()
                    }
                    return list.toArray()
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").error("查询 tag_i18n 失败", ("error", e.message), ("lang", lang))
                    return Array<TagI18nEntry>()
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return Array<TagI18nEntry>()
        }
    }

    /**
     * 列表查询（用于管理界面）
     */
    public static func list(q!: String = "", limit!: Int32 = 5000, offset!: Int32 = 0): Array<TagI18nEntry> {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let hasQuery = q.trimAscii().size > 0
                let sql = if (hasQuery) {
                    "SELECT id, tag, lang, text, intro, links, created_at, updated_at FROM tag_i18n WHERE tag ILIKE ? OR text ILIKE ? OR intro ILIKE ? ORDER BY tag, lang LIMIT ? OFFSET ?"
                } else {
                    "SELECT id, tag, lang, text, intro, links, created_at, updated_at FROM tag_i18n ORDER BY tag, lang LIMIT ? OFFSET ?"
                }
                let stmt = conn.prepareStatement(sql)
                try {
                    var idx: Int64 = 0
                    if (hasQuery) {
                        let like = "%" + q.trimAscii() + "%"
                        stmt.set(idx, like); idx += 1
                        stmt.set(idx, like); idx += 1
                        stmt.set(idx, like); idx += 1
                    }
                    stmt.set(idx, limit); idx += 1
                    stmt.set(idx, offset)

                    let rs = stmt.query()
                    var list: ArrayList<TagI18nEntry> = ArrayList<TagI18nEntry>()
                    try {
                        while (rs.next()) {
                            let item = TagI18nEntry()
                            item.id = rs.getOrNull<Int64>(0) ?? 0
                            item.tag = rs.getOrNull<String>(1) ?? ""
                            item.lang = rs.getOrNull<String>(2) ?? ""
                            item.text = rs.getOrNull<String>(3) ?? ""
                            item.intro = rs.getOrNull<String>(4) ?? ""
                            item.links = rs.getOrNull<String>(5) ?? ""
                            item.created_at = rs.getOrNull<String>(6) ?? ""
                            item.updated_at = rs.getOrNull<String>(7) ?? ""
                            list.add(item)
                        }
                    } finally {
                        rs.close()
                    }
                    return list.toArray()
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").error("列表查询 tag_i18n 失败", ("error", e.message), ("q", q))
                    return Array<TagI18nEntry>()
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return Array<TagI18nEntry>()
        }
    }

    /**
     * 只更新 text（不覆盖 intro/links）
     */
    public static func upsert(tag: String, lang: String, text: String): Bool {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let stmt = conn.prepareStatement(
                    "INSERT INTO tag_i18n (tag, lang, text) VALUES (?, ?, ?) ON CONFLICT (tag, lang) DO UPDATE SET text = EXCLUDED.text, updated_at = CURRENT_TIMESTAMP")
                try {
                    stmt.set(0, tag)
                    stmt.set(1, lang)
                    stmt.set(2, text)
                    stmt.update()
                    return true
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").error("upsert tag_i18n 失败", ("error", e.message), ("tag", tag), ("lang", lang))
                    return false
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return false
        }
    }

    /**
     * 更新 text + intro + links（用于批量导入/同步）
     */
    public static func upsertRich(tag: String, lang: String, text: String, intro: String, links: String): Bool {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let stmt = conn.prepareStatement(
                    "INSERT INTO tag_i18n (tag, lang, text, intro, links) VALUES (?, ?, ?, ?, ?) ON CONFLICT (tag, lang) DO UPDATE SET text = EXCLUDED.text, intro = EXCLUDED.intro, links = EXCLUDED.links, updated_at = CURRENT_TIMESTAMP")
                try {
                    stmt.set(0, tag)
                    stmt.set(1, lang)
                    stmt.set(2, text)
                    stmt.set(3, intro)
                    stmt.set(4, links)
                    stmt.update()
                    return true
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").error("upsertRich tag_i18n 失败", ("error", e.message), ("tag", tag), ("lang", lang))
                    return false
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return false
        }
    }

    public static func delete(tag: String, lang: String): Bool {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let stmt = conn.prepareStatement("DELETE FROM tag_i18n WHERE tag = ? AND lang = ?")
                try {
                    stmt.set(0, tag)
                    stmt.set(1, lang)
                    stmt.update()
                    return true
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").error("删除 tag_i18n 失败", ("error", e.message), ("tag", tag), ("lang", lang))
                    return false
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return false
        }
    }

    /**
     * 合并分页：返回当前系统 tag（tags 表 / archives.tags / tag_i18n.tag）与 zh/en 翻译
     * q 同时匹配 tag/zh/en
     */
    public static func listMerged(q!: String = "", limit!: Int32 = 100, offset!: Int32 = 0): Array<TagI18nMergedRow> {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let hasQuery = q.trimAscii().size > 0
                // NOTE: 为了兼容 openGauss 方言/权限差异，这里只依赖 tags/tag_i18n 两表，不使用 unnest/string_to_array/TRIM 等函数。
                let sql = """
                    WITH all_tags AS (
                        SELECT DISTINCT name AS tag FROM tags
                        UNION
                        SELECT DISTINCT tag AS tag FROM tag_i18n
                    )
                    SELECT
                        a.tag AS tag,
                        COALESCE(zh.text, '') AS zh_text,
                        COALESCE(en.text, '') AS en_text,
                        COALESCE(zh.intro, '') AS zh_intro,
                        COALESCE(en.intro, '') AS en_intro,
                        COALESCE(zh.links, '') AS zh_links,
                        COALESCE(en.links, '') AS en_links
                    FROM all_tags a
                    LEFT JOIN tag_i18n zh ON zh.tag = a.tag AND zh.lang = 'zh'
                    LEFT JOIN tag_i18n en ON en.tag = a.tag AND en.lang = 'en'
                    ${if (hasQuery) { "WHERE a.tag ILIKE ? OR COALESCE(zh.text,'') ILIKE ? OR COALESCE(en.text,'') ILIKE ?" } else { "" }}
                    ORDER BY a.tag
                    LIMIT ? OFFSET ?
                """

                let stmt = conn.prepareStatement(sql)
                try {
                    var idx: Int64 = 0
                    if (hasQuery) {
                        let like = "%" + q.trimAscii() + "%"
                        stmt.set(idx, like); idx += 1
                        stmt.set(idx, like); idx += 1
                        stmt.set(idx, like); idx += 1
                    }
                    stmt.set(idx, limit); idx += 1
                    stmt.set(idx, offset)

                    let rs = stmt.query()
                    var list: ArrayList<TagI18nMergedRow> = ArrayList<TagI18nMergedRow>()
                    try {
                        while (rs.next()) {
                            let row = TagI18nMergedRow()
                            row.tag = rs.getOrNull<String>(0) ?? ""
                            row.zh = rs.getOrNull<String>(1) ?? ""
                            row.en = rs.getOrNull<String>(2) ?? ""
                            row.zh_intro = rs.getOrNull<String>(3) ?? ""
                            row.en_intro = rs.getOrNull<String>(4) ?? ""
                            row.zh_links = rs.getOrNull<String>(5) ?? ""
                            row.en_links = rs.getOrNull<String>(6) ?? ""
                            list.add(row)
                        }
                    } finally {
                        rs.close()
                    }
                    return list.toArray()
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").warn("listMerged 失败，回退仅从tag_i18n读取", ("error", e.message))
                    // fallback：只列出已维护过的条目
                    let fallback = conn.prepareStatement("""
                        SELECT tag,
                               COALESCE(MAX(CASE WHEN lang='zh' THEN text ELSE '' END), '') AS zh_text,
                               COALESCE(MAX(CASE WHEN lang='en' THEN text ELSE '' END), '') AS en_text,
                               COALESCE(MAX(CASE WHEN lang='zh' THEN intro ELSE '' END), '') AS zh_intro,
                               COALESCE(MAX(CASE WHEN lang='en' THEN intro ELSE '' END), '') AS en_intro,
                               COALESCE(MAX(CASE WHEN lang='zh' THEN links ELSE '' END), '') AS zh_links,
                               COALESCE(MAX(CASE WHEN lang='en' THEN links ELSE '' END), '') AS en_links
                        FROM tag_i18n
                        ${if (hasQuery) { "WHERE tag ILIKE ? OR text ILIKE ?" } else { "" }}
                        GROUP BY tag
                        ORDER BY tag
                        LIMIT ? OFFSET ?
                    """)
                    try {
                        var j: Int64 = 0
                        if (hasQuery) {
                            let like2 = "%" + q.trimAscii() + "%"
                            fallback.set(j, like2); j += 1
                            fallback.set(j, like2); j += 1
                        }
                        fallback.set(j, limit); j += 1
                        fallback.set(j, offset)
                        let rs2 = fallback.query()
                        var list2: ArrayList<TagI18nMergedRow> = ArrayList<TagI18nMergedRow>()
                        try {
                            while (rs2.next()) {
                                let row2 = TagI18nMergedRow()
                                row2.tag = rs2.getOrNull<String>(0) ?? ""
                                row2.zh = rs2.getOrNull<String>(1) ?? ""
                                row2.en = rs2.getOrNull<String>(2) ?? ""
                                row2.zh_intro = rs2.getOrNull<String>(3) ?? ""
                                row2.en_intro = rs2.getOrNull<String>(4) ?? ""
                                row2.zh_links = rs2.getOrNull<String>(5) ?? ""
                                row2.en_links = rs2.getOrNull<String>(6) ?? ""
                                list2.add(row2)
                            }
                        } finally {
                            try { rs2.close() } catch (_: Exception) {}
                        }
                        return list2.toArray()
                    } catch (_: Exception) {
                        return Array<TagI18nMergedRow>()
                    } finally {
                        try { fallback.close() } catch (_: Exception) {}
                    }
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return Array<TagI18nMergedRow>()
        }
    }

    public static func countMerged(q!: String = ""): Int64 {
        let connOpt = DatabaseConfig.createConnection()
        match (connOpt) {
            case Some(conn) =>
                let hasQuery = q.trimAscii().size > 0
                // NOTE: 同 listMerged，仅依赖 tags/tag_i18n 两表
                let sql = """
                    WITH all_tags AS (
                        SELECT DISTINCT name AS tag FROM tags
                        UNION
                        SELECT DISTINCT tag AS tag FROM tag_i18n
                    )
                    SELECT COUNT(*)
                    FROM all_tags a
                    LEFT JOIN tag_i18n zh ON zh.tag = a.tag AND zh.lang = 'zh'
                    LEFT JOIN tag_i18n en ON en.tag = a.tag AND en.lang = 'en'
                    ${if (hasQuery) { "WHERE a.tag ILIKE ? OR COALESCE(zh.text,'') ILIKE ? OR COALESCE(en.text,'') ILIKE ?" } else { "" }}
                """
                let stmt = conn.prepareStatement(sql)
                try {
                    if (hasQuery) {
                        let like = "%" + q.trimAscii() + "%"
                        stmt.set(0, like)
                        stmt.set(1, like)
                        stmt.set(2, like)
                    }
                    let rs = stmt.query()
                    try {
                        if (rs.next()) {
                            return rs.getOrNull<Int64>(0) ?? 0
                        }
                    } finally {
                        rs.close()
                    }
                    return 0
                } catch (e: Exception) {
                    getLogger("tag_i18n_dao").warn("countMerged 失败，回退仅统计tag_i18n", ("error", e.message))
                    try {
                        let stmt2 = conn.prepareStatement("""
                            SELECT COUNT(DISTINCT tag)
                            FROM tag_i18n
                            ${if (hasQuery) { "WHERE tag ILIKE ? OR text ILIKE ?" } else { "" }}
                        """)
                        if (hasQuery) {
                            let like2 = "%" + q.trimAscii() + "%"
                            stmt2.set(0, like2)
                            stmt2.set(1, like2)
                        }
                        let rs2 = stmt2.query()
                        try {
                            if (rs2.next()) {
                                return rs2.getOrNull<Int64>(0) ?? 0
                            }
                        } finally {
                            try { rs2.close() } catch (_: Exception) {}
                            try { stmt2.close() } catch (_: Exception) {}
                        }
                        return 0
                    } catch (_: Exception) {
                        return 0
                    }
                } finally {
                    try { stmt.close() } catch (_: Exception) {}
                    try { conn.close() } catch (_: Exception) {}
                }
            case None =>
                getLogger("tag_i18n_dao").error("无法连接到数据库")
                return 0
        }
    }
}
