const { exec } = require('child_process');
const fs = require("fs");
const Discord = require("discord.js");
const TRIGGER = 'bot>'

let client = new Discord.Client();
client.config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const options = {
	split: {
		char: "\n",
		prepend: "```",
		append: "```"
	}
}

client.on("message", msg => {
	var content = msg.content.split(' ')
	// Check for command trigger
	if (content[0] === TRIGGER){
		var cmd = content[1]
		switch (content[1]) {
			case 'help':
				/*
				< SERVER-BOT >
				Usage:
				bot> [command]
						├─ help		: usage/command list
						├─ info 	: show server info (Name, ID, IPv4)
						├─ list [target]
						│			├─ worlds	: show current and available worlds
						│			└─ users	: show server members
						├─ start	: start server
				*/
				msg.channel.send("[server-bot]\n[Commands:]\n├── help\tusage/command list\n├── info\tshow server info (Name, ID, IPv4)\n├── list [target]\n\t├── worlds\tshow current and available worlds\n\t├── users\tshow server members\n├── start\tstart server\n├── status\tshow server status, IP address, current world and online members\n├── stop\tstop server")
				break;
			case 'info':

				break;
			case 'start':

				break;
			case 'status':
				/*
					return server-bot status

					example:
					< SERVER-BOT >
					server : ON
					IPv4 : 10.192.168.0
					world : blok
					online-users : 3
					total-users : 6

					online:
						> Blok 		: 10.192.168.1 	: (Seattle, WA, USA)
						> Agent 	: 10.192.168.2 	: (Seattle, WA, USA)
						> TrevBot 	: 10.192.168.3 	: (Seattle, WA, USA) 
				*/
				
				break;
			case 'set':

				break;
			case 'stop':

				break;
			case 'list':

				break;
			default:
				msg.channel.send("Error: " + cmd + "is not a valid command.\nUse \'" + TRIGGER + " help\' for usage.")
				break;
		}
	}
	if (msg.channel.id === client.config.channel && msg.author.id === client.config.owner) exec(msg.content, (err, stdout, stderr) => {
		if (err) console.error(err);
		if (stdout) msg.channel.send("```\n" + Discord.escapeMarkdown(stdout, true) + "```", options);
		if (stderr) msg.channel.send("```\n" + Discord.escapeMarkdown(stderr, true) + "```", options);
	});
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);