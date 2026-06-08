// const botToken = process.env.DISCORD_TOKEN;
// const appID = process.env.APP_ID;
const botToken = 'MTQ1MTg3NTk5ODgzNTQwODkwNg.Gb3omh.VHU8QyFnFiDZ32Wj9hDq9As1vPwPTEVboZm4As';
const appID = '1451875998835408906';

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');

const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds,]
});

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxFJM6ia26L-70cREkSKpYtr3J_eI-gaOI_zpmR_z_KFzC5T5kF0ZIh8HxW6ftIX0GSPw/exec'

// =======================
// 📌 Slash Command 註冊
// =======================
const commands = [
  new SlashCommandBuilder()
    .setName('gw')
    .setDescription('建立幫戰投票')
    .addStringOption(opt =>
      opt.setName('日期')
        .setDescription('例如 6/10')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('截止')
        .setDescription('例如 6/9')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('tw')
    .setDescription('建立幫戰+決賽投票')
    .addStringOption(opt =>
      opt.setName('日期')
        .setDescription('例如 6/10')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('截止')
        .setDescription('例如 6/9')
        .setRequired(true)
    )
];

const rest = new REST({ version: '10' }).setToken(botToken);

(async () => {
  await rest.put(
    Routes.applicationCommands(appID),
    { body: commands }
  );
  console.log('Slash Command 已註冊');
})();

// =======================
// 📌 Bot 啟動
// =======================
client.once(Events.ClientReady, readyClient => {
  console.log(`Bot Online: ${client.user.tag}`);
});


// =======================
// 📌 Slash Command (/gw)
// =======================
client.on(Events.InteractionCreate, async interaction => {

  // ===== /gw =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'gw') {

    const date = interaction.options.getString('日期');
    const deadline = interaction.options.getString('截止');

    //6/6幫戰(兩場)參與調查，截止日6/5 24:00
    const title = `⚔️ ${date}幫戰(兩場)參與調查，截止日${deadline} 24:00`;

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`gw_yes_${date}`)
          .setLabel('參加')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`gw_maybe_${date}`)
          .setLabel('不一定')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`gw_no_${date}`)
          .setLabel('無法參加')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`gw_result_${date}`)
          .setLabel('查看結果')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      content: title,
      components: [row]
    });
  }
  
  if (interaction.isChatInputCommand() && interaction.commandName === 'tw') {

    const date = interaction.options.getString('日期');
    const deadline = interaction.options.getString('截止');

    const title =
      `🏆 ${date} 幫戰+決賽參與調查\n截止日 ${deadline} 24:00`;

    const row = new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(`tw_full_${date}`)
          .setLabel('參加幫戰+決賽')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`tw_yes_${date}`)
          .setLabel('只參加幫戰')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`tw_maybe_${date}`)
          .setLabel('不一定參加幫戰')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`tw_no_${date}`)
          .setLabel('無法參加')
          .setStyle(ButtonStyle.Danger),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`tw_result_${date}`)
          .setLabel('查看結果')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      content: title,
      components: [row, row2]
    });
  }


  // =======================
// 📌 Button
// =======================
if (interaction.isButton()) {

  const parts = interaction.customId.split('_');

  const mode = parts[0];      // gw 或 tw
  const type = parts[1];      // yes、maybe、no、result...
  const voteDate = parts.slice(2).join('_');

  // ======================
  // 查看結果
  // ======================
  if (type === 'result') {

    try {

      await interaction.deferReply({ flags: 64 });

      const res = await axios.get(
        `${GAS_URL}?mode=${mode}&voteDate=${voteDate}`
      );

      const data = res.data.result;

      // ===== GW =====
      if (mode === 'gw') {

        const total = data.yes.length + data.maybe.length + data.no.length;

        await interaction.editReply({
          embeds: [{
            title: `⚔️ ${voteDate} 幫戰投票結果`,
            description: [
              `👥 共 ${total} 人投票`,
              '',
              `🟢 參加 (${data.yes.length})`,
              data.yes.map(id => `<@${id}>`).join(' ') || '無',
              '',
              `🔵 不一定 (${data.maybe.length})`,
              data.maybe.map(id => `<@${id}>`).join(' ') || '無',
              '',
              `🔴 無法參加 (${data.no.length})`,
              data.no.map(id => `<@${id}>`).join(' ') || '無'
            ].join('\n')
          }]
        });

      }

      // ===== TW =====
      if (mode === 'tw') {

        const total = data.full.length + data.yes.length + data.maybe.length + data.no.length;

        await interaction.editReply({
          embeds: [{
            title: `🏆 ${voteDate} 幫戰+決賽投票結果`,
            description: [
              `👥 共 ${total} 人投票`,
              '',
              `🟢 幫戰+決賽 (${data.full.length})`,
              data.full.map(id => `<@${id}>`).join(' ') || '無',
              '',
              `🔵 只參加幫戰 (${data.yes.length})`,
              data.yes.map(id => `<@${id}>`).join(' ') || '無',
              '',
              `🟡 不一定參加幫戰 (${data.maybe.length})`,
              data.maybe.map(id => `<@${id}>`).join(' ') || '無',
              '',
              `🔴 無法參加 (${data.no.length})`,
              data.no.map(id => `<@${id}>`).join(' ') || '無'
            ].join('\n')
          }]
        });

      }

    } catch (err) {

      console.error(err);

      await interaction.editReply({
        content: '❌ 讀取投票結果失敗'
      });

    }

    return;
  }

  // ======================
  // 投票
  // ======================

  let voteIndex;
  let voteText;

  // GW
  if (mode === 'gw') {

    const voteMap = {
      yes: ['0', '參加'],
      maybe: ['1', '不一定'],
      no: ['2', '無法參加']
    };

    if (!voteMap[type]) return;

    [voteIndex, voteText] = voteMap[type];
  }

  // TW
  if (mode === 'tw') {

    const voteMap = {
      full: ['0', '參加幫戰+決賽'],
      gw: ['1', '只參加幫戰'],
      maybe: ['2', '不一定參加幫戰'],
      no: ['3', '無法參加']
    };

    if (!voteMap[type]) return;

    [voteIndex, voteText] = voteMap[type];
  }

  try {

    await interaction.deferReply({ flags: 64 });

    await axios.post(GAS_URL, {
      mode,
      voteDate,
      userId: interaction.user.id,
      username: interaction.user.username,
      vote: voteIndex
    });

    await interaction.editReply({
      content: `✅ 已投票：${voteText}`
    });

  } catch (err) {

    console.error(err);

    await interaction.editReply({
      content: '❌ 投票失敗'
    });

  }
}
});


client.login(botToken);