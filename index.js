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
			├─ backup  : make backup of current world.
			├─ info    : show server info (IPv4, MC world/version)
			├─ list [target]
			│         ├─ modpacks: show modpack for each version
			│         ├─ worlds  : show current and available worlds
			│         └─ users   : show server members
			├─ set [target]
			│         └─ world [name]: set current world (under maintenance)
			├─ start   : start server
			├─ status  : show server status, IP address, 
			│ 			     current world and online members
			└─ stop    : stop server`;
				const help = "**Usage:** ```\n" + Discord.escapeMarkdown(cmds, true) + "```";

				msg.channel.send(help, options);
				break;
			case 'backup':
				makeBackup(config.bot.serverPath);
				msg.channel.send(`[Info] Made backup of current world.`);
				break;
			case 'info':
				var worldInfo = getCurrentWorld(config.bot.serverPath);
				console.log(worldInfo.toString());
				var version = worldInfo.version;
				console.log(version);
				var world = worldInfo.world;
				world = world.replace(/(\r\n|\n|\r)/gm, "");
				console.log(world);
				var info = "**Server Info:**\n"+"```"+Discord.escapeMarkdown("IPv4 : "+config.bot.serverIP+"\nWorld : "+world+"\nVersion : "+version)+"```";
				msg.channel.send(info);
				break;
			case 'list':
				switch (content[2]) {
					case "modpacks":
						msg.channel.send("**Modpacks:**\n```" + Discord.escapeMarkdown(listModpacks(config.bot.serverPath)) + "```\nDownlaod Here:\nhttps://drive.google.com/open?id=1QlmfzqNZbYYnWC6WzYPki7061Ce8Jc9M");
					case "worlds":
						var worldInfo = getCurrentWorld(config.bot.serverPath);
						var version = worldInfo.version;
						var current = worldInfo.world;
						current = current.replace(/(\r\n|\n|\r)/gm, "");
						console.log(`current: ${current}`);
						var world_msg = "**Worlds:**\n```";
						var worlds = "Current World: " + current + "\nVersion: " + version + "\n\nAll Worlds:";
						var list = getWorldList(config.bot.serverPath);
						console.log(Object.keys(list))
						var keys = Object.keys(list);
						keys.forEach( element => {
							worlds = worlds + "\n" + list[element];
							list[element].forEach( element2 => {
								worlds = worlds + "\n    -" + element2;
							})
						})
						world_msg = world_msg +  worlds + "```";
						msg.channel.send(worlds);
						break;
					case "users":
						var members = getMembers(config.bot.serverPath);
						var list_msg = "**Users:**\n```";
						var member_msg = "";
						if (members != null){
							members.forEach( element => {
								member_msg = member_msg + "\n  " + emoji.online + " : " + element;
							});
						}
						else {
							member_msg = "None. You's alone ☹️"
						}
						list_msg = list_msg + Discord.escapeMarkdown(member_msg) + "```";
						msg.channel.send(list_msg);
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;
				}

				break;
			case 'set':
				/*
				switch (content[2]) {
					case "world":
						console.log(getCurrentWorld(config.bot.serverPath)+" == "+content[3]);
						console.log(getCurrentWorld(config.bot.serverPath) == content[3]);
						if (getCurrentWorld(config.bot.serverPath) == content[3]){
							
							out = "[Error] current world already set to `" + content[3] + "`" ;
						}
						else if (!getWorldList(config.bot.serverPath).includes(content[3])){
						
							out = "[Error] `"+content[3]+"` not in `maps` directory.";
						}
						else {
							res = setCurrentWorld(config.bot.serverPath, content[3]);
							if (!res){
								out = "World set to \'" + content[3] + "\'\nStart/restart server to play.";
							}
						}
						msg.channel.send(out);
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;	
				}
				*/
				break;
			case 'start':
				status = gameServerStatus("minecraft");
				if (status){
					msg.channel.send(`[Error] Server already running.`);
					break;
				}
				var worldInfo = getCurrentWorld(config.bot.serverPath);
				var version = worldInfo.version; 
				execSync(`bash ./scripts/start_server.sh ${config.bot.serverPath} ${version}`);
				status = gameServerStatus("minecraft");
				if (status){
					msg.channel.send(`[Info] Starting server, please wait...`);
					setTimeout(function(){
						msg.channel.send(`[Success] Server started.`);
					}, 3000);
				}
				else{
					msg.channel.send(`[Error] encountered error starting server.`);
				}
				break;
			case 'status':
				/*
				return server-bot status

				example:
				STATUS:
				server : 🟢
				IPv4 : 10.192.168.0
				world : map1
				version : 1.12.2
								               TODO: IP Geolocating 
														|
				online:									V
					> user1 	: 10.192.168.1 	: (Seattle, WA, USA)
					> user2 	: 10.192.168.2 	: (Seattle, WA, USA)
					> user3 	: 10.192.168.3 	: (Seattle, WA, USA) 
				*/

				var is_online = gameServerStatus("minecraft");
				var ip = config.bot.serverIP;
				var status = (is_online) ? emoji.online : emoji.offline; 

				var worldInfo = getCurrentWorld(config.bot.serverPath);
				var version = worldInfo.version;
				var currentWorld = worldInfo.world;
				currentWorld = currentWorld.replace(/(\r\n|\n|\r)/gm, "");

				out = "**Status:**\n```"+ Discord.escapeMarkdown("Server : "+status+"\nIPv4 : "+ip+"\nWorld : "+currentWorld+"\nVersion : "+version+"\nOnline : ");

				//output = getMembers(config.bot.serverPath);
				out = out + "```";

				msg.channel.send(out);
				break;
			case 'stop':
				status = gameServerStatus("minecraft");
				if (status){
					msg.channel.send(`[Error] No server running.`);
					break;
				}
				execSync(`bash ./scripts/stop_server.sh`);
				setTimeout(function(){
					msg.channel.send(`[Info] Stopping server, please wait...`);
				}, 3000);
				status = gameServerStatus("minecraft");
				if (status){
					msg.channel.send(`[Error] encountered error stopping server.`)
				}
				else{
					msg.channel.send(`[Success] Server stopped.`);
				}
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

