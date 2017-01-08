class MessageEventWrapper {
	constructor(bot, event) {
		this._bot = bot;
		this._forceDM = false;

		Object.assign(this, JSON.parse(JSON.stringify(event)));
	}

	reply(message) {
		if (this._forceDM) return this.replyDM(message);

		if (typeof(message) === 'string') {
			this._bot.sendMessage({
				to: this.channel_id,
				message: '<@' + this.author.id + '> ' + message
			});
		} else {
			this._bot.sendMessage({
				to: this.channel_id,
				message: message.message ? '<@' + this.author.id + '> ' + message.message : null,
				embed: message.embed
			});
		}
	}

	replyDM(message) {
		if (this._bot.channels[this.channel_id]) {
			this._bot.deleteMessage({
				channelID: this.channel_id,
				messageID: this.id
			});
		}

		if (typeof(message) === 'string') {
			this._bot.sendMessage({
				to: this.author.id,
				message: message
			});
		} else {
			this._bot.sendMessage({
				to: this.author.id,
				message: message.message,
				embed: message.embed
			});
		}
	}
}

module.exports = MessageEventWrapper;
