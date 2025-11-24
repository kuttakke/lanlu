package lrr4cj.services

import std.process.*
import std.io.*
import std.time.*
import std.convert.*
import std.collection.*
import std.fs.*
import std.env.*
import std.unittest.*
import stdx.encoding.json.*
import lrr4cj.dao.*
import lrr4cj.config.*
import lrr4cj.utils.*
import stdx.log.*
import dotenv.Dotenv

/**
 * 插件执行结果
 */
public class PluginExecutionResult {
    public var success: Bool = false
    public var error: String = ""
    public var data: HashMap<String, String> = HashMap<String, String>()
    public var executionTime: Int64 = 0
    public var exitCode: Int32 = 0

    public init(success: Bool, error: String, data: HashMap<String, String>, executionTime: Int64, exitCode: Int32) {
        this.success = success
        this.error = error
        this.data = data
        this.executionTime = executionTime
        this.exitCode = exitCode
    }
}

/**
 * 插件服务类
 * 负责通过std.process调用Perl插件，处理参数转换和结果解析
 */
public class PluginService {
    private static var instance: Option<PluginService> = Option.None
    private var pluginPath: String = ""
    private var perlPath: String = "perl"
    private var defaultTimeout: Int64 = 30000 // 30秒超时

    private init() {
        let config = Dotenv.createConfig()
        pluginPath = config.read("PLUGIN_PATH", "./plugins")
        perlPath = config.read("PERL_PATH", "perl")

        getLogger("plugin_service").info("插件服务初始化", ("plugin_path", pluginPath), ("perl_path", perlPath))
    }

    /**
     * 获取单例实例
     */
    public static func getInstance(): PluginService {
        match (instance) {
            case Some(service) => return service
            case None =>
                let service = PluginService()
                instance = Some(service)
                return service
        }
    }

    /**
     * 根据插件权限构建Deno参数
     */
    private static func buildDenoPermissions(plugin: PluginData, pluginFile: String): ArrayList<String> {
        var denoArgs = ArrayList<String>()

        // 基本参数
        denoArgs.add("run")
        denoArgs.add(pluginFile)

        // 默认给予插件目录的读写权限
        let pluginDir = "./data/plugins/${plugin.namespace}"
        denoArgs.add("--allow-read=${pluginDir}")
        denoArgs.add("--allow-write=${pluginDir}")

        // 解析插件声明的权限
        let permissions = plugin.permissions.split(",")

        for (permission in permissions) {
            let perm = permission
            if (perm.size == 0) {
                continue
            }

            // 处理带参数的权限，如 net=domain.com
            if (perm.contains("=")) {
                let parts = perm.split("=", 2)
                if (parts.size == 2) {
                    let permType = parts[0]
                    let permValue = parts[1]

                    if (permType == "net") {
                        denoArgs.add("--allow-net=${permValue}")
                    } else if (permType == "read") {
                        denoArgs.add("--allow-read=${permValue}")
                    } else if (permType == "write") {
                        denoArgs.add("--allow-write=${permValue}")
                    } else if (permType == "env") {
                        denoArgs.add("--allow-env=${permValue}")
                    }
                }
                continue
            }

            // 处理简单权限
            if (perm == "net") {
                    denoArgs.add("--allow-net")
                } else if (perm == "read") {
                    denoArgs.add("--allow-read")
                } else if (perm == "write") {
                    denoArgs.add("--allow-write")
                } else if (perm == "env") {
                    denoArgs.add("--allow-env")
                } else if (perm == "run") {
                    denoArgs.add("--allow-run")
                } else if (perm == "ffi") {
                    denoArgs.add("--allow-ffi")
                } else if (perm == "hrtime") {
                    denoArgs.add("--allow-hrtime")
                }
        }

        return denoArgs
    }

