FROM node:22-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /usr/src/app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/firebase-applet-config.json ./firebase-applet-config.json
RUN mkdir -p .sessions logs && chown -R node:node /usr/src/app
USER node
EXPOSE 3000
CMD ["npm", "start"]
