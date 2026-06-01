const botToken = process.env.DISCORD_TOKEN;
const appID = process.env.APP_ID;

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
client.once('ready', () => {
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


  // ===== Button =====
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('gw_')) return;

  const parts = interaction.customId.split('_');
  const type = parts[1];
  const gwDate = parts.slice(2).join('_');

  if (type != 'result'){
    let voteText = '';
    let voteIndex = '';
    switch (type) {
      case 'yes':
        voteText = '參加';
        voteIndex = '0';
        break;
      case 'maybe':
        voteText = '不一定';
        voteIndex = '1';
        break;
      case 'no':
        voteText = '無法參加';
        voteIndex = '2';
        break;
      default:
        return interaction.reply({
          content: '❌ 無效按鈕',
          flags: 64
        });
    }

    try {
      await interaction.deferReply({ flags: 64 });

      await axios.post(GAS_URL, {
        userId: interaction.user.id,
        username: interaction.user.username,
        voteDate: gwDate,
        vote: voteIndex
      });

      await interaction.editReply({
        content: `✅ 已投票：${voteText}（${gwDate}）幫戰`
      });

    } catch (err) {
      console.error(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ 投票失敗');
      } else {
        await interaction.reply({
          content: '❌ 投票失敗',
          flags: 64
        });
      }
    }
  }else{
    // console.log(`日期${gwDate}`);
    await interaction.deferReply({ flags: 64 });
    const res = await axios.get(
      `${GAS_URL}?gwDate=${gwDate}`
    );
    
    const data = res.data.result;
    // console.log(res.data);
    const total = data.yes.length + data.maybe.length + data.no.length;
    try {
      await interaction.editReply({
        embeds: [{
          title: `⚔️ ${gwDate} 幫戰投票結果`,
          description: [
            `👥 共 ${total} 人投票`,
            '',
            `🟢 參加（${data.yes.length}人）`,
            data.yes.map(id => `<@${id}> `),
            '',
            `🔵 不一定（${data.maybe.length}人）`,
            data.maybe.map(id => `<@${id}> `),
            '',
            `🔴 無法參加（${data.no.length}人）`,
            data.no.map(id => `<@${id}>`)
          ].join('\n')
        }],
      });

    } catch (err) {
      console.error(err);
    } 
  }
});

client.login(botToken);