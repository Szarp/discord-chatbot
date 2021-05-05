import { getTecherRoleId } from "./privileges.js";
/**
 * Creates channel for Teachers
 * @param {Discord.Guild} guild The guild which members will be returned
 * @param {string} channelName  Name of teh channel
 */
export async function createTestChannel(guild, channelName) {
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    // TODO error handling
    try {
        const teacherRoleId = await getTecherRoleId(guild.id);
        const channel = await createPrivateChannel(guild, channelName, teacherRoleId, guild.roles.everyone);
        return channel;
    } catch (e) {
        console.log(e);
        return null
    }
}
/**
 * @param {Discord.Guild} guild Server
 * @param {string} channelName Neme of the channel
 * @param {string} allowId Id of user/group who can see the chat
 * @param {string} denyId Id of user/group wgo can't see the chat
 */
export async function createPrivateChannel(guild, channelName, allowId, denyId) {
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    try {
        const channel = await guild?.channels.create(channelName, {
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
        return channel;
    }
    catch (e) {
        console.log(e)
        return null;
    }
}
/**
 * @param {Discord.Guild} guild
 * @param {string} channelName
 * @param {string} userId
 */
export async function createExamChannel(guild, channelName, userId) {
    // TODO move channel to PRIVATE section -> need to capture sectionsId's
    // TODO error handling
    try {
        const channel = createPrivateChannel(guild, channelName, userId, guild.roles.everyone);
        return channel;
    } catch (e) {
        console.log(e)
        return null
    }

}