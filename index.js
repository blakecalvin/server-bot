const { exec } = require('child_process');
const execSync =  require('child_process').execSync;
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
	online: "🟢",
	offline: "🔴"
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
				const cmds = `${BOT}> [command]
			├─ help    : usage/command list
			├─ info    : show server info (Name, ID, IPv4)
			├─ list [target]
			│         ├─ worlds  : show current and available worlds
			│         └─ users   : show server members
			├─ set [target]
			│         └─ world   : set current world
			├─ start   : start server
			├─ status  : show server status, IP address, 
			│ 			     current world and online members
			└─ stop    : stop server`;
				const help = "**Usage:** ```\n" + Discord.escapeMarkdown(cmds, true) + "```";

				msg.channel.send(help, options);
				break;
			case 'info':
				/*
				INFO:
				Name	: server
				ID		: a23j2323j
				IPv4	: 10.192.168.0
				*/
				exec(`curl -H \"Authorization: bearer ${config.bot.zero_tier_token}\" https://my.zerotier.com/api/network/${config.bot.network_id}/member/${config.bot.server_id}`, (err, stdout, stderr) => {
					var info = null;
					if (stdout){
						output = JSON.parse(stdout);
						if (output){
							info = "**Server Info:**\n"+"```"+Discord.escapeMarkdown("Name\t: "+output['name']+"\nID\t  : "+output['networkId']+"\nIPv4\t: "+output['config']['ipAssignments'][0])+"```";
						}
						else {
							info = '[Error] Request failed.';
						}
					}
					else if (stderr){
						info = stderr;
					}
					else if (err){
						console.log(err);
					}
					msg.channel.send(info);
				});
				break;
			case 'list':
				switch (content[2]) {
					case "worlds":
						current = getCurrentWorld(config.bot.server_path);
						current = current.replace(/(\r\n|\n|\r)/gm, "");
						console.log(`current: ${current}`);
						var worlds = `**Current World:**\n - ${current}\n**All Worlds:**`;
						exec(`ls ${config.bot.server_path}/maps/`, (err, stdout, stderr) => {
							if (stdout) {
								output = stdout;
								
								if (output){
									output = output.split("\n");
									console.log(output);
									output.forEach( element => {
										if (element != ''){
											element = element.replace(/(\r\n|\n|\r)/gm, "");
											worlds = worlds + "\n - " + element;	
										}
									});
								}
								else {
									worlds = `${worlds}
									[Error] failed to fetch worlds.`;
								}
							}
							else if (stderr) worlds = stderr;
							else if (err) console.log(err);
							msg.channel.send(worlds);
						});
						break;
					case "users":
						exec(`curl -H \"Authorization: bearer ${config.bot.zero_tier_token}\" https://my.zerotier.com/api/network/${config.bot.network_id}/member`, (err, stdout, stderr) => {
							var users = "**Users:**";
							if (stdout){
								output = JSON.parse(stdout);
								if (output){
									users = users + "```";
									output.forEach(element => {
										var status = emoji.online;
										if (element.online){
											status = emoji.online;
										}
										else {
											status = emoji.offline;
										}
										users = users + "\n " + status + " : " + element['name'] + " : " + element['config']['ipAssignments'][0];
									});
									users = users + "\n```";
								}
								else {
									users = users+"\n[Error] failed to fetch users.";
								}
							}
							else if (stderr) users = stderr;
							else if (err) console.log(err);
							msg.channel.send(users);
						});
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;
				}

				break;
			case 'set':
				/*
				switch (content[1]) {
					case "world":
						if (getCurrentWorld(config.bot.server_path) === content[2]){
							
							out = `[Error] current world already set to '${content[2]}'`;
						}
						else if (!getWorldList(config.bot.server_path).includes(content[2])){
						
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
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;
				}
				*/

				break;
			case 'start':
				exec(`bash ./scripts/start_server.sh ${config.bot.server_path}`, (err, stdout, stderr)  => {
					if (err) console.error(err);
					if (stdout) msg.channel.send("Starting server...");
					else if (stderr) msg.channel.send(stderr);
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
					if (stdout) msg.channel.send("Stopping server...");
					else if (stderr) msg.channel.send(stderr);
				});
				break;
			default:
				out = "[Error] command `"+content[1]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				msg.channel.send(out);
				break;
		}
	}
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);

function getServerInfo(msg, config){
	var output = null;

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
			status = execSync(`screen -ls | grep minecraft`).toString();
			console.log(status);
			return true;
			break;
		default:
			return false;
			break;
	}
}

function getCurrentWorld(serverPath){
	var current = execSync(`cat ${serverPath}/server.properties | grep level-name | awk \'{split($0,a,\"/\"); print a[2]}\'`).toString();
	return current;
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

	
	return out;
}