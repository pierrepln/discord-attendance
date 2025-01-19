

const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running!");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

// Create a new client instance with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // For interacting with guilds
        GatewayIntentBits.GuildVoiceStates, // To access voice channel members
        GatewayIntentBits.GuildMessages, // To receive messages
        GatewayIntentBits.MessageContent, // To read message content (if needed for plain commands)
    ],
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guild } = interaction;

    if (commandName === "bdm") {
        await interaction.deferReply();

        // Find the "CTA" voice channel
        const voiceChannel = guild.channels.cache.find(
            (channel) => channel.type === 2 && channel.name === "CTA",
        );

        if (!voiceChannel) {
            await interaction.editReply('Voice channel "CTA" not found.');
            return;
        }

        // Find the "attendance" text channel
        const bdmTextChannel = guild.channels.cache.find(
            (channel) => channel.type === 0 && channel.name === "attendance",
        );

        if (!bdmTextChannel) {
            await interaction.editReply('Text channel "attendance" not found.');
            return;
        }

        // Fetch the bot's latest message in the "bdm" channel
        const messages = await bdmTextChannel.messages.fetch({ limit: 10 });

        const botMessage = messages.find(
            (msg) => msg.author.id === client.user.id && msg.type === 0,
        ); // type 0 is to identify a regular message (to differentiate from an interation response message)

        // Parse the stored user data from the message (if exists)
        let userCounts = {};
        if (botMessage) {
            console.log("botMessage.content: ", botMessage.content);
            const lines = botMessage.content.split("\n");
            lines.forEach((line) => {
                const [username, count] = line.split(": ");
                if (username && count) {
                    userCounts[username.trim()] = parseInt(count.trim(), 10);
                }
            });
        }

        // Get the current users in the "General" voice channel
        const membersInChannel = voiceChannel.members;
        membersInChannel.forEach((member) => {
            const username = member.user.username;
            userCounts[username] = (userCounts[username] || 0) + 1;
        });

        // Create the updated message content
        const updatedMessage = Object.entries(userCounts)
            .map(([username, count]) => `${username}: ${count}`)
            .join("\n");

        console.log("updatedMessage: ", updatedMessage);

        // Update or send the message in "bdm"
        if (botMessage && botMessage.content !== "") {
            await botMessage.edit(updatedMessage);
        } else {
            if (updatedMessage) {
                await bdmTextChannel.send(updatedMessage);
            }
        }

        // Send a response to the user and delete it after 10 seconds
        const reply = await interaction.editReply({
            content: "Update complete. This message will be clean-up automatically after 5s.",
            ephemeral: true,
        });

        // Delete the reply after 10 seconds
        setTimeout(async () => {
            try {
                await reply.delete();
            } catch (error) {
                console.error("Error deleting the reply message:", error);
            }
        }, 5000); // 5000 milliseconds = 5 seconds
    }
});

// Log in the bot
client.login(process.env.BOT_TOKEN);
