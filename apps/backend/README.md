<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## The Ear / האוזן (MVP backend)

Location-based civic intelligence API: **NestJS**, **MongoDB** (2dsphere on users and drops), **Socket.io**, anonymous bearer auth.

### Run locally

1. From the monorepo root (`my_apps`), start MongoDB: `npm run docker:up` (uses `infra/docker-compose.yml`).  
   If you use a local MongoDB install instead, ensure it listens on `27017` or update `MONGODB_URI`.
2. Copy `.env.example` to `.env` (defaults: `PORT=3000`, `MONGODB_URI=mongodb://localhost:27017/the-ear`, `JWT_SECRET` reserved for future JWT use).
3. `npm install` then `npm run start:dev` — HTTP and Socket.io share the same port (default **3000**). You should see `Server running on http://localhost:3000` and a MongoDB connected log.
4. Optional demo data: `npm run seed` (clears `users`, `drops`, `answers` in that database, then inserts 5 Tel Aviv drops + 10 answers).

**REST:** `POST /auth/anonymous`, `GET /users/me`, `PATCH /users/location`, `POST /drops`, `GET /drops/nearby?lat=&lng=&radius=`, `GET /drops/:id`, `POST /drops/:id/answers`, `GET /drops/:id/answers`.

**Socket.io:** connect with `auth: { token: '<accessToken>' }` (or query `token`). Client messages: `geo:update` `{ lat, lng }`, `drop:join` / `drop:leave` `{ dropId }`. Server events: `new_drop_nearby`, `drop_updated`.

End-to-end tests (`npm run test:e2e`) expect MongoDB reachable at `MONGODB_URI`.

**Mobile (Expo):** `apps/mobile` in this repo. For a physical device, set `EXPO_PUBLIC_API_URL` to your computer’s LAN address (same port as the API). Android emulator often uses `http://10.0.2.2:3000`.

### Health check

`GET /health` returns `{ status, mongo, uptime, timestamp }`. Use it to confirm the deployed backend is up and that Mongo is connected (no auth required).

### Preview / production mobile builds (Render backend)

The deployed backend lives at `https://the-ear.onrender.com`. Shippable Expo builds (EAS `preview` / `production`) must point at this HTTPS origin — `app.config.js` rejects local/LAN/HTTP URLs at build time.

Set EAS env vars (shell env when running `eas build`, or as EAS secrets):

```bash
export EXPO_PUBLIC_API_URL=https://the-ear.onrender.com
export EXPO_PUBLIC_SOCKET_URL=https://the-ear.onrender.com
export EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=<android-maps-key>   # Android only
```

Or store them once as secrets so every build picks them up:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://the-ear.onrender.com
eas secret:create --name EXPO_PUBLIC_SOCKET_URL --value https://the-ear.onrender.com
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY --value <android-maps-key>
```

Then build:

```bash
cd apps/mobile
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Verify the resulting build talks to Render: open the installed app, watch Render logs for incoming requests, or check `GET /health` from the device’s network and confirm the app fetches drops without a "Network request failed" error.

---

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
