# 使用轻量级的 Node LTS 镜像 (Debian 基础)
FROM node:20-bullseye-slim

# 开启 32 位支持，并安装 zip 和 SteamCMD 必需的 32 位运行库
RUN dpkg --add-architecture i386 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       zip \
       curl \
       ca-certificates \
       lib32gcc-s1 \
    && rm -rf /var/lib/apt/lists/*

# 设置容器内的工作目录
WORKDIR /app

# 把当前目录所有文件拷贝进容器
COPY . .

# 确保 steamcmd.sh 拥有可执行权限，并预创建下载文件夹
RUN chmod +x ./steamcmd/steamcmd.sh \
    && mkdir -p downloads

# 暴露服务端口
EXPOSE 3090

# 启动命令
CMD ["node", "server.js"]
