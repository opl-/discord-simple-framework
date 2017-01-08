class MessageEventWrapper {
	constructor(bot, event) {
		this._bot = bot;
		this._forceDM = false;

		Object.assign(this, event);
	}

	deleteMessage() {
		this._bot.rest.methods.deleteMessage({
			channel: {
				id: this.channel_id
			},
			id: this.id
		});
	}

	reply(message) {
		if (this._forceDM) return this.replyDM(message);

		if (typeof(message) === 'string') {
			this._bot.channels.get(this.channel_id).sendMessage('<@' + this.author.id + '> ' + message);
		} else {
			this._bot.channels.get(this.channel_id).sendEmbed(message.embed, message.message);
		}
	}

	replyDM(message) {
		if (this._bot.channels.get(this.channel_id)) this.deleteMessage();

		if (typeof(message) === 'string') {
			this._bot.users.get(this.author.id).send(message);
		} else {
			this._bot.users.get(this.author.id).sendEmbed(message.embed, message.message);
		}
	}
}

module.exports = MessageEventWrapper;
