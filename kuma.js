require('dotenv').config();

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
  Events,
  PermissionFlagsBits
} = require('discord.js');

const axios = require('axios');

const GAS_URL = process.env.GAS_URL;

// =======================
// 🤖 Client
// =======================
const client = new Client({
  intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers]
});

// =======================
// 📌 Slash Commands
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
    ),
  new SlashCommandBuilder()
    .setName('lw')
    .setDescription('建立決賽投票')
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
    .setName('setwelcome')
    .setDescription('設定伺服器歡迎訊息')
    .addStringOption(opt =>
      opt.setName('內容')
        .setDescription('歡迎訊息內容')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const rest = new REST({ version: '10' }).setToken(botToken);

(async () => {
  try {
    // const guildID = '1337453186180714577';
    // await rest.put(
    //   Routes.applicationGuildCommands(
    //     appID,
    //     guildID
    //   ),
    //   { body: commands }
    // );
    await rest.put(
      Routes.applicationCommands(appID),
      { body: commands }
    );
    console.log('Slash Command 已註冊');
  } catch (err) {
    console.error('Command register failed:', err);
  }
})();

// =======================
// 📌 Bot Ready
// =======================
client.once(Events.ClientReady, () => {
  console.log(`Bot Online: ${client.user.tag}`);
});

// =======================
// 📌 Interaction Handler
// =======================
client.on(Events.InteractionCreate, async interaction => {

  // =======================
  // /gw
  // =======================
  if (interaction.isChatInputCommand() && (interaction.commandName === 'gw' || interaction.commandName === 'lw')) {

    let date = interaction.options.getString('日期');
    const deadline = interaction.options.getString('截止');

    let title = `⚔️ ${date}幫戰(兩場)參與調查，截止日${deadline} 24:00`;
    if (interaction.commandName === 'lw'){
      title = `⚔️ ${date}決賽參與調查，截止日${deadline} 24:00`;
      date = `${date}決`;
    } 

    const row = new ActionRowBuilder().addComponents(
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

    return interaction.reply({
      content: title,
      components: [row]
    });
  }

  // =======================
  // /tw
  // =======================
  if (interaction.isChatInputCommand() && interaction.commandName === 'tw') {

    const date = interaction.options.getString('日期');
    const deadline = interaction.options.getString('截止');

    const title = `🏆 ${date} 幫戰+決賽參與調查\n截止日 ${deadline} 24:00`;

    const row1 = new ActionRowBuilder().addComponents(
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
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tw_result_${date}`)
        .setLabel('查看結果')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: title,
      components: [row1, row2]
    });
  }

  //set welcome
  if (interaction.isChatInputCommand() && interaction.commandName === 'setwelcome') {
    const welcomeMessage = interaction.options.getString('內容');
    await interaction.deferReply({ ephemeral: true });
    try {
        await axios.post(GAS_URL, {
            action: 'setWelcome',
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            welcomeMessage
        });

        return interaction.editReply({
            content: '✅ 歡迎訊息已更新',
            ephemeral: true
        });

    } catch (err) {
        console.error(err);

        return interaction.editReply({
            content: '❌ 更新失敗',
            ephemeral: true
        });

    }
  }

  // =======================
  // 📌 Button Handler
  // =======================
  if (!interaction.isButton()) return;

  const [mode, type, voteDate] = interaction.customId.split('_');

  if (type != 'result') {
    // =======================
    // 🗳 投票
    // =======================
    const voteMap = mode == 'gw' || mode == 'lw'
      ? {
          yes: ['0', '參加'],
          maybe: ['1', '不一定'],
          no: ['2', '無法參加']
        }
      : {
          full: ['0', '參加幫戰+決賽'],
          yes: ['1', '只參加幫戰'],
          maybe: ['2', '不一定參加幫戰'],
          no: ['3', '無法參加']
        };

    if (!voteMap[type]) {
      return interaction.reply({
        content: '❌ 無效選項',
        ephemeral: true
      });
    }

    const [voteIndex, voteText] = voteMap[type];

    try {
      await interaction.deferReply({ ephemeral: true });

      await axios.post(GAS_URL, {
        mode,
        voteDate,
        userId: interaction.user.id,
        username: interaction.user.username,
        vote: voteIndex
      }, { timeout: 8000 });

      return interaction.editReply(`✅ 已投票：${voteText}`);

    } catch (err) {
      console.error(err);
      return interaction.editReply('❌ 投票失敗（API timeout 或錯誤）');
    }
  }else{
    // =======================
    // 📊 查看結果
    // =======================
    try {
      await interaction.deferReply({ ephemeral: true });

      const res = await axios.get(`${GAS_URL}?mode=${mode}&voteDate=${voteDate}`);
      const data = res.data.result;
      console.log( data);
      const buildList = arr => arr?.length ? arr.map(id => `<@${id}>`).join(' ') : '無';

      // ===== GW =====
      if (mode == 'gw') {
        const total = data.yes.length + data.maybe.length + data.no.length;

        return interaction.editReply({
          embeds: [{
            title: `⚔️ ${voteDate} 幫戰投票結果`,
            description: [
              `👥 共 ${total} 人投票`,
              '',
              `🟢 參加 (${data.yes.length})`,
              buildList(data.yes),
              '',
              `🔵 不一定 (${data.maybe.length})`,
              buildList(data.maybe),
              '',
              `🔴 無法參加 (${data.no.length})`,
              buildList(data.no)
            ].join('\n')
          }]
        });
      }

      // ===== TW =====
      if (mode == 'tw') {
        const total =
          data.full.length +
          data.yes.length +
          data.maybe.length +
          data.no.length;

        return interaction.editReply({
          embeds: [{
            title: `🏆 ${voteDate} 幫戰+決賽投票結果`,
            description: [
              `👥 共 ${total} 人投票`,
              '',
              `🟢 幫戰+決賽 (${data.full.length})`,
              buildList(data.full),
              '',
              `🔵 只參加幫戰 (${data.yes.length})`,
              buildList(data.yes),
              '',
              `🟡 不一定 (${data.maybe.length})`,
              buildList(data.maybe),
              '',
              `🔴 無法參加 (${data.no.length})`,
              buildList(data.no)
            ].join('\n')
          }]
        });
      }

    } catch (err) {
       //console.error(err);
      return interaction.editReply('❌ 讀取投票結果失敗');
    }
  }
});

// 新成員加入
client.on('guildMemberAdd', async (member) => {

  const channel = member.guild.systemChannel; // 預設系統頻道

  if (!channel) return;

  // const res = await axios.get(GAS_URL, {
  //   params: {
  //       action: "getGuildConfig",
  //       guildId: member.guild.id
  //   }
  // });

  // const msg = res.data.welcomeMessage
  //   .replace("{user}", `<@${member.id}>`)
  //   .replace("{server}", member.guild.name)
  //   .replace("{name}", member.displayName)
  //   .replace("{count}", member.guild.memberCount);

  // channel.send(msg);
  console.log (`TEST: ${member.guild.id}`);
  if(member.guild.id == '1521089728559190027' || member.guild.id == '1337453186180714577'){
    await channel.send(
      `🎉 歡迎 ${member} 加入「${member.guild.name}」！\n\n` +
      `請記得將伺服器暱稱修改為：俱樂部名+遊戲 ID。\n` +
      `修改方式：\n` +
      `1️⃣ 點選自己的名字\n` +
      `2️⃣ 編輯個人資料\n` +
      `3️⃣ 編輯伺服器個人資料\n` +
      `4️⃣ 在「伺服器暱稱」輸入遊戲 ID`
    );
  }else{
    await channel.send(
      `🎉 歡迎 ${member} 加入「${member.guild.name}」！\n\n` +
      `請記得將伺服器暱稱修改為遊戲 ID。\n` +
      `修改方式：\n` +
      `1️⃣ 點選自己的名字\n` +
      `2️⃣ 編輯個人資料\n` +
      `3️⃣ 編輯伺服器個人資料\n` +
      `4️⃣ 在「伺服器暱稱」輸入遊戲 ID`
    );
  }
  
});

// 成員離開
client.on('guildMemberRemove', async (member) => {

  const channel = member.guild.systemChannel; // 預設系統頻道

  if (!channel) return;

  await channel.send(
    `👋 ${member.user.tag} 已離開伺服器，祝一切順利！`
  );
});

client.login(botToken);

