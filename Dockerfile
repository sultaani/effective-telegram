FROM node:22-slim AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# Migrations run automatically on first request; `npm run migrate` can also be run as a release step.
CMD ["npm", "start"]
