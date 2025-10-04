package lrr4cj.config

import std.database.sql.*
import opengauss.driver.*
import std.io.*
import std.fs.*
import std.time.*
import std.env.*

/**
 * 数据库配置类
 */
public class DatabaseConfig {
    public static var host: String = getVariable("DB_HOST") ?? "127.0.0.1"
    public static var port: Int32 = 5432
    public static var database: String = getVariable("DB_NAME") ?? "lgr"
    public static var username: String = getVariable("DB_USER") ?? "lgr"
    public static var password: String = getVariable("DB_PASSWORD") ?? "lgr"
    
    /**
     * 获取数据库连接字符串
     */
    public static func getConnectionString(): String {
        return "postgresql://" + username + ":" + password + "@" + host + ":" + port.toString() + "/" + database
    }
    
    /**
     * 获取数据库驱动
     */
    public static func getDriver(): Option<Driver> {
        return DriverManager.getDriver("opengauss")
    }
    
    /**
     * 创建数据库连接
     */
    public static func createConnection(): Option<Connection> {
        let drvopt = getDriver()
        match (drvopt) {
            case Some(drv) =>
                let ds = drv.open(getConnectionString())
                try {
                    let conn = ds.connect()
                    return Some(conn)
                } catch (e: Exception) {
                    println("数据库连接失败")
                    return None
                }
            case None =>
                println("无法获取opengauss驱动")
                return None
        }
    }
    
    /**
     * 初始化数据库表结构
     */
    public static func initializeDatabase(): Bool {
        let connOpt = createConnection()
        match (connOpt) {
            case Some(conn) =>
                try {
                    // 创建归档表
                    let createArchivesTable = "CREATE TABLE IF NOT EXISTS archives (id VARCHAR(40) PRIMARY KEY, title VARCHAR(255) NOT NULL, filename VARCHAR(255) NOT NULL, extension VARCHAR(10) NOT NULL, pagecount INTEGER DEFAULT 0, progress INTEGER DEFAULT 0, isnew BOOLEAN DEFAULT true, tags TEXT, lastreadtime BIGINT DEFAULT 0, summary TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
                    
                    // 创建分类表
                    let createCategoriesTable = "CREATE TABLE IF NOT EXISTS categories (id VARCHAR(20) PRIMARY KEY, name VARCHAR(100) NOT NULL, search TEXT, pinned BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
                    
                    // 创建归档分类关联表
                    let createArchiveCategoriesTable = "CREATE TABLE IF NOT EXISTS archive_categories (archive_id VARCHAR(40) REFERENCES archives(id) ON DELETE CASCADE, category_id VARCHAR(20) REFERENCES categories(id) ON DELETE CASCADE, PRIMARY KEY (archive_id, category_id))"
                    
                    // 创建单行本表
                    let createTankoubonsTable = "CREATE TABLE IF NOT EXISTS tankoubons (id VARCHAR(20) PRIMARY KEY, name VARCHAR(100) NOT NULL, summary TEXT, tags TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
                    
                    // 创建单行本归档关联表
                    let createTankoubonArchivesTable = "CREATE TABLE IF NOT EXISTS tankoubon_archives (tankoubon_id VARCHAR(20) REFERENCES tankoubons(id) ON DELETE CASCADE, archive_id VARCHAR(40) REFERENCES archives(id) ON DELETE CASCADE, PRIMARY KEY (tankoubon_id, archive_id))"
                    
                    // 创建任务队列表
                    let createMinionJobsTable = "CREATE TABLE IF NOT EXISTS minion_jobs (id VARCHAR(40) PRIMARY KEY, task VARCHAR(50) NOT NULL, state VARCHAR(20) DEFAULT 'inactive', notes TEXT, error TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
                    
                    // 执行建表语句
                    let stmt1 = conn.prepareStatement(createArchivesTable)
                    stmt1.update()
                    
                    let stmt2 = conn.prepareStatement(createCategoriesTable)
                    stmt2.update()
                    
                    let stmt3 = conn.prepareStatement(createArchiveCategoriesTable)
                    stmt3.update()
                    
                    let stmt4 = conn.prepareStatement(createTankoubonsTable)
                    stmt4.update()
                    
                    let stmt5 = conn.prepareStatement(createTankoubonArchivesTable)
                    stmt5.update()
                    
                    let stmt6 = conn.prepareStatement(createMinionJobsTable)
                    stmt6.update()
                    
                    conn.close()
                    return true
                } catch (e: Exception) {
                    println("数据库初始化失败")
                    return false
                }
            case None =>
                println("无法连接到数据库")
                return false
        }
    }
}