package lrr4cj.utils

import std.fs.*
import std.collection.*

/**
 * 文件系统工具类
 */
public class FsUtils {

    /**
     * 列出目录中的所有文件和子目录
     */
    public static func listDirectory(path: String): Array<String> {
        try {
            let dirPath = Path(path)
            var files = ArrayList<String>()

            // 检查路径是否存在
            if (!exists(dirPath)) {
                return files.toArray()
            }

            let fileInfo = FileInfo(dirPath)

            if (fileInfo.isDirectory()) {
                // 获取目录中的所有条目
                let entries = Directory.readFrom(dirPath)
                for (entry in entries) {
                    if (entry.isRegular() || entry.isDirectory() || entry.isSymbolicLink()) {
                        let fileName = entry.name.toString()
                        files.add(fileName)
                    }
                }
                return files.toArray()
            } else {
                return files.toArray()
            }
        } catch (e: Exception) {
            println("Error listing directory ${path}: ${e.message}")
            return Array<String>()
        }
    }
}