#!/bin/bash

# 加载 .env 文件中的环境变量
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    
    # 读取 .env 文件并导出环境变量
    while IFS= read -r line || [[ -n "$line" ]]; do
        # 跳过空行和注释
        if [[ -z "$line" || "$line" == \#* ]]; then
            continue
        fi
        
        # 导出环境变量
        export "$line"
    done < .env
    
    echo "Environment variables loaded successfully!"
else
    echo "Warning: .env file not found. Using default environment variables."
fi

# 运行 Cangjie 程序
echo "Starting LRR4CJ application..."
cjpm run