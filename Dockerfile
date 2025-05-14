# 使用官方的 Node.js 18 作为基础镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装项目依赖
RUN npm install --only=production

# 复制项目代码到工作目录
COPY . .

# 暴露服务监听的端口 (与 index.js 中的 PORT 一致)
EXPOSE 8080

# 容器启动时运行的命令
CMD [ "node", "index.js" ] 