    /**
     * 执行命令并获取输出
     */
    private static func executeWithOutput(command: String, args: Array<String>): (Int32, Array<UInt8>, Array<UInt8>) {
        try {
            // 对于2个参数的情况，使用 launch 函数执行命令
            if (args.size == 2) {
                let process = launch(command, args[0], args[1], stdOut: ProcessRedirect.Pipe,
                    stdErr: ProcessRedirect.Pipe)
                let (exitCode, stdout, stderr) = process.waitOutput()
                return (Int32(exitCode), stdout, stderr)
            } else {
                // 对于其他情况，使用 shell 执行
                var fullCmd = command
                for (arg in args) {
                    fullCmd += " " + arg
                }

                let process = launch("sh", "-c", fullCmd, stdOut: ProcessRedirect.Pipe, stdErr: ProcessRedirect.Pipe)
                let (exitCode, stdout, stderr) = process.waitOutput()
                return (Int32(exitCode), stdout, stderr)
            }
        } catch (_: Exception) {
            return (1, Array<UInt8>(), Array<UInt8>())
        }
    }

    /**
     * 扫描并发现插件 - 从真实Perl文件获取信息，包含所有7个参数
     */
    public func discoverPlugins(): Array<PluginData> {
        var discoveredPlugins: Array<PluginData> = []
        let logger = getLogger("plugin_service")

        logger.info("开始动态插件发现扫描")

        try {
            let pluginDir = pluginPath
            if (!existsDirectory(pluginDir)) {
                logger.error("插件目录不存在")
                return discoveredPlugins
            }

            // 动态扫描插件目录，类似shinobu的逻辑
            let pluginPathObj = Path(pluginDir)
            if (!exists(pluginPathObj)) {
                logger.error("插件目录不存在")
                return discoveredPlugins
            }

            let pluginTypes = ["Metadata", "Login", "Download"]

            for (pluginType in pluginTypes) {
                let typePath = pathJoin(pluginPath, pluginType)
                let typeDir = Path(typePath)

                logger.info("扫描插件类型目录", ("type", pluginType), ("path", typePath))

                if (exists(typeDir)) {
                    let entries = FsUtils.listDirectory(typePath)

                    for (entry in entries) {
                        // 支持.ts (TypeScript/Deno) 和.pm (Perl) 插件文件
                        if (entry.endsWith(".ts") || entry.endsWith(".pm")) {
                            let pluginFile = pathJoin(typePath, entry)

                            logger.info("发现TypeScript插件文件: ${entry}, full_path: ${pluginFile}")

                            let pluginData = createDenoPluginFromFile(pluginFile, pluginType)
                            if (pluginData.namespace.size > 0) {
                                discoveredPlugins = addPluginToArray(discoveredPlugins, pluginData)
                                logger.info(
                                    "成功解析TypeScript插件: ${pluginData.name}, namespace: ${pluginData.namespace}, type: ${pluginType}")
                            } else {
                                logger.warn("解析TypeScript插件失败: ${entry}")
                            }
                        }
                    }
                }
            }

            logger.info("插件扫描完成: total_found: ${discoveredPlugins.size.toString()}")
        } catch (e: Exception) {
            logger.error("插件扫描过程中发生异常")
        }

        return discoveredPlugins
    }

    /**
     * 从Deno/TypeScript插件文件执行并获取元数据
     */
    private func createDenoPluginFromFile(pluginFile: String, pluginType: String): PluginData {
        var pluginData = PluginData()
        let logger = getLogger("plugin_service")

        try {
            // 从文件路径提取文件名
            let pathObj = Path(pluginFile)
            let fileName = pathObj.fileName

            // 构建Deno命令来获取插件信息
            let denoPath = "/config/.deno/bin/deno"

            // 为插件信息获取构建最小权限参数
            var denoArgs = ArrayList<String>()
            denoArgs.add("run")
            denoArgs.add(pluginFile)
            denoArgs.add("--action=plugin_info")
            // 获取插件信息只需要读取权限
            denoArgs.add("--allow-read=${pluginFile}")

            // 执行Deno插件获取插件信息
            let startTime = DateTime.now().toUnixTimeStamp().toSeconds()
            let (exitCode, stdout, stderr) = executeWithOutput(denoPath, denoArgs.toArray())
            let executionTime = DateTime.now().toUnixTimeStamp().toSeconds() - startTime

            if (exitCode == 0) {
                let output = String.fromUtf8(stdout)

                // 解析JSON输出
                if (!output.contains("\"error\"")) {
                    // 从JSON解析插件信息
                    pluginData = parsePluginInfoFromJson(output, fileName, pluginType)
                    logger.info("成功解析Deno插件元数据: ${fileName}, execution_time: ${executionTime}")
                } else {
                    logger.error("Deno插件返回错误: ${fileName}, error: ${output}")
                }
            } else {
                let stderrStr = String.fromUtf8(stderr)
                logger.error("执行Deno插件失败: ${fileName}, exit_code: ${exitCode.toString()}, stderr: ${stderrStr}")
            }
        } catch (e: Exception) {
            logger.error("解析Deno插件文件时发生异常: ${e.message}")
        }

        return pluginData
    }

