package lrr4cj.utils

import std.collection.*

/**
 * 搜索过滤器解析结果
 */
public class SearchFilterResult {
    // 普通搜索词（支持通配符）
    public var terms: ArrayList<String> = ArrayList<String>()
    // 排除词
    public var excludeTerms: ArrayList<String> = ArrayList<String>()
    // 精确短语（引号内的内容）
    public var exactTerms: ArrayList<String> = ArrayList<String>()
    // 精确标签（以$结尾）
    public var exactTagTerms: ArrayList<String> = ArrayList<String>()
    // 排除的精确标签
    public var exactTagExcludeTerms: ArrayList<String> = ArrayList<String>()

    public init() {}
}

/**
 * 搜索过滤器解析器
 * 支持以下特殊字符：
 * - 引号 ("..."): 精确短语搜索
 * - 问号 (?) 和下划线 (_): 匹配单个字符的通配符
 * - 星号 (*) 和百分号 (%): 匹配任意字符序列的通配符
 * - 减号 (-): 排除词
 * - 美元符号 ($): 精确标签搜索
 */
public class SearchFilter {

    /**
     * 解析搜索过滤器字符串
     */
    public static func parse(filter: String): SearchFilterResult {
        let result = SearchFilterResult()
        let input = filter.trimAscii()

        if (input.size == 0) {
            return result
        }

        // 分词，支持引号短语
        let tokens = tokenize(input)

        // 解析每个 token
        for (token in tokens) {
            let trimmedToken = token.trimAscii()
            if (trimmedToken.size == 0) {
                continue
            }

            parseToken(trimmedToken, result)
        }

        return result
    }

    /**
     * 分词，支持引号短语
     */
    private static func tokenize(input: String): ArrayList<String> {
        let tokens = ArrayList<String>()
        var current = ""
        var inQuotes = false

        for (i in 0..input.size) {
            let ch = input[i..i+1]

            if (ch == "\"") {
                if (inQuotes) {
                    // 结束引号
                    current += ch
                    tokens.add(current)
                    current = ""
                    inQuotes = false
                } else {
                    // 开始引号
                    if (current.size > 0) {
                        tokens.add(current)
                        current = ""
                    }
                    current = "\""
                    inQuotes = true
                }
            } else if (ch == " " && !inQuotes) {
                if (current.size > 0) {
                    tokens.add(current)
                    current = ""
                }
            } else {
                current += ch
            }
        }

        if (current.size > 0) {
            tokens.add(current)
        }

        return tokens
    }

    /**
     * 解析单个 token
     */
    private static func parseToken(token: String, result: SearchFilterResult) {
        var t = token

        // 检查是否是排除项（以 - 开头）
        let isExclude = t.startsWith("-") && t.size > 1
        if (isExclude) {
            t = t[1..]
        }

        // 检查是否是引号短语
        let isQuoted = t.startsWith("\"") && t.endsWith("\"") && t.size > 2
        if (isQuoted) {
            t = t[1..t.size-1]
        }

        // 检查是否是精确标签（以 $ 结尾）
        let isExactTag = t.endsWith("$") && t.size > 1
        if (isExactTag) {
            t = t[0..t.size-1]
        }

        // 根据类型添加到对应列表
        if (isExactTag) {
            if (isExclude) {
                result.exactTagExcludeTerms.add(t)
            } else {
                result.exactTagTerms.add(t)
            }
        } else if (isQuoted) {
            if (isExclude) {
                result.excludeTerms.add(t)
            } else {
                result.exactTerms.add(t)
            }
        } else {
            if (isExclude) {
                result.excludeTerms.add(t)
            } else {
                result.terms.add(t)
            }
        }
    }

    /**
     * 将搜索词转换为 SQL LIKE 模式
     * - 将 * 转换为 %（匹配任意字符序列）
     * - 将 ? 转换为 _（匹配单个字符）
     * - 转义字面量的 % 和 _
     */
    public static func toLikePattern(input: String): String {
        var s = input

        // 先转义反斜杠
        s = s.replace("\\", "\\\\")
        // 转义字面量的 % 和 _（用户输入的 % 和 _ 需要转义）
        // 注意：这里假设用户使用 * 和 ? 作为通配符
        s = s.replace("%", "\\%")
        s = s.replace("_", "\\_")
        // 将用户通配符转换为 SQL 通配符
        s = s.replace("*", "%")
        s = s.replace("?", "_")

        return "%" + s + "%"
    }

    /**
     * 将搜索词转换为精确匹配的 SQL LIKE 模式（不添加前后通配符）
     */
    public static func toExactLikePattern(input: String): String {
        var s = input

        // 先转义反斜杠
        s = s.replace("\\", "\\\\")
        // 转义字面量的 % 和 _
        s = s.replace("%", "\\%")
        s = s.replace("_", "\\_")
        // 将用户通配符转换为 SQL 通配符
        s = s.replace("*", "%")
        s = s.replace("?", "_")

        return s
    }
}
