require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const questions = require("./data/questions");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Estado en memoria por usuario
const userSession = {};

function getNextQuestion(userId) {
  const session = userSession[userId];

  // Preguntas no respondidas
  const restantes = questions.filter((q) => !session.respondidas.includes(q.id));

  if (restantes.length === 0) {
    return {
      text: "🎉 ¡Respondiste todas las preguntas disponibles!",
      buttons: [Markup.button.callback("🚪 Finalizar Test", "finalizar_test")],
    };
  }

  // Elegir pregunta aleatoria no repetida
  const randomIndex = Math.floor(Math.random() * restantes.length);
  const preguntaElegida = restantes[randomIndex];

  session.currentQuestion = questions.findIndex((q) => q.id === preguntaElegida.id);
  session.respondidas.push(preguntaElegida.id);
  session.numeroPregunta++;

  const opcionesTexto = preguntaElegida.opciones.map((opt, i) => `${i + 1}) ${opt.slice(3)}`).join("\n");

  return {
    text: `📘 Pregunta ${session.numeroPregunta} de ${questions.length}\n\n❓ ${preguntaElegida.pregunta}\n\n${opcionesTexto}`,
    buttons: [
      Markup.button.callback("1️⃣", "answer_0"),
      Markup.button.callback("2️⃣", "answer_1"),
      Markup.button.callback("3️⃣", "answer_2"),
      Markup.button.callback("🚪 Finalizar Test", "finalizar_test"),
    ],
  };
}

bot.on("message", (ctx) => {
  const userId = ctx.from.id;

  if (!userSession[userId]) {
    userSession[userId] = {
      started: false,
      correctas: 0,
      incorrectas: 0,
      currentQuestion: null,
      respondidas: [],
      numeroPregunta: 0,
    };

    return ctx.reply(
      "🎯 Bienvenido al bot de entrenamiento de licencia.\n¿Querés comenzar el test ahora?",
      Markup.inlineKeyboard([
        Markup.button.callback("✅ Comenzar test", "comenzar_test"),
        Markup.button.callback("❌ No, muchas gracias", "rechazar_test"),
      ])
    );
  }

  if (userSession[userId].started) {
    const { text, buttons } = getNextQuestion(userId);
    ctx.reply(text, Markup.inlineKeyboard(buttons, { columns: 2 }));
  }
});

bot.on("callback_query", (ctx) => {
  const userId = ctx.from.id;
  const session = userSession[userId];
  const data = ctx.callbackQuery.data;

  if (data === "rechazar_test") {
    ctx.reply("🫡 Muchas gracias, ¡hasta luego!");
    userSession[userId] = null;
    return ctx.answerCbQuery();
  }

  if (data === "comenzar_test") {
    session.started = true;
    const { text, buttons } = getNextQuestion(userId);
    ctx.reply("🚀 ¡Empecemos!");
    ctx.reply(text, Markup.inlineKeyboard(buttons, { columns: 2 }));
    return ctx.answerCbQuery();
  }

  if (data === "finalizar_test") {
    const total = session.correctas + session.incorrectas;
    const porcentaje = total > 0 ? Math.round((session.correctas / total) * 100) : 0;

    ctx.reply(`✅ Test finalizado.
- Correctas: ${session.correctas}
- Incorrectas: ${session.incorrectas}
- Aciertos: ${porcentaje}%

📥 Si querés volver a practicar, escribime cualquier mensaje.`);

    userSession[userId] = null;
    return ctx.answerCbQuery();
  }

  const respuesta = parseInt(data.split("_")[1], 10);
  const pregunta = questions[session.currentQuestion];

  if (respuesta === pregunta.correcta) {
    session.correctas++;
    ctx.reply("✅ ¡Correcto!");
  } else {
    session.incorrectas++;
    ctx.reply(`❌ Incorrecto.\n✅ La opción correcta era:\n${pregunta.correcta + 1}) ${pregunta.opciones[pregunta.correcta].slice(3)}`);
  }

  setTimeout(() => {
    const { text, buttons } = getNextQuestion(userId);
    ctx.reply(text, Markup.inlineKeyboard(buttons, { columns: 2 }));
  }, 800);

  ctx.answerCbQuery();
});

bot.launch();
console.log("🚀 Bot funcionando con mejoras de orden y progreso");