    /**
     * 从Perl插件文件执行并获取元数据
     */
    private func createPluginFromFile(pluginFile: String, pluginType: String): PluginData {
        var pluginData = PluginData()
        let logger = getLogger("plugin_service")

        try {
            // 从文件路径提取文件名
            let pathObj = Path(pluginFile)
            let fileName = pathObj.fileName

            // 构建Perl命令来获取插件信息
            let pluginName = fileName.replace(".pm", "")
            let packageName = "LANraragi::Plugin::${pluginType}::${pluginName}"

            let perlCode = """
use strict;
use warnings;
use feature 'say';
use JSON::PP;

# 添加plugins目录到@INC路径
use File::Basename;
my \$plugin_dir = dirname('${pluginFile}');
unshift @INC, \$plugin_dir;

# 加载插件文件
eval {
    do '${pluginFile}';
    1; # 成功
} or do {
    print '{"error": "Failed to load plugin file: $@"}';
    exit 1;
};

# 访问插件包中的plugin_info方法
my \$full_method = '${packageName}::plugin_info';
if (eval { defined(&\$full_method) }) {
    my %plugin_info = eval { &\$full_method() };
    if (\$@) {
        print '{"error": "Failed to call plugin_info: $@"}';
    } else {
        # 创建一个简化版本的hash，只包含可序列化的数据
        my %safe_info = ();
        \$safe_info{name} = \$plugin_info{name} // '';
        \$safe_info{namespace} = \$plugin_info{namespace} // '';
        \$safe_info{version} = \$plugin_info{version} // '';
        \$safe_info{description} = \$plugin_info{description} // '';
        \$safe_info{author} = \$plugin_info{author} // '';
        \$safe_info{type} = \$plugin_info{type} // '';
        \$safe_info{parameters} = \$plugin_info{parameters} // [];

        print encode_json(\\\\%safe_info);
    }
} else {
    print '{"error": "plugin_info method not found in ${packageName}"}';
}
"""

            // 执行Perl代码获取插件信息
            let startTime = DateTime.now().toUnixTimeStamp().toSeconds()
            let (exitCode, stdout, stderr) = executeWithOutput(perlPath, ["-e", perlCode])
            let executionTime = DateTime.now().toUnixTimeStamp().toSeconds() - startTime

            if (exitCode == 0) {
                let output = String.fromUtf8(stdout)

                // 解析JSON输出
                if (!output.contains("\"error\"")) {
                    // 从JSON解析插件信息
                    pluginData = parsePluginInfoFromJson(output, fileName, pluginType)
                    logger.info("成功解析插件元数据: ${fileName}, execution_time: ${executionTime}")
                } else {
                    logger.error("插件返回错误: ${fileName}, error: ${output}")
                }
            } else {
                let stderrStr = String.fromUtf8(stderr)
                logger.error("执行插件失败: ${fileName}, exit_code: ${exitCode.toString()}, stderr: ${stderrStr}")
            }
        } catch (e: Exception) {
            logger.error("解析插件文件时发生异常: ${e.message}")
        }

        return pluginData
    }

