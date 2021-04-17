import { getTecherRoleId } from "./privileges.js";
// classroom.on("test_create",=> {createChannel()})
//classroom.on("")

/**
 * Creates a channel with the message author username as name.
 * @param {Discord.Message} message The received message
 * @param {string} channelName Name of the channel 
 */
export function createChannel(message, channelName) {
    let name = message.author.username;
    message.guild?.channels.create(channelName, {
        type: "text", //This create a text channel, you can make a voice one too, by changing "text" to "voice"
        permissionOverwrites: [
            {
                id: message.guild.roles.everyone, //To make it be seen by a certain role, use an ID instead
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"], //Allow permissions
                deny: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"] //Deny permissions
            }
        ],
    })
        .catch(console.error);
}
/**
 * Creates channel for Teachers
 * @param {Discord.Guild} guild The guild which members will be returned 
 * @param {string} channelName 
 */
export async function createTestChannel(guild, channelName) {
    const teacherRoleId = await getTecherRoleId(guild.id);
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    guild?.channels.create(channelName, {
        type: "text", //This create a text channel, you can make a voice one too, by changing "text" to "voice"
        permissionOverwrites: [
            {
                id: teacherRoleId, // Allows Teachers to see this channel
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"], //Allow permissions
            },
            {
                id: guild.roles.everyone,// Deny everyone else to see this channel
                deny: ["VIEW_CHANNEL"]
            }
        ],
    })
        .catch(console.error);
}