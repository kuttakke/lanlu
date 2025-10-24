package dotenv

import std.collection.*
import std.env.*
import std.fs.*
import std.io.*

// 全局变量，存储解析后的环境变量
public let envMap: HashMap<String, String> = HashMap<String, String>()

internal enum ReadUntilMode {

    | Include // 读取并包含在结果中
    | Skip // 读取但不包含在结果中
    | Exclude // 不读取

}

internal class TextReader {
    
    private var input: String
    private var cursor: Int64 = 0

    public TextReader(input: String) {
        this.input = input
    }

    func skip() {
        this.cursor += 1
    }
    
    func skipUntil(rune: Rune, skipTarget!: Bool = false) {
        while (this.readable() && this.peek() != rune) {
            this.skip()
        }
        if (this.readable() && skipTarget) {
            this.skip()
        }
    }
    
    func skipWhitespace() {
        while (this.readable() && this.peek().isAsciiWhiteSpace() && this.peek() != r'\n') {
            this.skip()
        }
    }
    
    func read(): Rune {
        let result = this.input[this.cursor]
        this.cursor += 1
        return Rune(result)
    }

    func readUntil(rune: Rune, mode!: ReadUntilMode = ReadUntilMode.Include): String {
        let result = StringBuilder()
        while (this.readable() && this.peek() != rune) {
            result.append(this.read())
        }
        match (mode) {
            case ReadUntilMode.Include => 
                if (this.readable()) {
                    result.append(this.read())
                }
            case ReadUntilMode.Skip => 
                if (this.readable()) {
                    this.skip()
                }
            case ReadUntilMode.Exclude => ()
        }
        return result.toString()
    }

    func peek(): Rune {
        return Rune(this.input[this.cursor])
    }

    func readable(): Bool {
        return this.input.size > this.cursor
    }

}

/// Dotenv 类，用于加载 .env 文件中的环境变量
/// 类似于 Node.js 的 require('dotenv').config()
public class Dotenv {
    private var configMap: Map<String, String>
    
    public init(map: Map<String, String>) {
        this.configMap = map
    }
    
    /// 读取配置项
    /// @param key 配置项的键名
    /// @return 配置项的值，如果不存在则返回None
    public func read(key: String): Option<String> {
        match (configMap.get(key)) {
            case Some(value) => Some(value)
            case None => None
        }
    }
    
    /// 读取配置项，如果不存在则返回默认值
    /// @param key 配置项的键名
    /// @param defaultValue 默认值
    /// @return 配置项的值
    public func read(key: String, defaultValue: String): String {
        match (configMap.get(key)) {
            case Some(value) => value
            case None => defaultValue
        }
    }
    
    /// 从 .env 文件加载环境变量
    public static func config(): Map<String, String> {
        return config(".env")
    }
    
    /// 从指定路径加载环境变量文件
    /// @param path .env 文件的路径
    /// @return 加载的环境变量
    public static func config(path: String): Map<String, String> {
        let loaded = parse(path)
        
        // 将解析的变量设置到环境变量中
        for ((key, value) in loaded) {
            setVariable(key, value)
        }
        
        return loaded
    }
    
    /// 解析 .env 文件并返回环境变量Map，但不设置到系统环境变量
    /// @param path .env 文件的路径
    /// @return 解析的环境变量
    public static func parse(): Map<String, String> {
        return parse(".env")
    }
    
    /// 解析指定路径的 .env 文件并返回环境变量Map，但不设置到系统环境变量
    /// @param path .env 文件的路径
    /// @return 解析的环境变量
    public static func parse(path: String): Map<String, String> {
        let envPath = Path(path)
        let loaded = HashMap<String, String>()
        
        try {
            let file = File(envPath, OpenMode.Read)
            let content = StringReader(file).readToEnd()
            
            

            let reader = TextReader(content)

            while (reader.readable()) {
                if (reader.peek() == r'#') { // 跳过注释
                    reader.skipUntil(r'\n', skipTarget: true)
                    continue
                }
                let key = reader.readUntil(r'=', mode: ReadUntilMode.Skip).trimAscii()
                if (!reader.readable()) {
                    break
                }
                reader.skipWhitespace()
                if (!reader.readable()) {
                    break
                }
                if (reader.peek() == r'\n') {
                    reader.skip()
                    continue
                }
                var value = if (reader.peek() == r'"') {
                    let builder = StringBuilder()
                    reader.skip()
                    if (!reader.readable()) {
                        break
                    }
                    var foundQuote = false
                    while(reader.readable()) {
                        let rune = reader.read()
                        if (rune == r'"') {
                            foundQuote = true
                            break
                        }
                        builder.append(rune)
                        // 不确定是否要支持转义字符
                        /*if (rune != r'\\') {
                            builder.append(rune)
                            continue
                        }
                        if (reader.peek() == r'"') {
                            reader.skip()
                            builder.append('"')
                            continue
                        }
                        builder.append('\\')*/
                    }
                    if (reader.readable()) {
                        reader.skipUntil(r'\n', skipTarget: true)
                    }
                    if (!foundQuote) {
                        continue
                    }
                    builder.toString()
                } else {
                    let result = reader.readUntil(r'\n', mode: ReadUntilMode.Skip)
                    let commentIndex = result.indexOf('#')
                    match (commentIndex) {
                        case Some(index) =>
                            result[..index]
                        case None => result
                    }
                }

                value = value.trimAscii()

                if (value.contains('$')) {
                    for ((varKey, varVal) in getVariables()) {
                        if (value.contains('\$${varKey}')) {
                            value = value.replace('\$${varKey}', varVal)
                        }
                        if (value.contains('\${${varKey}}')) {
                            value = value.replace('\${${varKey}}', varVal)
                        }
                        if (!value.contains('$')) { // 快速跳出
                            break
                        }
                    }
                }

                loaded[key] = value
                // 同时更新全局变量
                envMap[key] = value
            }
            
            // 环境变量解析成功
            
            file.close()
        } catch (e: Exception) {
            
        }

        return loaded
    }
    
    /// 获取配置实例
    /// @return Dotenv实例，可以通过read方法访问配置
    public static func createConfig(): Dotenv {
        return Dotenv(parse())
    }
    
    /// 从指定路径获取配置实例
    /// @param path .env 文件的路径
    /// @return Dotenv实例，可以通过read方法访问配置
    public static func createConfig(path: String): Dotenv {
        return Dotenv(parse(path))
    }
}