    /**
     * 从JSON解析插件信息
     */
    private func parsePluginInfoFromJson(jsonStr: String, fileName: String, pluginType: String): PluginData {
        var pluginData = PluginData()

        try {
            // 检查JSON是否包含错误
            if (jsonStr.contains("\"error\"")) {
                throw Exception("Plugin returned error: ${jsonStr}")
            }

            // 使用JsonValue解析JSON
            let jsonValue = JsonValue.fromStr(jsonStr)

            // 设置基本信息
            pluginData.entry = fileName
            pluginData.plugin_type = pluginType
            pluginData.installed = true

            // 使用match expression解析JSON
            match (jsonValue) {
                case jsonObj: JsonObject =>
                    // 解析必需字段
                    pluginData.name = getJsonString(jsonObj, "name")
                    pluginData.namespace = getJsonString(jsonObj, "namespace")
                    pluginData.version = getJsonString(jsonObj, "version")
                    pluginData.description = getJsonString(jsonObj, "description")
                    pluginData.author = getJsonString(jsonObj, "author")
                    pluginData.icon = getJsonString(jsonObj, "icon")

                    // 获取所有字段
                    let fields = jsonObj.getFields()

                    // 解析权限字段
                    if (fields.contains("permissions")) {
                        let perms = fields["permissions"]
                        logger.info("开始解析插件权限", ("plugin", pluginData.name), ("permissions_raw", perms.toString()))
                        match (perms) {
                            case array: JsonArray =>
                                var permissionList = ArrayList<String>()
                                let size = array.size()
                                logger.info("权限数组大小", ("plugin", pluginData.name), ("array_size", size.toString()))
                                for (i in 0..size) {
                                    let itemOpt = array.get(i)
                                    match (itemOpt) {
                                        case Some(item) =>
                                            let permValue = item
                                            if (permValue is JsonString) {
                                                let permission = permValue.toString()
                                                permissionList.add(permission)
                                                logger.info("添加权限", ("plugin", pluginData.name), ("permission", permission))
                                            } else {
                                                // 如果不是JsonString，尝试转换为字符串
                                                let permission = permValue.toString()
                                                permissionList.add(permission)
                                                logger.info("添加权限(非JsonString)", ("plugin", pluginData.name), ("permission", permission))
                                            }
                                        case None =>
                                            logger.info("数组元素为空", ("plugin", pluginData.name), ("index", i.toString()))
                                    }
                                }
                                if (permissionList.size > 0) {
                                    pluginData.permissions = String.join(permissionList.toArray(), delimiter: ",")
                                    logger.info("权限解析完成", ("plugin", pluginData.name), ("permissions", pluginData.permissions))
                                } else {
                                    pluginData.permissions = ""
                                    logger.info("权限列表为空", ("plugin", pluginData.name))
                                }
                            case str: JsonString =>
                                pluginData.permissions = str.getValue()
                                logger.info("权限字符串解析", ("plugin", pluginData.name), ("permissions", pluginData.permissions))
                            case _ =>
                                pluginData.permissions = perms.toString()
                                logger.info("权限其他格式", ("plugin", pluginData.name), ("permissions", pluginData.permissions))
                        }
                    } else {
                        logger.info("插件没有权限字段", ("plugin", pluginData.name))
                    }

                    // 解析参数信息
                    if (fields.contains("parameters")) {
                        let params = fields["parameters"]
                        pluginData.parameters = params.toString()
                        pluginData.has_schema = true
                        logger.info("成功解析插件参数", ("plugin", pluginData.name),
                            ("parameters_count", getParameterCount(params)))
                    } else {
                        pluginData.has_schema = false
                        pluginData.parameters = "[]"
                    }
                case _ => throw Exception("Invalid JSON format: expected object")
            }
        } catch (e: Exception) {
            logger.error("解析插件JSON时发生异常", ("plugin", fileName), ("error", e.message))
            throw e
        }

        return pluginData
    }

    /**
     * 从JsonObject获取字符串值
     */
    private func getJsonString(jsonObj: JsonObject, key: String): String {
        let fields = jsonObj.getFields()
        if (fields.contains(key)) {
            let value = fields[key]
            match (value) {
                case jsonStr: JsonString => return jsonStr.getValue()
                case _ => return value.toString()
            }
        }
        return ""
    }

    /**
     * 解析权限数组为逗号分隔字符串
     */
    private func parsePermissions(permissions: JsonValue): String {
        match (permissions) {
            case array: JsonArray =>
                var permissionList = ArrayList<String>()
                let size = array.size()
                for (i in 0..size) {
                    let item = array.get(i)
                    if (let someValue <- item) {
                        let value = someValue
                        permissionList.add(value.toString())
                    }
                }
                return String.join(permissionList.toArray(), delimiter: ",")
            case str: JsonString =>
                return str.getValue()
            case _ =>
                return ""
        }
    }

