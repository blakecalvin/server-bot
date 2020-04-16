const execSync =  require('child_process').execSync;
const fs = require("fs");
const Discord = require("discord.js");

let client = new Discord.Client();
config = JSON.parse(fs.readFileSync("config.json", "utf8"));
client.config = config.discord;

const BOT = config.bot.botName;

const emoji = {
	online: "🟢",
	offline: "🔴",
	sadFace: "☹️",
	admin: "🤓"
}

const msgs =  {
	adminOnly: "[Info] This command is for Server Admins Only."
}

/*
	-- COMMANDS --

	${BOT}> [command]
	├─ help    : usage/command list
	├─ backup  : make backup of current world (admin-only)
	├─ create [name] [version] : create new world (admin-only)
	├─ info    : show server info (IPv4, MC world/version)
	├─ list [target]
	│         ├─ admins  : show server admins
	│         ├─ mods    : show modpack for each version
	│         ├─ worlds  : show current and available worlds
	│         └─ users   : show server members
	├─ msg [text] : message server (TODO)
	├─ restart : restart server
	├─ set [target]
	│         ├─ admin [name]: set user as admin (admin-only) (TODO)
	│         └─ world [name]: set current world
	├─ start   : start server
	├─ status  : show server status, IP address, 
	│ 			     current world and online members
	└─ stop    : stop server
*/

