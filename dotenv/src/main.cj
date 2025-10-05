package dotenv

import std.io.*
import std.fs.*
import std.env.*

/// Dotenv 类，用于加载 .env 文件中的环境变量
/// 类似于 Node.js 的 require('dotenv').config()
public class Dotenv {
    
    /// 从 .env 文件加载环境变量
    public static func config(): Unit {
        config(".env")
    }
    
    /// 从指定路径加载环境变量文件
    /// @param path .env 文件的路径
    public static func config(path: String): Unit {
        let envPath = Path(path)
        
        try {
            let file = File(envPath, OpenMode.Read)
            let reader = StringReader(file)
            let content = reader.readToEnd()
            
            println("Loading environment variables from ${path}...")
            
            for (line in content.split('\n')) {
                // 跳过空行和注释
                if (line.size == 0 || line.startsWith("#")) {
                    continue
                }

                var finalLine: String = line

                // 删除末尾注释
                let commentIndex = line.indexOf('#')
                match (commentIndex) {
                    case Some(index) => 
                        if (index > 0) {
                            finalLine = line[..index]
                        }
                    case None => ()
                }
                
                // 解析键值对
                let equalIndex = finalLine.indexOf('=')
                match (equalIndex) {
                    case Some(index) => 
                        if (index > 0) {
                            let keyPart = finalLine.split('=')
                            if (keyPart.size == 2) {
                                let key = keyPart[0].trimAscii() // 提取键同时去掉前后的空格
                                let value = keyPart[1].trimAscii() // 提取值同时去掉前后的空格

                                // 设置环境变量
                                setVariable(key, value)
                            }
                        }
                    case None => ()
                }
            }
            
            println("Environment variables loaded successfully!")
            
            file.close()
        } catch (e: Exception) {
            println("Warning: .env file not found at ${path} or error loading .env file: ${e}")
        }
    }
}