    /**
     * 获取参数数量
     */
    private func getParameterCount(params: JsonValue): String {
        match (params) {
            case jsonArray: JsonArray =>
                let size = jsonArray.size()
                return "${size}"
            case _ => return "0"
        }
    }

    /**
     * 执行元数据插件
     */
    public func executeMetadataPlugin(plugin: PluginData, archiveId: String): PluginExecutionResult {
        let logger = getLogger("plugin_service")
        let startTime = DateTime.now().toUnixTimeStamp().toSeconds()

        logger.info("开始执行元数据插件: ${plugin.namespace}")

        // 获取插件文件路径
        let pluginFile = "./data/plugins/${plugin.namespace}/Metadata.ts"
        if (!exists(pluginFile)) {
            logger.error("插件文件不存在: ${pluginFile}")
            return PluginExecutionResult(false, "Plugin file not found", HashMap<String, String>(), 0, 1)
        }

        // 构建Deno权限参数
        let denoPath = "/config/.deno/bin/deno"
        let denoArgs = buildDenoPermissions(plugin, pluginFile)

        // 添加插件执行参数
        denoArgs.add("--action=execute")
        denoArgs.add("--archive_id=${archiveId}")

        // 执行插件
        let (exitCode, stdout, stderr) = executeWithOutput(denoPath, denoArgs.toArray())
        let executionTime = DateTime.now().toUnixTimeStamp().toSeconds() - startTime

        if (exitCode == 0) {
            let output = String.fromUtf8(stdout)
            logger.info("插件执行成功: ${plugin.namespace}, execution_time: ${executionTime}")

            // 解析输出结果
            var resultData = HashMap<String, String>()
            resultData["output"] = output

            return PluginExecutionResult(true, output, resultData, executionTime, exitCode)
        } else {
            let errorOutput = String.fromUtf8(stderr)
            logger.error("插件执行失败: ${plugin.namespace}, exit_code: ${exitCode}, error: ${errorOutput}")

            var resultData = HashMap<String, String>()
            resultData["error"] = errorOutput

            return PluginExecutionResult(false, errorOutput, resultData, executionTime, exitCode)
        }
    }

    /**
     * 执行登录插件
     */
    public func executeLoginPlugin(plugin: PluginData, params: HashMap<String, String>): PluginExecutionResult {
        let logger = getLogger("plugin_service")
        let startTime = DateTime.now().toUnixTimeStamp().toSeconds()

        logger.info("开始执行登录插件: ${plugin.namespace}")

        // 获取插件文件路径
        let pluginFile = "./data/plugins/${plugin.namespace}/Login.ts"
        if (!exists(pluginFile)) {
            logger.error("插件文件不存在: ${pluginFile}")
            return PluginExecutionResult(false, "Plugin file not found", HashMap<String, String>(), 0, 1)
        }

        // 构建Deno权限参数
        let denoPath = "/config/.deno/bin/deno"
        let denoArgs = buildDenoPermissions(plugin, pluginFile)

        // 添加插件执行参数
        denoArgs.add("--action=execute")

        // 添加参数
        for ((key, value) in params) {
            if (value.size > 0) {
                denoArgs.add("--${key}=${value}")
            }
        }

        // 执行插件
        let (exitCode, stdout, stderr) = executeWithOutput(denoPath, denoArgs.toArray())
        let executionTime = DateTime.now().toUnixTimeStamp().toSeconds() - startTime

        if (exitCode == 0) {
            let output = String.fromUtf8(stdout)
            logger.info("插件执行成功: ${plugin.namespace}, execution_time: ${executionTime}")

            // 解析输出结果
            var resultData = HashMap<String, String>()
            resultData["output"] = output

            return PluginExecutionResult(true, output, resultData, executionTime, exitCode)
        } else {
            let errorOutput = String.fromUtf8(stderr)
            logger.error("插件执行失败: ${plugin.namespace}, exit_code: ${exitCode}, error: ${errorOutput}")

            var resultData = HashMap<String, String>()
            resultData["error"] = errorOutput

            return PluginExecutionResult(false, errorOutput, resultData, executionTime, exitCode)
        }
    }

