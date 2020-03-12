const { exec } = require('child_process');
const fs = require("fs");
const Discord = require("discord.js");

let client = new Discord.Client();
config = JSON.parse(fs.readFileSync("config.json", "utf8"));
client.config = config.discord;

const BOT = config.bot.botName;
var current_world = '';

const options = {
	split: {
		char: "\n",
		prepend: "```",
		append: "```"
	}
}

const emoji = {
	online = "🟢",
	offline = "🔴"
}

client.on("message", msg => {
	var content = msg.content.split(' ')
	var out = '';
	// Check for command trigger
	if (content[0] === `${BOT}>`){
		var cmd = content[1]
		switch (content[1]) {
			case 'help':
				/*
				< SERVER-BOT >
				USAGE:
				bot> [command]
						├─ help		: usage/command list
						├─ info		: show server info (Name, ID, IPv4)
						├─ list [target]
						│			├─ worlds	: show current and available worlds
						│			└─ users	: show server members
						├─ set [target]
						│			└─ worlds	: set current world
						├─ start	: start server
						├─ status	: show server status, IP address, current world and online members
						└─ stop		: stop server
				*/
				const help = `Usage:
				${BOT}> [command]
				\t\t├─ help\t\t: usage/command list
				\t\t├─ info\t\t: show server info (Name, ID, IPv4)
				\t\t├─ list [target]
				\t\t│\t\t\t├─ worlds\t: show current and available worlds
				\t\t│\t\t\t└─ users\t: show server members
				\t\t├─ set [target]
				\t\t│\t\t\t└─ worlds\t: set current world
				\t\t├─ start\t: start server
				\t\t├─ status\t: show server status, IP address, current world and online members
				\t\t└─ stop\t\t: stop server`;

				msg.channel.send(help);
				break;
			case 'info':
				/*
				INFO:
				Name	: server
				ID		: a23j2323j
				IPv4	: 10.192.168.0
				*/
				var output = getServerInfo(config);
				if (output){
					out = `__INFO:__
					Name	: ${out.name}
					ID		: ${out.networkId}
					IPv4	: ${out.ipAssignments[0]}`;
				}
				else {
					out = '[Error] Request failed.';
				}
				msg.channel.send(out);
				break;
			case 'list':
				switch (content[1]) {
					case "worlds":
						output = getWorldList(config.bot.server_path)
						out = `Worlds:`;
						if (output){
							output.foreach( (element) => {
								output = `${output}
								 > ${element}`;
							});
						}
						else {
							out = `${out}
							[Error] failed to fetch worlds.`;
						}
						break;
					case "users":
						out = `Users:`
						output = getMembers(config);
						if (output){
							output.foreach((element) => {
								var status = emoji.online;
								if (element.online){
									status = emoji.online;
								}
								else {
									status = emoji.offline;
								}
								out = `${out}
								\t${status} > ${element.name}\t: ${element.ipAssignments[0]}`;
							});
						}
						else {
							out = `${out}
							[Error] failed to fetch members`
						}
						break;
					default:
						out = `[Error] target '${content[1]}' not recognized.
						Use '${BOT}> help' for usage.`;
						break;
					msg.channel.send(out);
				}

				break;
			case 'set':
				switch (content[1]) {
					case "world":
						if (getCurrentWorld(config.bot.server_path) === content[2]){
							/* World already set as current level */
							out = `[Error] current world already set to '${content[2]}'`;
						}
						else if (!getWorldList(config.bot.server_path).includes(content[2])){
							/* Error world not in maps directory */
							out = `[Error] ${content[2]} not in 'maps' directory.`;
						}
						else {
							res = setCurrentWorld(config.bot.server_path, content[2]);
							if (!res){
								out = `World set to '${content[2]}' = ${res}
								Start/restart server to play.`;
							}
						}
						break;
					default:
						/* Error target not recognized */
						out = `[Error] target '${content[1]}' not recognized.
						Use '${config.bot.botName}> help' for usage.`;
						break;
					msg.channel.send(out)
				}

				break;
			case 'start':
				exec(`bash ./scripts/start_server.sh ${config.bot.server_path}`, (err, stdout, stderr)  => {
					if (err) console.error(err);
					if (stdout) msg.channel.send(stdout);
					if (stderr) msg.channel.send(stderr);
				});
				break;
			case 'status':
				/*
				return server-bot status

				example:
				STATUS:
				server : 🟢
				IPv4 : 10.192.168.0
				world : map1
				online-users : 3
				total-users : 6                TODO: IP Geolocating 
														|
				online:									V
					> user1 	: 10.192.168.1 	: (Seattle, WA, USA)
					> user2 	: 10.192.168.2 	: (Seattle, WA, USA)
					> user3 	: 10.192.168.3 	: (Seattle, WA, USA) 
				*/

				var is_online = gameServerStatus("minecraft");
				var ip = '';
				var status = (is_online) ? emoji.online : emoji.offline; 

				output = getServerInfo(config);
				if (output){
					ip = output.getServerInfo[0];
				}
				else {
					ip = '[Error] failed to fetch IP.'
				}

				var currentWorld = getCurrentWorld(config.bot.server_path);

				out = `STATUS:
				Server\t: ${status}
				IPv4\t: ${ip}
				World\t: ${currentWorld}
				
				Online:`

				output = getMembers(config);
				if (output){
					output.foreach((element) => {
						if (element.name != config.bot.sever_name && element.online === true) {
							out = `${out}
							\t> ${element.name}\t: ${element.ipAssignments[0]}`;
						}
					});
				}
				else {
					out = `${out}
					[Error] failed to fetch members.`
				}

				msg.channel.send(out);
				break;
			case 'stop':
				exec(`bash ./scripts/stop_server.sh`, (err, stdout, stderr)  => {
					if (err) console.error(err);
					if (stdout) out = stdout;
					if (stderr) out = stderr;
				});
				msg.channel.send(out);
				break;
			default:
				msg.channel.send(`[Error] ${cmd} is not a valid command.
				Use '${config.bot.botName}> help' for usage.`)
				break;
		}
	}
	if (msg.channel.id === client.config.channel && msg.author.id === client.config.owner) exec(msg.content, (err, stdout, stderr) => {
		if (err) console.error(err);
		if (stdout) msg.channel.send(stdout);
		if (stderr) msg.channel.send(stderr);
	});
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);

function getServerInfo(config){
	var output = null;
	exec(`curl -H \"Authorization: bearer ${config.bot.zero_tier_token}\" https://my.zerotier.com/api/network/${config.bot.network_id}/member/${config.bot.server_id}`, (err, stdout, stderr) => {
		if (stdout){
			output = JSON.parse(stdout);
		}
	});
	return output
}

function getMembers(config){
	var output = null;
	exec(`curl -H \"Authorization: bearer ${config.bot.zero_tier_token}\" https://my.zerotier.com/api/network/${config.bot.network_id}/member`, (err, stdout, stderr) => {
		if (stdout){
			output = JSON.parse(stdout);
		}
	});
	return output
}

function gameServerStatus(name){
	switch (name) {
		case "minecraft":
			exec(`screen -ls | grep minecraft`, (err, stdout, stderr) => {
				if (err) return false;
				if (stdout) return true;
				if (stderr) return false;
			});
			break;
		default:
			return false;
			break;
	}
}

function getCurrentWorld(serverPath){
	exec(`cat ${serverPath} | grep level-name | awk '{split($0,a,"/"); print a[1]}'`, (err, stdout, stderr) => {
		if (err) return 'Error';
		if (stdout) return stdout;
		if (stderr) return `[Error] ${stderr}`;
	});
}

function setCurrentWorld(serverPath, name){
	exec(`sed -i -e "s/level-name=maps/.*/level-name=maps/${name}/g" /${serverPath}/server.properties`, (err, stdout, stderr) => {
		if (err) return false;
		if (stdout) return true;
		if (stderr) return false;
	});
}

function getWorldList(serverPath){
	var out = "";
	exec(`ls ${serverPath}/maps/`, (err, stdout, stderr) => {
		if (err) return [];
		if (stdout) out = stdout;
		if (stderr) return [];
	});
	out = out.split("\n");
	return out;
}