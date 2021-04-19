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
    // TODO error handling
    createPrivateChannel(guild, channelName,teacherRoleId,guild.roles.everyone)
}
/**
 * @param {Discord.Guild} guild Server 
 * @param {string} channelName Neme of the channel
 * @param {string} allowId Id of user/group who can see the chat
 * @param {string} denyId Id of user/group wgo can't see the chat
 */
export async function createPrivateChannel(guild, channelName,allowId,denyId) {
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    guild?.channels.create(channelName, {
        type: "text", //This create a text channel, you can make a voice one too, by changing "text" to "voice"
        permissionOverwrites: [
            {
                id: allowId, // Allows Id's to see this channel
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"], //Allow permissions
            },
            {
                id: denyId,// Deny Id's else to see this channel
                deny: ["VIEW_CHANNEL"]
            }
        ],
    })
        .catch(console.error);
}
/**
 * @param {Discord.Guild} guild
 * @param {string} channelName
 * @param {string} userId
 */
export async function createExamChannel(guild, channelName,userId) {
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    // TODO error handling
    createPrivateChannel(guild, channelName,userId,guild.roles.everyone)
}