    /**
     * 执行下载插件
     */
    public func executeDownloadPlugin(plugin: PluginData, url: String): PluginExecutionResult {
        let logger = getLogger("plugin_service")
        let startTime = DateTime.now().toUnixTimeStamp().toSeconds()

        logger.info("开始执行下载插件: ${plugin.namespace}")

        // 获取插件文件路径
        let pluginFile = "./data/plugins/${plugin.namespace}/Download.ts"
        if (!exists(pluginFile)) {
            logger.error("插件文件不存在: ${pluginFile}")
            return PluginExecutionResult(false, "Plugin file not found", HashMap<String, String>(), 0, 1)
        }

        // 构建Deno权限参数
        let denoPath = "/config/.deno/bin/deno"
        let denoArgs = buildDenoPermissions(plugin, pluginFile)

        // 添加插件执行参数
        denoArgs.add("--action=execute")
        denoArgs.add("--url=${url}")

        // 执行插件
        let (exitCode, stdout, stderr) = executeWithOutput(denoPath, denoArgs.toArray())
        let executionTime = DateTime.now().toUnixTimeStamp().toSeconds() - startTime

        if (exitCode == 0) {
            let output = String.fromUtf8(stdout)
            logger.info("插件执行成功: ${plugin.namespace}, execution_time: ${executionTime}")

            // 解析输出结果
            var resultData = HashMap<String, String>()
            resultData["output"] = output

            return PluginExecutionResult(true, output, resultData, executionTime, exitCode)
        } else {
            let errorOutput = String.fromUtf8(stderr)
            logger.error("插件执行失败: ${plugin.namespace}, exit_code: ${exitCode}, error: ${errorOutput}")

            var resultData = HashMap<String, String>()
            resultData["error"] = errorOutput

            return PluginExecutionResult(false, errorOutput, resultData, executionTime, exitCode)
        }
    }

    /**
     * 获取插件配置 - 直接返回空Map，现在配置由前端处理
     */
    public func getPluginConfig(namespace: String): HashMap<String, String> {
        return HashMap<String, String>()
    }

    /**
     * 更新插件配置
     */
    public func updatePluginConfig(namespace: String, config: HashMap<String, String>): Bool {
        // 这个方法已弃用，现在配置通过控制器直接处理
        return false
    }

    /**
     * 检查插件是否可用
     */
    public func isPluginAvailable(plugin: PluginData): Bool {
        let typePath = pathJoin(pluginPath, plugin.plugin_type)
        let pluginFilePath = pathJoin(typePath, plugin.entry)
        let path = Path(pluginFilePath)
        let fileExists = exists(path)
        let logger = getLogger("plugin_service")
        logger.info("检查插件文件", ("plugin", plugin.namespace), ("path", pluginFilePath),
            ("exists", fileExists.toString()))
        return fileExists
    }

    /**
     * 添加插件到数组
     */
    private func addPluginToArray(pluginArray: Array<PluginData>, plugin: PluginData): Array<PluginData> {
        let result = Array<PluginData>(pluginArray.size + 1, {
            i => if (i < pluginArray.size) {
                pluginArray[i]
            } else {
                plugin
            }
        })
        return result
    }

    /**
     * 检查目录是否存在
     */
    private func existsDirectory(path: String): Bool {
        try {
            let dirPath = Path(path)
            if (exists(dirPath)) {
                let fileInfo = FileInfo(dirPath)

                // 如果是软链接，获取其目标并检查目标目录
                if (fileInfo.isSymbolicLink()) {
                    try {
                        let targetPath = SymbolicLink.readFrom(path, recursive: false)
                        if (exists(targetPath)) {
                            let targetFileInfo = FileInfo(targetPath)
                            return targetFileInfo.isDirectory()
                        } else {
                            return false
                        }
                    } catch (_: Exception) {
                        return false
                    }
                } else {
                    return fileInfo.isDirectory()
                }
            } else {
                return false
            }
        } catch (_: Exception) {
            return false
        }
    }

    /**
     * 连接路径
     */
    private func pathJoin(base: String, part: String): String {
        let cleanBase = if (base.endsWith("/")) {
            base[0..base.size - 1]
        } else {
            base
        }
        let cleanPart = if (part.startsWith("/")) {
            part[1..]
        } else {
            part
        }
        return "${cleanBase}/${cleanPart}"
    }
}
