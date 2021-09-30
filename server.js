const path = require("path");
const fs = require("fs");
let Datastore = require("nedb"),
  db = new Datastore({ filename: "posts.db", autoload: true });

// fastify
const fastify = require("fastify")({
  logger: true
});

// セッションとクッキーの設定
const fastifySession = require("fastify-session");
const fastifyCookie = require('fastify-cookie');
fastify.register(fastifyCookie, {
  secret: "my-secret"
});
fastify.register(fastifySession, {
  secret: "my-secret"
});

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/"
});

fastify.register(require("fastify-formbody"));

fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

// SEOデータの読み込み
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// GET
fastify.get("/", function(request, reply) {
  db.find({})
    .sort({ id: -1 })
    .exec(function(err, posts) {
      let params = {
        seo: seo,
        posts: posts,
        setName: request.cookies.name ? request.cookies.name : ''
      };
      console.log('name: ' + request.session.post);

      reply.view("/src/pages/index.hbs", params);
    });
});

// POST
fastify.post("/", function(request, reply) {
  let name = request.body.name;
  let message = request.body.message;

  if (name && message) {
    db.count({}, function(err, count) {
      // DBに追加
      db.insert(
        {
          id: count + 1,
          name: escapeSpecialChars(name),
          message: escapeSpecialChars(message)
        },
        function(err, postAdded) {
          if (err) console.log("There's a problem with the database: ", err);
          else if (postAdded) console.log("New post inserted in the database");
        }
      );
    });
  }
  
  // 名前をCookuieにセットし、リダイレクト(2重サブミット防止)
  reply
    .setCookie('name', name, {
      domain: 'rkeijiban.glitch.me',
      path: '/'
    })
    .redirect("/");
});

fastify.listen(process.env.PORT, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});

// HTMLエスケープ
function escapeSpecialChars(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