client.on("message", msg => {
	var content = msg.content.split(' ')
	// Check for command trigger
	if (content[0] === `${BOT}>`){
		var out = '';
		switch (content[1]) {
			case 'help':
				out = "**Usage:**\n```" + Discord.escapeMarkdown(help(), true) + "```";
				break;
			case 'backup':
				if (isAdmin(config.bot.admins, msg.author.id)){
					backup(config.bot.serverPath);
					out = `[Info] Made backup of current world.`;
				} 
				else {
					out = msgs.adminOnly;
				}
				break;
			case 'create':
				if (isAdmin(config.bot.admins, msg.author.id)){
					if (content[2] && content[3]){
						out = createWorld(config, content[2], content[3]);
					}
					else {
						out = "[Error] `"+content[1]+"` requires name and version.\nUse `"+BOT+"> help` for usage.";
					}
				} 
				else {
					out = msgs.adminOnly;
				}
				break;
			case 'info':
				out = "**Server Info:**\n```" + Discord.escapeMarkdown(info(config), true) + "```";
				break;
			case 'list':
				var valid = true;
				switch (content[2]) {
					case "admins":
						out = "**Admins**```";
					break;
					case "mods":
						out = "**Mods**\n";
						break;
					case "worlds":
						out = "**Worlds**\n```";
						break;
					case "users":
						out = "**Users**```";
						break;
					default:
						valid = false;
				}
				if (valid){
					out = out + Discord.escapeMarkdown(list(config, content[2]), true) + "```";
				}
				else{
					out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				}
				break;
			case 'restart':
				serverStatus = getServerStatus("minecraft");
				if (serverStatus){
					stop(msg);
				}
				setTimeout(() => {
					start(config, msg);	
				}, 500);
				setTimeout(() => { 
					serverStatus = getServerStatus("minecraft");
					if (serverStatus){
						out = `[Success] Server restarted.`;
					}
					else {
						out = `[Error] encountered error restarting server.`;
					}
				}, 1000);
				break;
			case 'set':
				if (content[2]){
					switch (content[2]) {
						case "world":
							if (content[3]){
								out = set(config, content[2], content[3]);
							}
							else{
								out = "[Error] `"+content[1]+" "+content[2]+"` requires name.\nUse `"+BOT+"> help` for usage.";
							}
							break;
						default:
							out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
							break;	
					}
				}
				else {
					out = "[Error] `"+content[1]+"` requires target.\nUse `"+BOT+"> help` for usage.";
				}
				break;
			case 'start':
				var serverStatus = getServerStatus("minecraft");
				if (serverStatus){
					out = `[Error] Server already running.`;
				}
				else {
					start(config, msg);		
					setTimeout(() => { 
						serverStatus = getServerStatus("minecraft");
						if (serverStatus){
							out = `[Success] Server started.`;
						}
						else {
							out = `[Error] encountered error starting server.`;
						}
					}, 1000);
				}
				break;
			case 'status':
				out = "**Status**\n```" + Discord.escapeMarkdown(status(config), true) + "```";
				break;
			case 'stop':
				var serverStatus = getServerStatus("minecraft");
				if (!serverStatus){
					out = `[Error] No server running.`;
				}
				else {
					stop(msg);
					setTimeout(() => { 
						serverStatus = getServerStatus("minecraft");
						if (serverStatus){
							out = `[Error] encountered error stopping server.`;
						}
						else if (serverStatus != null){
							out = `[Success] Server stopped.`;
						}
					}, 1000);
				}
				break;
			default:
				out = "[Error] command `"+content[1]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				break;
		}
		setTimeout(() => {
			msg.channel.send(out);
		}, 1500);
	}
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);

// -----------------[ COMMANDS ]---------------------------------------------------------------------------------------------------

function  backup(serverPath){
	var output = getCurrentWorld(serverPath);
	var version = output.version;
	var name = output.world;
	name = removeWhitespace(name);
	var date = getDate();
	execSync(`tar -czvf ${serverPath}/backups/${version}/${name}_${date}.tar.gz ${serverPath}/maps/${version}/${name}/`);
	console.log("[backup()] of \'"+name+"\' \'v"+version+"\' @ "+date);
}

function createWorld(config, name, version){
	var worlds = getWorldList(config.bot.serverPath);

	if (checkWorldList(worlds, name)){
		out = "[Error] `"+name+"` is already used.";
	}
	else if (!checkVersion(config.bot.serverPath, version)){
		out = "[Error] version: `"+version+"` not supported.";
	}
	else {
		var worldInfo = getCurrentWorld(config.bot.serverPath);
		var currentVersion = removeWhitespace(worldInfo.version);
		var currentWorld = removeWhitespace(worldInfo.world);

		console.log("[createWorld()]")
		console.log(" before: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep level-name`).toString());
		execSync(`sed -i "s/level-name=maps\\/.*/level-name=maps\\/${version}\\/${name}/" ${config.bot.serverPath}/server.properties`);
		console.log(" after: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep level-name`).toString());
		
		console.log(" before: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep motd`).toString());
		execSync(`sed -i 's/${currentWorld}/${name}/g' ${config.bot.serverPath}/server.properties`);
		execSync(`sed -i 's/${currentVersion}/${version}/g' ${config.bot.serverPath}/server.properties`);
		console.log(" after: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep motd`).toString());
		out = "[Success] Map: `"+name+"` Version: `"+version+"` created.\nRestart server to play."
	}
	return out;
}

function help(){
	const cmds = `${BOT}> [command]
	├─ help    : usage/command list
	├─ backup  : make backup of current world (admin-only)
	├─ create [name] [version] : create new world (admin-only)
	├─ info    : show server info (IPv4, MC world/version)
	├─ list [target]
	│         ├─ admins  : show server admins
	│         ├─ mods    : show modpack for each version
	│         ├─ worlds  : show current and available worlds
	│         └─ users   : show server members
	├─ restart : restart server
	├─ set [target]
	│         └─ world [name]: set current world
	├─ start   : start server
	├─ status  : show server status, IP address, 
	│ 			     current world and online members
	└─ stop    : stop server`;
	return cmds;
}

function info(config){
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version;
	var world = worldInfo.world;
	world = removeWhitespace(world);
	var info = "IPv4 : "+config.bot.serverIP+"\nWorld : "+world+"\nVersion : "+version;
	return info;
}

function list(config, target){
	var out = "";
	switch (target) {
		case "admins":
			var admins = config.bot.admins;
			admins = Object.keys(admins);
			admins.forEach( element => {
				out = out + "\n  "+emoji.admin+" : " + element; 
			});
			break;
		case "mods":
			out = "Download Here:\n" + config.bot.modsURL;
			break;
		case "worlds":
			var worldInfo = getCurrentWorld(config.bot.serverPath);
			var version = worldInfo.version;
			var current = worldInfo.world;
			current = removeWhitespace(current);
		
			out = "Current World : " + current + "\nVersion : " + version + "\n\n- All Worlds : -------";

			var list = getWorldList(config.bot.serverPath);
			console.log("worlds: "+JSON.stringify(list, null, 4));

			var header = "\nName:".padding(15) + "Version:";
			out = out + header;

			var keys = Object.keys(list);
			keys.forEach( element => {
				if (element != " " && list[element]){ 
					out = out + "\n" + list[element].name.padding(15) + list[element].version; 
				}
			});
			break;
		case "users":

			var is_online = getServerStatus("minecraft");
			if (!is_online){
				return "[Error] No server running.";
			}	

			var members = getMembers(config.bot.serverPath);
			if (members != null){
				members.forEach( element => {
					out = out + "\n  " + emoji.online + " : " + element;
				});
			}
			else {
				out = "\nNone. You's alone " + emoji.sadFace;
			}
			break;
		default:
			break;
	}
	return out;
}

function set(config, target, name){

	var out = "";
	name = name || null;

	switch (target) {
		case "world":
			var worldInfo = getCurrentWorld(config.bot.serverPath);
			var current = worldInfo.world;

			var worlds = getWorldList(config.bot.serverPath);

			if (current == name){
				out = "[Error] current world already set to `" + name + "`." ;
			}
			else if (!checkWorldList(worlds, name)){
				out = "[Error] `"+name+"` not in `maps` directory.";
			}
			else {
				setWorld(config, name);
				out = "World set to `" + name + "`\nStart/restart server to play.";
			}
			break;
		default:
			break;	
	}	
	return out;
}

function start(config, msg){
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version; 
	execSync(`cd ${config.bot.serverPath}; screen -dmS minecraft bash -c 'java -Xmx2G -Xms1G -jar forge-${version}.jar nogui';`);
	msg.channel.send(`[Info] Starting server, please wait...`);
}

function status(config){

	var is_online = getServerStatus("minecraft");
	var serverStatus = (is_online) ? emoji.online : emoji.offline;

	var ip = config.bot.serverIP;
	 
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version;
	var currentWorld = worldInfo.world;
	currentWorld = removeWhitespace(currentWorld);

	out = "Server : "+serverStatus+"\nIPv4 : "+ip+"\nWorld : "+currentWorld+"\nVersion : "+version;
	if (is_online){
		out = out + "\n\nOnline :" + list(config, "users")
	}
	return out;
}

function stop(msg){
	execSync(`screen -S minecraft -p 0 -X stuff "save-all^M"`);
	execSync(`screen -S minecraft -p 0 -X stuff "stop^M"`);
	msg.channel.send(`[Info] Stopping server, please wait...`);
}

// -----------------[ GETTERS ]----------------------------------------------------------------------------------------------------

function getCurrentWorld(serverPath){
	var current = execSync(`cat ${serverPath}/server.properties | grep level-name | awk \'{split($0,a,\"/\"); print a[2] \" \" a[3]}\'`).toString();
	current = current.split(" ");
	console.log("Version: "+removeWhitespace(current[0]));
	console.log("World: "+removeWhitespace(current[1]));
	return {
		version: removeWhitespace(current[0]),
		world: removeWhitespace(current[1])
	};
}

function getDate(){
	let date_ob = new Date();
	let date = ("0" + date_ob.getDate()).slice(-2);
	let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
	let year = date_ob.getFullYear();
	let hours = date_ob.getHours();
	let minutes = date_ob.getMinutes();
	return month + "-" + date + "-" + year + "_" + hours + ":" + minutes;
}

function getMembers(serverPath){

	execSync(`screen -S minecraft -p 0 -X stuff \"list^M\"`);
	var members = null;
	setTimeout(() => {
		try {
			members = execSync(`tail -n 5 ${serverPath}/logs/latest.log | grep -m 1 players`).toString();
			members = members.split(':');
			members = members[4];
		} 
		catch (error){
			members = null;
		}
	}, 200);
	setTimeout(() => {
		if (members.length > 3){
			members = members.split(',');
		}
		else {
			members = null;
		}
		return members;
	}, 300);	
}

function getServerStatus(name){
	switch (name) {
		case "minecraft":
			try {
				var output = execSync(`screen -ls | grep minecraft`).toString();
				return true;
			}
			catch(error){
				return false;
			}
			break;
		default:
			return false;
			break;
	}
}

function getWorldList(serverPath){
	var output = execSync(`ls ${serverPath}/maps`).toString();
	var versions = null;
	var worlds = null;

	if (output){

		output = output.split("\n");
		output.pop();

		output.forEach( element => {
			if (element != ''){
				element = removeWhitespace(element);	
			}
		});

		versions = output;
		worlds = {};

		versions.forEach( element => {
			if (element != ' '){

				output = execSync(`ls ${serverPath}/maps/${element}`).toString();

				if (output){

					output = output.split("\n");
					output.pop();

					output.forEach( element2 => {
						if (element2 != ' '){
							element2 = removeWhitespace(element2);	
							worlds[element2] = {
								name : element2,
								version : element
							};
						}
					});
				}
			}
		})
	}
	return worlds;
}

function getVersion(list, name){
	return list[name].version;
}

// -----------------[ SETTERS ]----------------------------------------------------------------------------------------------------

function setWorld(config, name){
	var list = getWorldList(config.bot.serverPath);
	var version = getVersion(list, name);
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var currentVersion = removeWhitespace(worldInfo.version);
	var currentWorld = removeWhitespace(worldInfo.world);

	console.log("before: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep level-name`).toString());
	execSync(`sed -i "s/level-name=maps\\/.*/level-name=maps\\/${version}\\/${name}/" ${config.bot.serverPath}/server.properties`);
	console.log("after: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep level-name`).toString());
	
	console.log("before: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep motd`).toString());
	execSync(`sed -i 's/${currentWorld}/${name}/g' ${config.bot.serverPath}/server.properties`);
	execSync(`sed -i 's/${currentVersion}/${version}/g' ${config.bot.serverPath}/server.properties`);
	console.log("after: " + execSync(`cat ${config.bot.serverPath}/server.properties | grep motd`).toString());
}

// -----------------[ UTILS ]------------------------------------------------------------------------------------------------------

function isAdmin(admins, userId){
	keys = Object.keys(admins);
	for (let i = 0; i < keys.length; i++){
		if ( admins[keys[i]] == userId ){
			return true;
		}
	}
	return false;
}

function checkWorldList(list, name){
	if (list[name] != null){
		return true;
	}
	return false;
}

function checkVersion(serverPath, version){
	var versions = execSync(`ls ${serverPath}/maps/`).toString()
	versions = versions.split('\n');
	for (let i = 0; i < versions.length; i++){
		versions[i] = removeWhitespace(versions[i]);
		if (versions[i] == version){
			return true;
		}
	}
	return false;
}

String.prototype.padding = function(n, c)
{
        var val = this.valueOf();
        if ( Math.abs(n) <= val.length ) {
                return val;
        }
        var m = Math.max((Math.abs(n) - this.length) || 0, 0);
        var pad = Array(m + 1).join(String(c || ' ').charAt(0));
        return (n < 0) ? pad + val : val + pad;
};

function removeWhitespace(string){
	return string.replace(/((\r\n)+|\r+|\n+|\t+|\s+|(\n\r)+)/gm, "");
}