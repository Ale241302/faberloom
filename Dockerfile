FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Sin dependencias externas: solo el código.
COPY package.json ./
COPY src ./src

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8090/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/mcp/http-main.js"]