// Todo: update to use forge to output active players using "list" command
function getMembers(serverPath){
	setTimeout(function(){
		execSync(`screen -S minecraft -p 0 -X stuff \"list^M\"`);
	}, 200);
	var members = execSync(`tail -n 5 ${serverPath}/logs/latest.log | grep players`).toString();
	members = members.split(':');
	members = members[4];
	if (members.length > 1){
		members = members.split(',');
		console.log(members);
	}
	else{
		members = null;
	}
	return members;
}

function gameServerStatus(name){
	switch (name) {
		case "minecraft":
			try {
				status = execSync(`screen -ls | grep minecraft`).toString();
				console.log(status);
				return true;
			}
			catch(error){
				console.error(error);
				return false;
			}
			break;
		default:
			return false;
			break;
	}
}

function getCurrentWorld(serverPath){
	var current = execSync(`cat ${serverPath}/server.properties | grep level-name | awk \'{split($0,a,\"/\"); print a[2] \" \" a[3]}\'`).toString();
	current = current.split(" ");
	current.forEach( element => {
		element = element.replace(/(\r\n|\n|\r)/gm, "");
	});
	return {
		version: current[0],
		world: current[1]
	};
}

// Todo: update
function setCurrentWorld(serverPath, name){
	var set = execSync(`sed "s|level-name=maps/.*|level-name=maps/${name}|g" ${serverPath}/server.properties`).toString();
	return set;
}

function getWorldList(serverPath){
	var output = execSync(`ls ${serverPath}/maps/`).toString();
	var versions = null;
	var worlds = null;
	if (output){
		output = output.split("\n");
		output = output.splice(output.length-1,1);
		console.log(output);
		output.forEach( element => {
			if (element != ''){
				element = element.replace(/(\r\n|\n|\r)/gm, "");	
			}
		});
		versions = output;
		worlds = {};
		versions.forEach( element => {
			worlds[element] = [];
			output = execSync(`ls ${serverPath}/maps/${element}`).toString();
			if (output){
				output = output.split("\n");
				output = output.splice(output.length-1,1);
				console.log(output);
				output.forEach( element2 => {
					if (element2 != ''){
						element2 = element2.replace(/(\r\n|\n|\r)/gm, "");	
					}
				});
				worlds[element] = output;
			}
		})
	}
	else {
		versions = [];
	}
	return worlds;
}

function  makeBackup(serverPath){
	var output = getCurrentWorld(serverPath);
	var version = output.version;
	var name = output.world;
	execSync(`bash ./scripts/backup.sh ${config.bot.serverPath} ${version} ${name}`);
}

function listModpacks(serverPath){
	var output = execSync(`cat ./modpacks.txt`).toString();
	return output;
}