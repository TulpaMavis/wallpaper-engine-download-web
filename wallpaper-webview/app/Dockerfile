# 基础镜像
FROM node:18-slim

# 安装 SteamCMD 依赖
RUN apt-get update && \
    dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        curl \
        ca-certificates \
        lib32gcc-s1 \
        lib32stdc++6 \
        libc6-i386 \
        libcurl4-gnutls-dev:i386 \
        lib32z1 \
        && \
    rm -rf /var/lib/apt/lists/*

# 安装 SteamCMD
RUN mkdir -p /steamcmd && \
    cd /steamcmd && \
    wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz && \
    tar -xvzf steamcmd_linux.tar.gz && \
    rm steamcmd_linux.tar.gz && \
    chmod +x steamcmd.sh

# 设置环境变量
ENV STEAMCMD_DIR=/app
ENV PATH="${STEAMCMD_DIR}:${PATH}"

# 设置工作目录（可被 docker-compose 覆盖）
WORKDIR /app

# 不复制任何 Node 代码，完全通过挂载方式运行
# 只安装全局工具（可选）
RUN npm install -g nodemon pm2 2>/dev/null || true

# 暴露端口（可被 docker-compose 覆盖）
EXPOSE 3090

# 默认命令，可被 docker-compose 覆盖
CMD ["node", "--expose-gc", "server.js"]